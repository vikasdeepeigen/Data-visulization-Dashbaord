const User = require('../models/User');
const Software = require('../models/Software');
const { logActivity } = require('../utils/activityLogger');

// @desc    Get all users with assigned software populated
// @route   GET /api/users
// @access  Private / Admin
const getUsers = async (req, res) => {
  try {
    const users = await User.find()
      .select('-password')
      .populate('assignedSoftware', 'name code isActive')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve users.',
      error: error.message,
    });
  }
};

// @desc    Admin creates a user with role and software permissions
// @route   POST /api/users
// @access  Private / Admin
const createUser = async (req, res) => {
  try {
    const { fullName, email, password, role = 'User', assignedSoftware = [], isActive = true } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Full Name, Email, and Password are required.',
      });
    }

    if (!['User', 'Admin'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Role must be either 'User' or 'Admin'.",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters.',
      });
    }

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'A user with this email already exists.',
      });
    }

    // Validate assignedSoftware IDs
    let validSoftwareIds = [];
    if (Array.isArray(assignedSoftware) && assignedSoftware.length > 0) {
      const found = await Software.find({ _id: { $in: assignedSoftware } }).select('_id');
      validSoftwareIds = found.map((s) => s._id);
    }

    const user = await User.create({
      fullName: fullName.trim(),
      email: email.toLowerCase().trim(),
      password,
      role,
      assignedSoftware: validSoftwareIds,
      isActive: Boolean(isActive),
      createdBy: req.user._id,
    });

    const populated = await User.findById(user._id)
      .select('-password')
      .populate('assignedSoftware', 'name code isActive');

    await logActivity({
      category: 'USER',
      action: 'USER_CREATE',
      description: `Admin created ${role} account for ${user.fullName} (${user.email}) with ${validSoftwareIds.length} software permissions`,
      user: req.user,
      metadata: { targetUserId: user._id, role, assignedSoftwareCount: validSoftwareIds.length },
    });

    return res.status(201).json({
      success: true,
      message: 'User created successfully.',
      user: populated,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to create user.',
      error: error.message,
    });
  }
};

// @desc    Admin updates user details, role, status, and software permissions
// @route   PUT /api/users/:id
// @access  Private / Admin
const updateUser = async (req, res) => {
  try {
    const { fullName, email, role, isActive, assignedSoftware, password } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    if (user._id.toString() === req.user._id.toString() && isActive === false) {
      return res.status(400).json({
        success: false,
        message: 'You cannot deactivate your own active Admin account.',
      });
    }

    if (fullName) user.fullName = fullName.trim();
    if (email) {
      const normalized = email.toLowerCase().trim();
      const duplicate = await User.findOne({ email: normalized, _id: { $ne: user._id } });
      if (duplicate) {
        return res.status(400).json({
          success: false,
          message: 'Another user already uses this email.',
        });
      }
      user.email = normalized;
    }

    if (role && ['User', 'Admin'].includes(role)) {
      user.role = role;
    }

    if (typeof isActive === 'boolean') {
      user.isActive = isActive;
    }

    if (Array.isArray(assignedSoftware)) {
      const found = await Software.find({ _id: { $in: assignedSoftware } }).select('_id');
      user.assignedSoftware = found.map((s) => s._id);
    }

    if (password && password.trim().length >= 6) {
      user.password = password.trim();
    }

    await user.save();

    const populated = await User.findById(user._id)
      .select('-password')
      .populate('assignedSoftware', 'name code isActive');

    await logActivity({
      category: 'USER',
      action: 'USER_UPDATE',
      description: `Updated user account ${user.fullName} (${user.email}) — Role: ${user.role}, Assigned Software: ${user.assignedSoftware.length}`,
      user: req.user,
      metadata: { targetUserId: user._id, role: user.role, isActive: user.isActive },
    });

    return res.status(200).json({
      success: true,
      message: 'User updated successfully.',
      user: populated,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update user.',
      error: error.message,
    });
  }
};

// @desc    Assign or update software permissions for a user
// @route   PUT /api/users/:id/permissions
// @access  Private / Admin
const updateUserPermissions = async (req, res) => {
  try {
    const { assignedSoftware } = req.body;
    if (!Array.isArray(assignedSoftware)) {
      return res.status(400).json({
        success: false,
        message: 'assignedSoftware must be an array of software IDs.',
      });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    const foundSoftware = await Software.find({ _id: { $in: assignedSoftware } }).select('_id name');
    user.assignedSoftware = foundSoftware.map((s) => s._id);
    await user.save();

    const populated = await User.findById(user._id)
      .select('-password')
      .populate('assignedSoftware', 'name code isActive');

    await logActivity({
      category: 'USER',
      action: 'USER_PERMISSION_UPDATE',
      description: `Updated software permissions for ${user.fullName} (${user.email}): ${foundSoftware.map((s) => s.name).join(', ') || 'None'}`,
      user: req.user,
      metadata: { targetUserId: user._id, assignedCount: foundSoftware.length },
    });

    return res.status(200).json({
      success: true,
      message: 'Software permissions updated successfully.',
      user: populated,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update software permissions.',
      error: error.message,
    });
  }
};

// @desc    Delete a user
// @route   DELETE /api/users/:id
// @access  Private / Admin
const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account.',
      });
    }

    await user.deleteOne();

    await logActivity({
      category: 'USER',
      action: 'USER_DELETE',
      description: `Deleted user account: ${user.fullName} (${user.email})`,
      user: req.user,
      metadata: { deletedEmail: user.email },
    });

    return res.status(200).json({
      success: true,
      message: 'User deleted successfully.',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to delete user.',
      error: error.message,
    });
  }
};

module.exports = {
  getUsers,
  createUser,
  updateUser,
  updateUserPermissions,
  deleteUser,
};
