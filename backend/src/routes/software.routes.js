const express = require('express');
const router = express.Router();
const {
  getAllSoftware,
  getSoftwareById,
  getSoftwareDashboard,
  createSoftware,
  updateSoftware,
  deleteSoftware,
} = require('../controllers/softwareController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get('/', getAllSoftware);
router.get('/:id', getSoftwareById);
router.get('/:id/dashboard', getSoftwareDashboard);

router.post('/', authorize('Admin'), createSoftware);
router.put('/:id', authorize('Admin'), updateSoftware);
router.delete('/:id', authorize('Admin'), deleteSoftware);

module.exports = router;
