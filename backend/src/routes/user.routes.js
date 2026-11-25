const express = require('express');
const router = express.Router();
const {
  getUsers,
  createUser,
  updateUser,
  updateUserPermissions,
  deleteUser,
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect, authorize('Admin'));

router.get('/', getUsers);
router.post('/', createUser);
router.put('/:id', updateUser);
router.put('/:id/permissions', updateUserPermissions);
router.delete('/:id', deleteUser);

module.exports = router;
