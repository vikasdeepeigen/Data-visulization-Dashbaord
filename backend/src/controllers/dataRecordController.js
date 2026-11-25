const DataRecord = require('../models/DataRecord');
const Software = require('../models/Software');
const { getAccessibleSoftwareIds, hasSoftwarePermission } = require('../middleware/auth');
const { logActivity } = require('../utils/activityLogger');

// @desc    Get data entry records scoped to user permissions
// @route   GET /api/records
// @access  Private
const getDataRecords = async (req, res) => {
  try {
    const { softwareId, dataType, location, search, startDate, endDate, limit = 100 } = req.query;
    const filter = {};

    const accessibleIds = getAccessibleSoftwareIds(req.user);
    if (accessibleIds !== null) {
      if (softwareId) {
        if (!accessibleIds.includes(softwareId)) {
          return res.status(403).json({
            success: false,
            message: 'Access denied to records for this software.',
          });
        }
        filter.software = softwareId;
      } else {
        filter.software = { $in: accessibleIds };
      }
    } else if (softwareId && softwareId !== 'all') {
      filter.software = softwareId;
    }

    if (dataType && dataType !== 'all') {
      filter.dataType = dataType;
    }

    if (location && location.trim()) {
      filter.location = new RegExp(location.trim(), 'i');
    }

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { datasetName: regex },
        { location: regex },
        { softwareName: regex },
        { dataType: regex },
        { createdByName: regex },
      ];
    }

    if (startDate || endDate) {
      filter.entryDate = {};
      if (startDate) filter.entryDate.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.entryDate.$lte = end;
      }
    }

    const records = await DataRecord.find(filter)
      .sort({ entryDate: -1, createdAt: -1 })
      .limit(Math.min(Number(limit) || 100, 500));

    return res.status(200).json({
      success: true,
      count: records.length,
      records,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve data records.',
      error: error.message,
    });
  }
};

// @desc    Create a new data entry record for a selected software
// @route   POST /api/records
// @access  Private
const createDataRecord = async (req, res) => {
  try {
    const {
      softwareId,
      dataType,
      datasetName,
      location,
      totalData,
      completed,
      processing,
      pending,
      metrics = {},
      entryDate,
      notes = '',
    } = req.body;

    if (!softwareId || !dataType || !datasetName || !location) {
      return res.status(400).json({
        success: false,
        message: 'Software, Data Type, Dataset Name/ID, and Location are required.',
      });
    }

    const software = await Software.findById(softwareId);
    if (!software || !software.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Selected software was not found or is inactive.',
      });
    }

    if (!hasSoftwarePermission(req.user, software._id)) {
      return res.status(403).json({
        success: false,
        message: `Access denied: You do not have permission to enter data for ${software.name}.`,
      });
    }

    const numTotal = Number(totalData);
    const numCompleted = Number(completed);
    const numProcessing = Number(processing);
    const numPending = Number(pending);

    if (
      [numTotal, numCompleted, numProcessing, numPending].some(
        (n) => Number.isNaN(n) || n < 0
      )
    ) {
      return res.status(400).json({
        success: false,
        message: 'Total Data, Completed, Processing, and Pending must be non-negative numbers.',
      });
    }

    if (numCompleted + numProcessing + numPending > numTotal) {
      return res.status(400).json({
        success: false,
        message: `Completed (${numCompleted}) + Processing (${numProcessing}) + Pending (${numPending}) cannot exceed Total Data (${numTotal}).`,
      });
    }

    // Validate required software-specific dynamic metrics
    const cleanMetrics = {};
    for (const field of software.metricFields || []) {
      const val = metrics ? metrics[field.key] : undefined;
      if (field.required && (val === undefined || val === null || val === '')) {
        return res.status(400).json({
          success: false,
          message: `Metric '${field.label}' is required for ${software.name}.`,
        });
      }
      if (val !== undefined && val !== null && val !== '') {
        if (field.type === 'number' || field.type === 'percentage') {
          const parsed = Number(val);
          if (Number.isNaN(parsed)) {
            return res.status(400).json({
              success: false,
              message: `Metric '${field.label}' must be a valid number.`,
            });
          }
          cleanMetrics[field.key] = parsed;
        } else if (field.type === 'boolean') {
          cleanMetrics[field.key] = Boolean(val === true || val === 'true');
        } else {
          cleanMetrics[field.key] = String(val).trim();
        }
      }
    }

    const record = await DataRecord.create({
      software: software._id,
      softwareName: software.name,
      softwareCode: software.code,
      dataType: dataType.trim(),
      datasetName: datasetName.trim(),
      location: location.trim(),
      totalData: numTotal,
      completed: numCompleted,
      processing: numProcessing,
      pending: numPending,
      metrics: cleanMetrics,
      entryDate: entryDate ? new Date(entryDate) : new Date(),
      notes: notes ? notes.trim() : '',
      sourceType: 'manual',
      createdBy: req.user._id,
      createdByName: req.user.fullName,
      createdByEmail: req.user.email,
    });

    await logActivity({
      category: 'DATA_ENTRY',
      action: 'DATA_RECORD_CREATE',
      description: `Added record for ${software.name} (${dataType}) — Dataset: ${record.datasetName}, Location: ${record.location}, Total: ${numTotal}, Completed: ${numCompleted}`,
      software: software._id,
      softwareName: software.name,
      user: req.user,
      metadata: {
        recordId: record._id,
        datasetName: record.datasetName,
        location: record.location,
        totalData: numTotal,
        completed: numCompleted,
      },
    });

    return res.status(201).json({
      success: true,
      message: `Data entry saved for ${software.name}.`,
      record,
    });
  } catch (error) {
    console.error('[DataRecordController] Create error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to save data entry record.',
      error: error.message,
    });
  }
};

