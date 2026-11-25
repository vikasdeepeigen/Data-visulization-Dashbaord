const mongoose = require('mongoose');
const Software = require('../models/Software');
const DataRecord = require('../models/DataRecord');
const ExcelUpload = require('../models/ExcelUpload');
const ActivityLog = require('../models/ActivityLog');
const { getAccessibleSoftwareIds, hasSoftwarePermission } = require('../middleware/auth');
const { logActivity } = require('../utils/activityLogger');

// @desc    Get accessible software tools (all for Admin, assigned only for User)
// @route   GET /api/software
// @access  Private
const getAllSoftware = async (req, res) => {
  try {
    const includeInactive = req.query.includeInactive === 'true' && req.user.role === 'Admin';
    const filter = {};
    if (!includeInactive) {
      filter.isActive = true;
    }

    const accessibleIds = getAccessibleSoftwareIds(req.user);
    if (accessibleIds !== null) {
      filter._id = { $in: accessibleIds };
    }

    const software = await Software.find(filter).sort({ order: 1, name: 1 });

    return res.status(200).json({
      success: true,
      count: software.length,
      software,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to load software list.',
      error: error.message,
    });
  }
};

// @desc    Get single software configuration by ID
// @route   GET /api/software/:id
// @access  Private
const getSoftwareById = async (req, res) => {
  try {
    const software = await Software.findById(req.params.id);
    if (!software) {
      return res.status(404).json({
        success: false,
        message: 'Software not found.',
      });
    }

    if (!hasSoftwarePermission(req.user, software._id)) {
      return res.status(403).json({
        success: false,
        message: `Access denied: You do not have permission to access ${software.name}.`,
      });
    }

    return res.status(200).json({
      success: true,
      software,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve software details.',
      error: error.message,
    });
  }
};

// @desc    Dedicated single-software dashboard & analytics endpoint
// @route   GET /api/software/:id/dashboard
// @access  Private
const getSoftwareDashboard = async (req, res) => {
  try {
    const software = await Software.findById(req.params.id);
    if (!software) {
      return res.status(404).json({
        success: false,
        message: 'Software not found.',
      });
    }

    if (!hasSoftwarePermission(req.user, software._id)) {
      return res.status(403).json({
        success: false,
        message: `Access denied: You do not have permission to view ${software.name}.`,
      });
    }

    const { startDate, endDate, dataType, search } = req.query;
    const recordFilter = { software: new mongoose.Types.ObjectId(software._id) };

    if (dataType && dataType !== 'all') {
      recordFilter.dataType = dataType;
    }

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      recordFilter.$or = [{ datasetName: regex }, { location: regex }, { notes: regex }];
    }

    if (startDate || endDate) {
      recordFilter.entryDate = {};
      if (startDate) {
        recordFilter.entryDate.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        recordFilter.entryDate.$lte = end;
      }
    }

    const records = await DataRecord.find(recordFilter).sort({ entryDate: -1, createdAt: -1 });

    // Compute exact KPIs from actual MongoDB records
    let totalData = 0;
    let completed = 0;
    let processing = 0;
    let pending = 0;
    const distinctDatasets = new Set();

    const dataTypeMap = {};
    const timelineMap = {};
    const metricStatsMap = {};

    for (const field of software.metricFields || []) {
      if (field.type === 'number' || field.type === 'percentage') {
        metricStatsMap[field.key] = {
          key: field.key,
          label: field.label,
          unit: field.unit || '',
          type: field.type,
          sum: 0,
          count: 0,
          avg: 0,
          max: null,
        };
      }
    }

    for (const rec of records) {
      totalData += rec.totalData || 0;
      completed += rec.completed || 0;
      processing += rec.processing || 0;
      pending += rec.pending || 0;
      if (rec.datasetName) distinctDatasets.add(rec.datasetName);

      // By data type breakdown
      const dt = rec.dataType || 'Unspecified';
      if (!dataTypeMap[dt]) {
        dataTypeMap[dt] = { dataType: dt, totalData: 0, completed: 0, processing: 0, pending: 0, records: 0 };
      }
      dataTypeMap[dt].totalData += rec.totalData || 0;
      dataTypeMap[dt].completed += rec.completed || 0;
      dataTypeMap[dt].processing += rec.processing || 0;
      dataTypeMap[dt].pending += rec.pending || 0;
      dataTypeMap[dt].records += 1;

      // Timeline by date (YYYY-MM-DD)
      const dayKey = new Date(rec.entryDate).toISOString().slice(0, 10);
      if (!timelineMap[dayKey]) {
        timelineMap[dayKey] = { date: dayKey, totalData: 0, completed: 0, processing: 0, pending: 0 };
      }
      timelineMap[dayKey].totalData += rec.totalData || 0;
      timelineMap[dayKey].completed += rec.completed || 0;
      timelineMap[dayKey].processing += rec.processing || 0;
      timelineMap[dayKey].pending += rec.pending || 0;

      // Dynamic metric aggregation
      if (rec.metrics && typeof rec.metrics === 'object') {
        for (const [k, stat] of Object.entries(metricStatsMap)) {
          const val = Number(rec.metrics[k]);
          if (rec.metrics[k] !== '' && rec.metrics[k] !== undefined && rec.metrics[k] !== null && !Number.isNaN(val)) {
            stat.sum += val;
            stat.count += 1;
            stat.max = stat.max === null ? val : Math.max(stat.max, val);
          }
        }
      }
    }

    const metricSummaries = Object.values(metricStatsMap).map((m) => ({
      ...m,
      avg: m.count > 0 ? Number((m.sum / m.count).toFixed(2)) : 0,
      sum: Number(m.sum.toFixed(2)),
    }));

    const completionPercentage =
      totalData > 0 ? Number(((completed / totalData) * 100).toFixed(1)) : 0;

    const dataTypeBreakdown = Object.values(dataTypeMap).map((d) => ({
      ...d,
      completionPercentage:
        d.totalData > 0 ? Number(((d.completed / d.totalData) * 100).toFixed(1)) : 0,
    }));

    const timeline = Object.values(timelineMap).sort((a, b) => a.date.localeCompare(b.date));

    // Fetch Excel files associated with this software
    const excelUploads = await ExcelUpload.find({ software: software._id })
      .select('-sheets.rows')
      .sort({ createdAt: -1 });

    // Fetch recent activity logs relevant to this software
    const activityLogs = await ActivityLog.find({ software: software._id })
      .sort({ createdAt: -1 })
      .limit(20);

    return res.status(200).json({
      success: true,
      software,
      kpis: {
        totalRecords: records.length,
        totalDatasets: distinctDatasets.size,
        totalData,
        completed,
        processing,
        pending,
        completionPercentage,
      },
      dataTypeBreakdown,
      timeline,
      metricSummaries,
      records,
      excelUploads,
      activityLogs,
    });
  } catch (error) {
    console.error('[SoftwareController] Software dashboard error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to compute software dashboard data.',
      error: error.message,
    });
  }
};

