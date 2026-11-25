const ActivityLog = require('../models/ActivityLog');

/**
 * Records an audit log entry without breaking the main request flow on logging errors.
 */
const logActivity = async ({
  category,
  action,
  description,
  software = null,
  softwareName = '',
  user = null,
  metadata = {},
}) => {
  try {
    await ActivityLog.create({
      category,
      action,
      description,
      software: software || null,
      softwareName: softwareName || '',
      user: user?._id || user?.id || null,
      userName: user?.fullName || 'System',
      userEmail: user?.email || '',
      userRole: user?.role || '',
      metadata,
    });
  } catch (err) {
    console.error('[ActivityLogger] Failed to write activity log:', err.message);
  }
};

module.exports = { logActivity };
