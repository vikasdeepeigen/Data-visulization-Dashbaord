const DataRecord = require('../models/DataRecord');
const Software = require('../models/Software');
const ActivityLog = require('../models/ActivityLog');
const { getAccessibleSoftwareIds } = require('../middleware/auth');

const buildRecordQuery = (req) => {
  const { softwareId, dataType, location, search, startDate, endDate } = req.query;
  const filter = {};
  const accessibleIds = getAccessibleSoftwareIds(req.user);

  if (accessibleIds !== null) {
    if (softwareId && softwareId !== 'all') {
      if (!accessibleIds.includes(softwareId)) {
        return { forbidden: true };
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

  return { filter };
};

// @desc    Generate aggregated reports and detailed records scoped by permissions & filters
// @route   GET /api/reports
// @access  Private
const getReports = async (req, res) => {
  try {
    const built = buildRecordQuery(req);
    if (built.forbidden) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to reports for the requested software.',
      });
    }

    const records = await DataRecord.find(built.filter).sort({ entryDate: -1, createdAt: -1 });

    let totalData = 0;
    let completed = 0;
    let processing = 0;
    let pending = 0;
    const softwareSummaryMap = {};

    for (const r of records) {
      totalData += r.totalData || 0;
      completed += r.completed || 0;
      processing += r.processing || 0;
      pending += r.pending || 0;

      const key = r.software.toString();
      if (!softwareSummaryMap[key]) {
        softwareSummaryMap[key] = {
          softwareId: key,
          softwareName: r.softwareName,
          softwareCode: r.softwareCode,
          recordsCount: 0,
          totalData: 0,
          completed: 0,
          processing: 0,
          pending: 0,
        };
      }
      softwareSummaryMap[key].recordsCount += 1;
      softwareSummaryMap[key].totalData += r.totalData || 0;
      softwareSummaryMap[key].completed += r.completed || 0;
      softwareSummaryMap[key].processing += r.processing || 0;
      softwareSummaryMap[key].pending += r.pending || 0;
    }

    const softwareSummaries = Object.values(softwareSummaryMap).map((s) => ({
      ...s,
      completionPercentage:
        s.totalData > 0 ? Number(((s.completed / s.totalData) * 100).toFixed(1)) : 0,
    }));

    return res.status(200).json({
      success: true,
      summary: {
        totalRecords: records.length,
        totalData,
        completed,
        processing,
        pending,
        completionPercentage:
          totalData > 0 ? Number(((completed / totalData) * 100).toFixed(1)) : 0,
      },
      softwareSummaries,
      records,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to generate report.',
      error: error.message,
    });
  }
};

// @desc    Export filtered report as CSV
// @route   GET /api/reports/export/csv
// @access  Private
const exportReportCsv = async (req, res) => {
  try {
    const built = buildRecordQuery(req);
    if (built.forbidden) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const records = await DataRecord.find(built.filter).sort({ entryDate: -1 });
    const headers = [
      'Entry Date',
      'Software Name',
      'Software Code',
      'Data Type',
      'Dataset Name/ID',
      'Location',
      'Total Data',
      'Completed',
      'Processing',
      'Pending',
      'Completion %',
      'Software Metrics (JSON)',
      'Entered By',
      'User Email',
      'Source',
      'Notes',
    ];

    const escapeCsv = (val) => {
      const str = val === undefined || val === null ? '' : String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const lines = [headers.join(',')];
    for (const r of records) {
      const pct = r.totalData > 0 ? ((r.completed / r.totalData) * 100).toFixed(1) : '0.0';
      const row = [
        new Date(r.entryDate).toISOString().slice(0, 10),
        r.softwareName,
        r.softwareCode,
        r.dataType,
        r.datasetName,
        r.location,
        r.totalData,
        r.completed,
        r.processing,
        r.pending,
        `${pct}%`,
        JSON.stringify(r.metrics || {}),
        r.createdByName,
        r.createdByEmail,
        r.sourceType || 'manual',
        r.notes || '',
      ].map(escapeCsv);
      lines.push(row.join(','));
    }

    const csvString = lines.join('\n');
    const filename = `av_data_report_${new Date().toISOString().slice(0, 10)}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(csvString);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to export CSV report.',
      error: error.message,
    });
  }
};

// @desc    Export filtered report as JSON
// @route   GET /api/reports/export/json
// @access  Private
const exportReportJson = async (req, res) => {
  try {
    const built = buildRecordQuery(req);
    if (built.forbidden) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const records = await DataRecord.find(built.filter).sort({ entryDate: -1 });
    const filename = `av_data_report_${new Date().toISOString().slice(0, 10)}.json`;

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(
      JSON.stringify(
        {
          exportedAt: new Date().toISOString(),
          exportedBy: req.user.email,
          totalRecords: records.length,
          records,
        },
        null,
        2
      )
    );
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to export JSON report.',
      error: error.message,
    });
  }
};

// @desc    Get activity logs with filters scoped to user permissions
// @route   GET /api/reports/activity
// @access  Private
const getActivityLogs = async (req, res) => {
  try {
    const { category, softwareId, startDate, endDate, search, limit = 100 } = req.query;
    const filter = {};
    const accessibleIds = getAccessibleSoftwareIds(req.user);

    if (accessibleIds !== null) {
      if (softwareId && softwareId !== 'all') {
        if (!accessibleIds.includes(softwareId)) {
          return res.status(403).json({ success: false, message: 'Access denied.' });
        }
        filter.software = softwareId;
      } else {
        filter.$or = [{ software: { $in: accessibleIds } }, { user: req.user._id }];
      }
    } else if (softwareId && softwareId !== 'all') {
      filter.software = softwareId;
    }

    if (category && category !== 'all') {
      filter.category = category;
    }

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      filter.$and = filter.$and || [];
      filter.$and.push({
        $or: [
          { description: regex },
          { action: regex },
          { softwareName: regex },
          { userName: regex },
          { userEmail: regex },
        ],
      });
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    const logs = await ActivityLog.find(filter)
      .sort({ createdAt: -1 })
      .limit(Math.min(Number(limit) || 100, 500));

    return res.status(200).json({
      success: true,
      count: logs.length,
      logs,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to load activity logs.',
      error: error.message,
    });
  }
};

module.exports = {
  getReports,
  exportReportCsv,
  exportReportJson,
  getActivityLogs,
};