// @desc    Admin creates a new software definition
// @route   POST /api/software
// @access  Private / Admin
const createSoftware = async (req, res) => {
  try {
    const {
      name,
      code,
      description = '',
      dataTypes = [],
      metricFields = [],
      supportsExcelClasses = true,
      requiresTxtExport = true,
      isActive = true,
      syncConfig = { mode: 'manual', endpointUrl: '' },
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Software name is required.',
      });
    }

    const normalizedDataTypes = Array.isArray(dataTypes)
      ? dataTypes.map((dt) => String(dt).trim()).filter(Boolean)
      : typeof dataTypes === 'string'
        ? dataTypes
            .split(',')
            .map((dt) => dt.trim())
            .filter(Boolean)
        : [];

    if (normalizedDataTypes.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one data type is required.',
      });
    }

    let normalizedCode = (code || name)
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
    if (!normalizedCode) {
      normalizedCode = `SW_${Date.now()}`;
    }

    const existingName = await Software.findOne({ name: name.trim() });
    if (existingName) {
      return res.status(400).json({
        success: false,
        message: 'Software with this name already exists.',
      });
    }

    const existingCode = await Software.findOne({ code: normalizedCode });
    if (existingCode) {
      normalizedCode = `${normalizedCode}_${Date.now().toString().slice(-4)}`;
    }

    const totalCount = await Software.countDocuments();

    const software = await Software.create({
      name: name.trim(),
      code: normalizedCode,
      description: description.trim(),
      dataTypes: normalizedDataTypes,
      metricFields: Array.isArray(metricFields) ? metricFields : [],
      supportsExcelClasses: Boolean(supportsExcelClasses),
      requiresTxtExport: Boolean(requiresTxtExport),
      isActive: Boolean(isActive),
      order: totalCount + 1,
      syncConfig,
    });

    await logActivity({
      category: 'SOFTWARE',
      action: 'SOFTWARE_CREATE',
      description: `Added new software: ${software.name} (${software.code}) with ${software.metricFields.length} configured metrics`,
      software: software._id,
      softwareName: software.name,
      user: req.user,
      metadata: { code: software.code, dataTypes: software.dataTypes },
    });

    return res.status(201).json({
      success: true,
      message: 'Software added successfully.',
      software,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to create software.',
      error: error.message,
    });
  }
};

