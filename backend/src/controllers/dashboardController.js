const mongoose = require('mongoose');
const Software = require('../models/Software');
const DataRecord = require('../models/DataRecord');
const ExcelUpload = require('../models/ExcelUpload');
const ActivityLog = require('../models/ActivityLog');
const { getAccessibleSoftwareIds } = require('../middleware/auth');

// @desc    Overall summary dashboard using live MongoDB aggregations scoped to accessible software
// @route   GET /api/dashboard/summary
// @access  Private
const getOverallDashboard = async (req, res) => {
  try {
    const { startDate, endDate, dataType, search } = req.query;

    const softwareFilter = { isActive: true };
    const accessibleIds = getAccessibleSoftwareIds(req.user);
    if (accessibleIds !== null) {
      softwareFilter._id = { $in: accessibleIds.map((id) => new mongoose.Types.ObjectId(id)) };
    }

    const softwareList = await Software.find(softwareFilter).sort({ order: 1, name: 1 });
    const accessibleObjectIds = softwareList.map((s) => s._id);

    const recordFilter = {
      software: { $in: accessibleObjectIds },
    };

    if (dataType && dataType !== 'all') {
      recordFilter.dataType = dataType;
    }

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      recordFilter.$or = [
        { softwareName: regex },
        { datasetName: regex },
        { location: regex },
        { dataType: regex },
      ];
    }

    if (startDate || endDate) {
      recordFilter.entryDate = {};
      if (startDate) recordFilter.entryDate.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        recordFilter.entryDate.$lte = end;
      }
    }

    const records = await DataRecord.find(recordFilter).sort({ entryDate: -1 });

    // Initialize software-wise comparison map for all accessible software
    const comparisonMap = {};
    for (const sw of softwareList) {
      comparisonMap[sw._id.toString()] = {
        softwareId: sw._id.toString(),
        name: sw.name,
        code: sw.code,
        dataTypes: sw.dataTypes,
        datasetSet: new Set(),
        recordsCount: 0,
        totalData: 0,
        completed: 0,
        processing: 0,
        pending: 0,
        completionPercentage: 0,
        lastUpdated: null,
      };
    }

    let totalData = 0;
    let completed = 0;
    let processing = 0;
    let pending = 0;
    const globalDatasets = new Set();
    const dailyMap = {};

    for (const rec of records) {
      const swId = rec.software.toString();
      totalData += rec.totalData || 0;
      completed += rec.completed || 0;
      processing += rec.processing || 0;
      pending += rec.pending || 0;
      if (rec.datasetName) globalDatasets.add(`${swId}:${rec.datasetName}`);

      if (comparisonMap[swId]) {
        const entry = comparisonMap[swId];
        entry.recordsCount += 1;
        if (rec.datasetName) entry.datasetSet.add(rec.datasetName);
        entry.totalData += rec.totalData || 0;
        entry.completed += rec.completed || 0;
        entry.processing += rec.processing || 0;
        entry.pending += rec.pending || 0;
        if (!entry.lastUpdated || new Date(rec.entryDate) > new Date(entry.lastUpdated)) {
          entry.lastUpdated = rec.entryDate;
        }
      }

      const dayKey = new Date(rec.entryDate).toISOString().slice(0, 10);
      if (!dailyMap[dayKey]) {
        dailyMap[dayKey] = { date: dayKey, totalData: 0, completed: 0, processing: 0, pending: 0 };
      }
      dailyMap[dayKey].totalData += rec.totalData || 0;
      dailyMap[dayKey].completed += rec.completed || 0;
      dailyMap[dayKey].processing += rec.processing || 0;
      dailyMap[dayKey].pending += rec.pending || 0;
    }

    const softwareComparison = Object.values(comparisonMap).map((item) => ({
      softwareId: item.softwareId,
      name: item.name,
      code: item.code,
      dataTypes: item.dataTypes,
      totalDatasets: item.datasetSet.size,
      recordsCount: item.recordsCount,
      totalData: item.totalData,
      completed: item.completed,
      processing: item.processing,
      pending: item.pending,
      completionPercentage:
        item.totalData > 0 ? Number(((item.completed / item.totalData) * 100).toFixed(1)) : 0,
      lastUpdated: item.lastUpdated,
    }));

    const overallCompletionPercentage =
      totalData > 0 ? Number(((completed / totalData) * 100).toFixed(1)) : 0;

    const dailyProgress = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

    // Recent activity logs scoped to accessible software or general system
    const logFilter = {};
    if (accessibleIds !== null) {
      logFilter.$or = [
        { software: { $in: accessibleObjectIds } },
        { user: req.user._id },
      ];
    }
    const recentActivity = await ActivityLog.find(logFilter).sort({ createdAt: -1 }).limit(10);

    const excelCount = await ExcelUpload.countDocuments(
      accessibleIds !== null
        ? { $or: [{ software: { $in: accessibleObjectIds } }, { software: null }] }
        : {}
    );

    // Collect distinct dataTypes available across accessible software for dashboard filtering
    const availableDataTypes = Array.from(
      new Set(softwareList.flatMap((sw) => sw.dataTypes || []))
    ).sort();

    return res.status(200).json({
      success: true,
      kpis: {
        totalSoftware: softwareList.length,
        totalDatasets: globalDatasets.size,
        totalRecords: records.length,
        totalData,
        completed,
        processing,
        pending,
        completionPercentage: overallCompletionPercentage,
        excelFilesCount: excelCount,
      },
      softwareComparison,
      dailyProgress,
      availableDataTypes,
      recentActivity,
    });
  } catch (error) {
    console.error('[DashboardController] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to load summary dashboard.',
      error: error.message,
    });
  }
};

module.exports = { getOverallDashboard };
