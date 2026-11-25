const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET =
  process.env.JWT_SECRET || 'super_secret_jwt_key_data_visualization_platform_2026';




const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};




// Register
const register = async (req, res) => {
  try {
    const { fullName, email, password, confirmPassword, role = 'User' } = req.body;

    if (!fullName || !email || !password || !confirmPassword) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (!['User', 'Admin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role selected' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });

    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const user = await User.create({
      fullName,
      email: email.toLowerCase().trim(),
      password,
      role,
    });

    return res.status(201).json({
      success: true,
      message: 'Registration successful',
      token: generateToken(user),
      user,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};




// Login
const login = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({
      email: email.toLowerCase().trim(),
    }).populate('assignedSoftware', 'name code isActive');

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: 'Account is disabled' });
    }

    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (role && user.role !== role) {
      return res.status(403).json({ message: 'Incorrect role selected' });
    }

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token: generateToken(user),
      user,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// Get Profile
const getMe = async (req, res) => {
  return res.status(200).json({
    success: true,
    user: req.user,
  });
};


// Create Admin
const createAdmin = async (req, res) => {
  try {
    const { fullName, email, password, setupKey } = req.body;

    if (setupKey !== process.env.ADMIN_SETUP_KEY) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    if (!fullName || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });

    if (existingUser) {
      existingUser.role = 'Admin';
      existingUser.fullName = fullName;
      existingUser.password = password;
      existingUser.isActive = true;
      await existingUser.save();

      return res.status(200).json({
        success: true,
        message: 'User updated to Admin',
      });
    }

    const admin = await User.create({
      fullName,
      email: email.toLowerCase().trim(),
      password,
      role: 'Admin',
      isActive: true,
    });

    return res.status(201).json({
      success: true,
      message: 'Admin created successfully',
      user: admin,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  register,
  login,
  getMe,
  createAdmin,
};