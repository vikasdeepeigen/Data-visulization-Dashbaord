const express = require('express');
const router = express.Router();
const {
  getDataRecords,
  createDataRecord,
  updateDataRecord,
  deleteDataRecord,
} = require('../controllers/dataRecordController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/', getDataRecords);
router.post('/', createDataRecord);
router.put('/:id', updateDataRecord);
router.delete('/:id', deleteDataRecord);

module.exports = router;
