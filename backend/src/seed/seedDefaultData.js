const User = require('../models/User');

/**
 * Seeds only the default Admin and sample Standard User accounts if none exist.
 * Software tools are added manually by the Admin from the Admin Panel.
 */
const seedDefaultData = async () => {
  try {
    const adminEmail = 'admin@dataviz.com';
    let admin = await User.findOne({ email: adminEmail });
    if (!admin) {
      admin = await User.create({
        fullName: 'System Administrator',
        email: adminEmail,
        password: 'AdminPassword123!',
        role: 'Admin',
        assignedSoftware: [],
        isActive: true,
      });
      console.log(`[Seed] Default Admin created: ${adminEmail} / AdminPassword123!`);
    }

    const userEmail = 'user@dataviz.com';
    const existingUser = await User.findOne({ email: userEmail });
    if (!existingUser) {
      await User.create({
        fullName: 'Standard User',
        email: userEmail,
        password: 'UserPassword123!',
        role: 'User',
        assignedSoftware: [],
        isActive: true,
        createdBy: admin._id,
      });
      console.log(`[Seed] Default User created: ${userEmail} / UserPassword123!`);
    }
  } catch (err) {
    console.error('[Seed] Default seeding failed:', err.message);
  }
};

module.exports = { seedDefaultData };