// @desc    Update an existing data record
// @route   PUT /api/records/:id
// @access  Private
const updateDataRecord = async (req, res) => {
  try {
    const record = await DataRecord.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Data record not found.' });
    }

    if (!hasSoftwarePermission(req.user, record.software)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You do not have permission for this software.',
      });
    }

    const {
      dataType,
      datasetName,
      location,
      totalData,
      completed,
      processing,
      pending,
      metrics,
      entryDate,
      notes,
    } = req.body;

    const numTotal = totalData !== undefined ? Number(totalData) : record.totalData;
    const numCompleted = completed !== undefined ? Number(completed) : record.completed;
    const numProcessing = processing !== undefined ? Number(processing) : record.processing;
    const numPending = pending !== undefined ? Number(pending) : record.pending;

    if (
      [numTotal, numCompleted, numProcessing, numPending].some(
        (n) => Number.isNaN(n) || n < 0
      )
    ) {
      return res.status(400).json({
        success: false,
        message: 'Counts must be non-negative numbers.',
      });
    }

    if (numCompleted + numProcessing + numPending > numTotal) {
      return res.status(400).json({
        success: false,
        message: 'Completed + Processing + Pending cannot exceed Total Data.',
      });
    }

    if (dataType) record.dataType = dataType.trim();
    if (datasetName) record.datasetName = datasetName.trim();
    if (location) record.location = location.trim();
    record.totalData = numTotal;
    record.completed = numCompleted;
    record.processing = numProcessing;
    record.pending = numPending;
    if (metrics && typeof metrics === 'object') {
      record.metrics = { ...record.metrics, ...metrics };
    }
    if (entryDate) record.entryDate = new Date(entryDate);
    if (notes !== undefined) record.notes = notes.trim();
    record.updatedBy = req.user._id;
    record.updatedByName = req.user.fullName;

    await record.save();

    await logActivity({
      category: 'DATA_ENTRY',
      action: 'DATA_RECORD_UPDATE',
      description: `Updated record for ${record.softwareName} — Dataset: ${record.datasetName}, Completed: ${record.completed}/${record.totalData}`,
      software: record.software,
      softwareName: record.softwareName,
      user: req.user,
      metadata: { recordId: record._id, datasetName: record.datasetName },
    });

    return res.status(200).json({
      success: true,
      message: 'Data record updated successfully.',
      record,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update data record.',
      error: error.message,
    });
  }
};

// @desc    Delete a data record
// @route   DELETE /api/records/:id
// @access  Private
const deleteDataRecord = async (req, res) => {
  try {
    const record = await DataRecord.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Data record not found.' });
    }

    if (!hasSoftwarePermission(req.user, record.software)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to delete records for this software.',
      });
    }

    await record.deleteOne();

    await logActivity({
      category: 'DATA_ENTRY',
      action: 'DATA_RECORD_DELETE',
      description: `Deleted record for ${record.softwareName} — Dataset: ${record.datasetName} (${record.location})`,
      software: record.software,
      softwareName: record.softwareName,
      user: req.user,
      metadata: { datasetName: record.datasetName },
    });

    return res.status(200).json({
      success: true,
      message: 'Data record deleted successfully.',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to delete data record.',
      error: error.message,
    });
  }
};

module.exports = {
  getDataRecords,
  createDataRecord,
  updateDataRecord,
  deleteDataRecord,
};
