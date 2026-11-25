const fs = require('fs');
const path = require('path');
const ExcelUpload = require('../models/ExcelUpload');
const Software = require('../models/Software');
const { parseExcelBuffer, extractClassesFromSheet } = require('../utils/excelParser');
const { getAccessibleSoftwareIds, hasSoftwarePermission } = require('../middleware/auth');
const { logActivity } = require('../utils/activityLogger');

const UPLOAD_DIR = path.join(__dirname, '../../uploads/excel');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// @desc    Parse & preview Excel file structure without saving yet
// @route   POST /api/excel/preview
// @access  Private / Admin
const previewExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please attach an Excel file (.xlsx, .xls, or .csv).',
      });
    }

    const parsed = parseExcelBuffer(req.file.buffer);
    const selectedSheet =
      parsed.sheets.find((s) => s.sheetName === parsed.defaultSheetName) || parsed.sheets[0];

    const preserveDuplicates = req.body.preserveDuplicates === 'true';
    const includeHeader = req.body.includeHeader === 'true';

    const extractedClasses = selectedSheet
      ? extractClassesFromSheet(
          selectedSheet,
          parsed.defaultClassColIdx,
          preserveDuplicates,
          includeHeader
        )
      : [];

    return res.status(200).json({
      success: true,
      preview: {
        originalFileName: req.file.originalname,
        fileSize: req.file.size,
        sheets: parsed.sheets,
        totalRows: parsed.totalRows,
        defaultSheetName: parsed.defaultSheetName,
        defaultClassColIdx: parsed.defaultClassColIdx,
        extractedClasses,
      },
    });
  } catch (error) {
    console.error('[ExcelController] Preview error:', error);
    return res.status(400).json({
      success: false,
      message: 'Failed to parse Excel file. Ensure it is a valid spreadsheet.',
      error: error.message,
    });
  }
};

// @desc    Upload, extract exact Excel structure, preserve original file & save to MongoDB
// @route   POST /api/excel/upload
// @access  Private / Admin
const uploadAndSaveExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Excel file is required.',
      });
    }

    const {
      softwareId,
      selectedSheet: bodySheet,
      selectedClassColumn: bodyColIdx,
      preserveDuplicates: bodyDup,
      includeHeader: bodyIncHeader,
      notes = '',
    } = req.body;

    let linkedSoftware = null;
    if (softwareId && softwareId !== 'none' && softwareId !== '') {
      linkedSoftware = await Software.findById(softwareId);
      if (!linkedSoftware) {
        return res.status(404).json({
          success: false,
          message: 'Linked software not found.',
        });
      }
    }

    const parsed = parseExcelBuffer(req.file.buffer);
    const targetSheetName = bodySheet || parsed.defaultSheetName;
    const targetSheet =
      parsed.sheets.find((s) => s.sheetName === targetSheetName) || parsed.sheets[0];

    const colIdx =
      bodyColIdx !== undefined && bodyColIdx !== ''
        ? Number(bodyColIdx)
        : parsed.defaultClassColIdx;
    const preserveDuplicates = bodyDup === 'true' || bodyDup === true;
    const includeHeader = bodyIncHeader === 'true' || bodyIncHeader === true;

    const extractedClasses = targetSheet
      ? extractClassesFromSheet(targetSheet, colIdx, preserveDuplicates, includeHeader)
      : [];

    const colName =
      targetSheet && targetSheet.headers[colIdx] !== undefined
        ? targetSheet.headers[colIdx]
        : `Column ${colIdx + 1}`;

    // Save exact unmodified original file to disk
    const safeFileName = req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storedFileName = `${Date.now()}_${safeFileName}`;
    const filePath = path.join(UPLOAD_DIR, storedFileName);
    fs.writeFileSync(filePath, req.file.buffer);

    const record = await ExcelUpload.create({
      originalFileName: req.file.originalname,
      storedFileName,
      filePath,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      software: linkedSoftware ? linkedSoftware._id : null,
      softwareName: linkedSoftware ? linkedSoftware.name : 'General / Unassigned',
      sheets: parsed.sheets,
      selectedSheet: targetSheet ? targetSheet.sheetName : '',
      selectedClassColumn: colIdx,
      selectedClassColumnName: colName,
      preserveDuplicates,
      extractedClasses,
      totalRows: parsed.totalRows,
      notes: notes.trim(),
      uploadedBy: req.user._id,
      uploadedByName: req.user.fullName,
      uploadedByEmail: req.user.email,
    });

    await logActivity({
      category: 'EXCEL',
      action: 'EXCEL_UPLOAD',
      description: `Uploaded Excel file '${record.originalFileName}' (${parsed.sheets.length} sheet(s), ${parsed.totalRows} rows, ${extractedClasses.length} classes extracted) for ${record.softwareName}`,
      software: linkedSoftware ? linkedSoftware._id : null,
      softwareName: record.softwareName,
      user: req.user,
      metadata: {
        excelId: record._id,
        fileName: record.originalFileName,
        sheetsCount: parsed.sheets.length,
        classesCount: extractedClasses.length,
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Excel file parsed and saved successfully.',
      excelUpload: record,
    });
  } catch (error) {
    console.error('[ExcelController] Upload error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to save Excel file.',
      error: error.message,
    });
  }
};

