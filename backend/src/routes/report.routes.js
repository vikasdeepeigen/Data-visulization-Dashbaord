const express = require('express');
const router = express.Router();
const {
  getReports,
  exportReportCsv,
  exportReportJson,
  getActivityLogs,
} = require('../controllers/reportController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/', getReports);
router.get('/export/csv', exportReportCsv);
router.get('/export/json', exportReportJson);
router.get('/activity', getActivityLogs);

module.exports = router;