// @desc    Admin updates a software configuration, data types, or dynamic metric fields
// @route   PUT /api/software/:id
// @access  Private / Admin
const updateSoftware = async (req, res) => {
  try {
    const software = await Software.findById(req.params.id);
    if (!software) {
      return res.status(404).json({
        success: false,
        message: 'Software not found.',
      });
    }

    const {
      name,
      code,
      description,
      dataTypes,
      metricFields,
      supportsExcelClasses,
      requiresTxtExport,
      isActive,
      syncConfig,
    } = req.body;

    const oldName = software.name;
    const oldCode = software.code;

    if (name && name.trim() !== software.name) {
      const dupName = await Software.findOne({ name: name.trim(), _id: { $ne: software._id } });
      if (dupName) {
        return res.status(400).json({ success: false, message: 'Software name already in use.' });
      }
      software.name = name.trim();
    }

    if (code) {
      const normalizedCode = code.trim().toUpperCase().replace(/\s+/g, '_');
      if (normalizedCode !== software.code) {
        const dupCode = await Software.findOne({ code: normalizedCode, _id: { $ne: software._id } });
        if (dupCode) {
          return res.status(400).json({ success: false, message: 'Unique software code already in use.' });
        }
        software.code = normalizedCode;
      }
    }

    if (description !== undefined) software.description = description.trim();
    if (Array.isArray(dataTypes) && dataTypes.length > 0) {
      software.dataTypes = dataTypes.map((dt) => dt.trim()).filter(Boolean);
    }
    if (Array.isArray(metricFields)) {
      software.metricFields = metricFields.map((f, index) => ({
        key: String(f.key).trim(),
        label: String(f.label).trim(),
        type: f.type || 'number',
        unit: f.unit ? String(f.unit).trim() : '',
        required: Boolean(f.required),
        options: Array.isArray(f.options) ? f.options.map((o) => String(o).trim()).filter(Boolean) : [],
        placeholder: f.placeholder ? String(f.placeholder).trim() : '',
        order: f.order !== undefined ? Number(f.order) : index + 1,
      }));
    }
    if (typeof supportsExcelClasses === 'boolean') software.supportsExcelClasses = supportsExcelClasses;
    if (typeof requiresTxtExport === 'boolean') software.requiresTxtExport = requiresTxtExport;
    if (typeof isActive === 'boolean') software.isActive = isActive;
    if (syncConfig && typeof syncConfig === 'object') {
      software.syncConfig = {
        ...software.syncConfig,
        ...syncConfig,
      };
    }

    await software.save();

    // Propagate updated software name/code to existing DataRecords & ExcelUploads
    if (oldName !== software.name || oldCode !== software.code) {
      await DataRecord.updateMany(
        { software: software._id },
        { $set: { softwareName: software.name, softwareCode: software.code } }
      );
      await ExcelUpload.updateMany(
        { software: software._id },
        { $set: { softwareName: software.name } }
      );
    }

    await logActivity({
      category: 'SOFTWARE',
      action: 'SOFTWARE_UPDATE',
      description: `Updated configuration for ${software.name} (${software.code}) — Data Types: ${software.dataTypes.length}, Metrics: ${software.metricFields.length}`,
      software: software._id,
      softwareName: software.name,
      user: req.user,
      metadata: {
        dataTypes: software.dataTypes,
        metricFieldKeys: software.metricFields.map((m) => m.key),
        isActive: software.isActive,
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Software configuration updated successfully.',
      software,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update software configuration.',
      error: error.message,
    });
  }
};

// @desc    Admin deletes a software (only if no records exist, or deactivates)
// @route   DELETE /api/software/:id
// @access  Private / Admin
const deleteSoftware = async (req, res) => {
  try {
    const software = await Software.findById(req.params.id);
    if (!software) {
      return res.status(404).json({ success: false, message: 'Software not found.' });
    }

    const recordCount = await DataRecord.countDocuments({ software: software._id });
    if (recordCount > 0 && req.query.force !== 'true') {
      software.isActive = false;
      await software.save();

      await logActivity({
        category: 'SOFTWARE',
        action: 'SOFTWARE_DEACTIVATE',
        description: `Deactivated software ${software.name} (${recordCount} historical data records preserved)`,
        software: software._id,
        softwareName: software.name,
        user: req.user,
      });

      return res.status(200).json({
        success: true,
        message: `Software deactivated (has ${recordCount} existing records preserved).`,
        software,
      });
    }

    await software.deleteOne();

    await logActivity({
      category: 'SOFTWARE',
      action: 'SOFTWARE_DELETE',
      description: `Deleted software ${software.name} (${software.code})`,
      user: req.user,
    });

    return res.status(200).json({
      success: true,
      message: 'Software deleted successfully.',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to delete software.',
      error: error.message,
    });
  }
};

module.exports = {
  getAllSoftware,
  getSoftwareById,
  getSoftwareDashboard,
  createSoftware,
  updateSoftware,
  deleteSoftware,
};
