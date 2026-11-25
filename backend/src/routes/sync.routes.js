const express = require('express');
const router = express.Router();
const { syncExternalData } = require('../controllers/syncController');
const { protect, authorize } = require('../middleware/auth');

router.post('/:softwareCode', protect, authorize('Admin'), syncExternalData);

module.exports = router;
