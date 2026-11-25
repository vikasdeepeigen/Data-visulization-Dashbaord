const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET =
  process.env.JWT_SECRET || 'super_secret_jwt_key_data_visualization_platform_2026';


  
const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.query && req.query.token) {
    // Support token via query string for direct file downloads
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No authorization token provided.',
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id)
      .select('-password')
      .populate('assignedSoftware', 'name code isActive');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'The user belonging to this token no longer exists.',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Contact an administrator.',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token. Please log in again.',
    });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Requires ${roles.join(' or ')} role.`,
      });
    }
    next();
  };
};

/**
 * Helper to get array of software ObjectIds accessible by current user.
 * Admins have access to all software (returns null to signify unrestricted).
 * Standard Users only have access to their assignedSoftware list.
 */
const getAccessibleSoftwareIds = (user) => {
  if (!user || user.role === 'Admin') return null;
  return (user.assignedSoftware || []).map((sw) => (sw._id ? sw._id.toString() : sw.toString()));
};

const hasSoftwarePermission = (user, softwareId) => {
  if (!user) return false;
  if (user.role === 'Admin') return true;
  const targetId = softwareId.toString();
  return (user.assignedSoftware || []).some(
    (sw) => (sw._id ? sw._id.toString() : sw.toString()) === targetId
  );
};

module.exports = {
  protect,
  authorize,
  getAccessibleSoftwareIds,
  hasSoftwarePermission,
};
