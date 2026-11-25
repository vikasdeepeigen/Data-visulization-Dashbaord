const Software = require('../models/Software');
const DataRecord = require('../models/DataRecord');
const { logActivity } = require('../utils/activityLogger');

// @desc    Future-ready API integration endpoint for automatic data synchronization
//          from external annotation/processing pipelines (SAM-2, HD-SAM, Remote Server, etc.)
// @route   POST /api/sync/:softwareCode
// @access  Private (Admin or Sync Key)
const syncExternalData = async (req, res) => {
  try {
    const code = req.params.softwareCode.toUpperCase();
    const software = await Software.findOne({ code, isActive: true });

    if (!software) {
      return res.status(404).json({
        success: false,
        message: `Software with code '${code}' not found or inactive.`,
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
      metrics = {},
      entryDate,
      notes = 'Synchronized via API integration',
    } = req.body;

    if (!dataType || !datasetName || !location) {
      return res.status(400).json({
        success: false,
        message: 'dataType, datasetName, and location are required for sync.',
      });
    }

    const record = await DataRecord.create({
      software: software._id,
      softwareName: software.name,
      softwareCode: software.code,
      dataType,
      datasetName,
      location,
      totalData: Number(totalData) || 0,
      completed: Number(completed) || 0,
      processing: Number(processing) || 0,
      pending: Number(pending) || 0,
      metrics,
      entryDate: entryDate ? new Date(entryDate) : new Date(),
      notes,
      sourceType: 'api_sync',
      createdBy: req.user._id,
      createdByName: req.user.fullName,
      createdByEmail: req.user.email,
    });

    software.syncConfig.lastSyncedAt = new Date();
    await software.save();

    await logActivity({
      category: 'SYSTEM',
      action: 'API_SYNC',
      description: `Automated API sync ingested dataset '${datasetName}' for ${software.name}`,
      software: software._id,
      softwareName: software.name,
      user: req.user,
      metadata: { recordId: record._id, sourceType: 'api_sync' },
    });

    return res.status(201).json({
      success: true,
      message: `Synchronized record for ${software.name}.`,
      record,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to synchronize external software data.',
      error: error.message,
    });
  }
};

module.exports = { syncExternalData };