// @desc    Get Excel upload history scoped by user permissions
// @route   GET /api/excel
// @access  Private
const getExcelHistory = async (req, res) => {
  try {
    const { softwareId } = req.query;
    const filter = {};
    const accessibleIds = getAccessibleSoftwareIds(req.user);

    if (accessibleIds !== null) {
      if (softwareId && softwareId !== 'all') {
        if (!accessibleIds.includes(softwareId)) {
          return res.status(403).json({
            success: false,
            message: 'Access denied to Excel files for this software.',
          });
        }
        filter.software = softwareId;
      } else {
        filter.$or = [{ software: { $in: accessibleIds } }, { software: null }];
      }
    } else if (softwareId && softwareId !== 'all') {
      filter.software = softwareId;
    }

    const uploads = await ExcelUpload.find(filter)
      .select('-sheets.rows')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: uploads.length,
      uploads,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve Excel upload history.',
      error: error.message,
    });
  }
};

// @desc    Get single Excel upload with complete sheets, columns, rows, and classes
// @route   GET /api/excel/:id
// @access  Private
const getExcelById = async (req, res) => {
  try {
    const upload = await ExcelUpload.findById(req.params.id);
    if (!upload) {
      return res.status(404).json({ success: false, message: 'Excel record not found.' });
    }

    if (upload.software && !hasSoftwarePermission(req.user, upload.software)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this Excel file.',
      });
    }

    return res.status(200).json({
      success: true,
      excelUpload: upload,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to load Excel details.',
      error: error.message,
    });
  }
};

// @desc    Update class extraction settings (sheet/column/duplicates) preserving original values
// @route   PUT /api/excel/:id/classes
// @access  Private / Admin
const updateExcelClassSelection = async (req, res) => {
  try {
    const { selectedSheet, selectedClassColumn, preserveDuplicates = false, includeHeader = false } =
      req.body;

    const upload = await ExcelUpload.findById(req.params.id);
    if (!upload) {
      return res.status(404).json({ success: false, message: 'Excel record not found.' });
    }

    const sheet =
      upload.sheets.find((s) => s.sheetName === selectedSheet) || upload.sheets[0];
    if (!sheet) {
      return res.status(400).json({ success: false, message: 'Selected sheet not found.' });
    }

    const colIdx = Number(selectedClassColumn) || 0;
    const extractedClasses = extractClassesFromSheet(
      sheet,
      colIdx,
      Boolean(preserveDuplicates),
      Boolean(includeHeader)
    );

    upload.selectedSheet = sheet.sheetName;
    upload.selectedClassColumn = colIdx;
    upload.selectedClassColumnName =
      sheet.headers[colIdx] !== undefined ? sheet.headers[colIdx] : `Column ${colIdx + 1}`;
    upload.preserveDuplicates = Boolean(preserveDuplicates);
    upload.extractedClasses = extractedClasses;

    await upload.save();

    await logActivity({
      category: 'EXCEL',
      action: 'EXCEL_CLASS_UPDATE',
      description: `Updated class column selection for '${upload.originalFileName}' (Sheet: ${upload.selectedSheet}, Column: ${upload.selectedClassColumnName}, ${extractedClasses.length} classes)`,
      software: upload.software,
      softwareName: upload.softwareName,
      user: req.user,
    });

    return res.status(200).json({
      success: true,
      message: 'Class extraction updated.',
      excelUpload: upload,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update class extraction.',
      error: error.message,
    });
  }
};

