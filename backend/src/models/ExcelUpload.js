const mongoose = require('mongoose');

const sheetDataSchema = new mongoose.Schema(
  {
    sheetName: {
      type: String,
      required: true,
    },
    headers: {
      type: [String],
      default: [],
    },
    rows: {
      type: [[mongoose.Schema.Types.Mixed]],
      default: [],
    },
    rowCount: {
      type: Number,
      default: 0,
    },
    columnCount: {
      type: Number,
      default: 0,
    },
  },
  { _id: false }
);

const excelUploadSchema = new mongoose.Schema(
  {
    originalFileName: {
      type: String,
      required: true,
    },
    storedFileName: {
      type: String,
      required: true,
    },
    filePath: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number,
      required: true,
    },
    mimeType: {
      type: String,
      default: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    },
    software: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Software',
      default: null,
    },
    softwareName: {
      type: String,
      default: 'General / Unassigned',
    },
    sheets: {
      type: [sheetDataSchema],
      default: [],
    },
    selectedSheet: {
      type: String,
      default: '',
    },
    selectedClassColumn: {
      type: Number,
      default: 0,
    },
    selectedClassColumnName: {
      type: String,
      default: '',
    },
    preserveDuplicates: {
      type: Boolean,
      default: false,
    },
    extractedClasses: {
      type: [String],
      default: [],
    },
    totalRows: {
      type: Number,
      default: 0,
    },
    notes: {
      type: String,
      default: '',
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    uploadedByName: {
      type: String,
      required: true,
    },
    uploadedByEmail: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

excelUploadSchema.index({ software: 1, createdAt: -1 });
excelUploadSchema.index({ createdAt: -1 });

module.exports = mongoose.models.ExcelUpload || mongoose.model('ExcelUpload', excelUploadSchema);
