const express = require('express');
const router = express.Router();
const { getOverallDashboard } = require('../controllers/dashboardController');
const { protect } = require('../middleware/auth');

router.get('/summary', protect, getOverallDashboard);

module.exports = router;