// @desc    Download exact original uploaded Excel file
// @route   GET /api/excel/:id/download
// @access  Private
const downloadOriginalExcel = async (req, res) => {
  try {
    const upload = await ExcelUpload.findById(req.params.id);
    if (!upload) {
      return res.status(404).json({ success: false, message: 'Excel record not found.' });
    }

    if (upload.software && !hasSoftwarePermission(req.user, upload.software)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to download this Excel file.',
      });
    }

    if (!fs.existsSync(upload.filePath)) {
      return res.status(404).json({
        success: false,
        message: 'Original Excel file not found on disk.',
      });
    }

    return res.download(upload.filePath, upload.originalFileName);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to download original Excel file.',
      error: error.message,
    });
  }
};

// @desc    Generate and download TXT file with one class per line preserving exact names and order
// @route   GET /api/excel/:id/txt
// @access  Private
const downloadClassesTxt = async (req, res) => {
  try {
    const upload = await ExcelUpload.findById(req.params.id);
    if (!upload) {
      return res.status(404).json({ success: false, message: 'Excel record not found.' });
    }

    if (upload.software && !hasSoftwarePermission(req.user, upload.software)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to export TXT for this Excel file.',
      });
    }

    // Allow optional override via query parameters without modifying stored record
    let classes = upload.extractedClasses || [];
    if (req.query.sheetName || req.query.colIdx !== undefined) {
      const sheet =
        upload.sheets.find((s) => s.sheetName === req.query.sheetName) || upload.sheets[0];
      if (sheet) {
        const colIdx =
          req.query.colIdx !== undefined ? Number(req.query.colIdx) : upload.selectedClassColumn;
        const preserveDuplicates = req.query.preserveDuplicates === 'true';
        const includeHeader = req.query.includeHeader === 'true';
        classes = extractClassesFromSheet(sheet, colIdx, preserveDuplicates, includeHeader);
      }
    }

    const txtContent = classes.join('\n');
    const baseName = path.parse(upload.originalFileName).name;
    const downloadFileName = `${baseName}_classes.txt`;

    await logActivity({
      category: 'EXCEL',
      action: 'EXCEL_TXT_EXPORT',
      description: `Generated TXT class file '${downloadFileName}' (${classes.length} classes, one per line) from '${upload.originalFileName}'`,
      software: upload.software,
      softwareName: upload.softwareName,
      user: req.user,
    });

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${downloadFileName}"`);
    return res.status(200).send(txtContent);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to generate classes TXT file.',
      error: error.message,
    });
  }
};

// @desc    Delete an Excel upload record
// @route   DELETE /api/excel/:id
// @access  Private / Admin
const deleteExcelUpload = async (req, res) => {
  try {
    const upload = await ExcelUpload.findById(req.params.id);
    if (!upload) {
      return res.status(404).json({ success: false, message: 'Excel record not found.' });
    }

    if (upload.filePath && fs.existsSync(upload.filePath)) {
      fs.unlinkSync(upload.filePath);
    }

    await upload.deleteOne();

    await logActivity({
      category: 'EXCEL',
      action: 'EXCEL_DELETE',
      description: `Deleted Excel upload '${upload.originalFileName}'`,
      software: upload.software,
      softwareName: upload.softwareName,
      user: req.user,
    });

    return res.status(200).json({
      success: true,
      message: 'Excel record deleted successfully.',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to delete Excel record.',
      error: error.message,
    });
  }
};

module.exports = {
  previewExcel,
  uploadAndSaveExcel,
  getExcelHistory,
  getExcelById,
  updateExcelClassSelection,
  downloadOriginalExcel,
  downloadClassesTxt,
  deleteExcelUpload,
};
