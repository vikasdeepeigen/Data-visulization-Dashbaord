const express = require('express');
const multer = require('multer');
const router = express.Router();
const {
  previewExcel,
  uploadAndSaveExcel,
  getExcelHistory,
  getExcelById,
  updateExcelClassSelection,
  downloadOriginalExcel,
  downloadClassesTxt,
  deleteExcelUpload,
} = require('../controllers/excelController');
const { protect, authorize } = require('../middleware/auth');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedExt = /\.(xlsx|xls|csv)$/i;
    if (!allowedExt.test(file.originalname)) {
      return cb(new Error('Only .xlsx, .xls, and .csv files are allowed.'));
    }
    cb(null, true);
  },
});

router.use(protect);

router.post('/preview', authorize('Admin'), upload.single('file'), previewExcel);
router.post('/upload', authorize('Admin'), upload.single('file'), uploadAndSaveExcel);
router.get('/', getExcelHistory);
router.get('/:id', getExcelById);
router.put('/:id/classes', authorize('Admin'), updateExcelClassSelection);
router.get('/:id/download', downloadOriginalExcel);
router.get('/:id/txt', downloadClassesTxt);
router.delete('/:id', authorize('Admin'), deleteExcelUpload);

module.exports = router;
