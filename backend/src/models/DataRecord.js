const mongoose = require('mongoose');

const dataRecordSchema = new mongoose.Schema(
  {
    software: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Software',
      required: [true, 'Software reference is required'],
    },
    softwareName: {
      type: String,
      required: true,
      trim: true,
    },
    softwareCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    dataType: {
      type: String,
      required: [true, 'Data type is required'],
      trim: true,
    },
    datasetName: {
      type: String,
      required: [true, 'Dataset name/ID is required'],
      trim: true,
    },
    location: {
      type: String,
      required: [true, 'Location is required'],
      trim: true,
    },
    totalData: {
      type: Number,
      required: [true, 'Total data count is required'],
      min: [0, 'Total data cannot be negative'],
    },
    completed: {
      type: Number,
      required: [true, 'Completed count is required'],
      min: [0, 'Completed count cannot be negative'],
    },
    processing: {
      type: Number,
      required: [true, 'Processing count is required'],
      min: [0, 'Processing count cannot be negative'],
    },
    pending: {
      type: Number,
      required: [true, 'Pending count is required'],
      min: [0, 'Pending count cannot be negative'],
    },
    metrics: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    entryDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
    sourceType: {
      type: String,
      enum: ['manual', 'api_sync'],
      default: 'manual',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    createdByName: {
      type: String,
      required: true,
    },
    createdByEmail: {
      type: String,
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    updatedByName: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

dataRecordSchema.index({ software: 1, entryDate: -1 });
dataRecordSchema.index({ createdBy: 1, entryDate: -1 });
dataRecordSchema.index({ entryDate: -1 });

module.exports = mongoose.models.DataRecord || mongoose.model('DataRecord', dataRecordSchema);
