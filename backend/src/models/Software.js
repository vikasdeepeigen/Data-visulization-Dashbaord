const mongoose = require('mongoose');

const metricFieldSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: [true, 'Metric field key is required'],
      trim: true,
    },
    label: {
      type: String,
      required: [true, 'Metric field label is required'],
      trim: true,
    },
    type: {
      type: String,
      enum: ['number', 'percentage', 'text', 'select', 'boolean'],
      default: 'number',
    },
    unit: {
      type: String,
      default: '',
      trim: true,
    },
    required: {
      type: Boolean,
      default: false,
    },
    options: {
      type: [String],
      default: [],
    },
    placeholder: {
      type: String,
      default: '',
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  { _id: false }
);

const softwareSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Software name is required'],
      trim: true,
      unique: true,
    },
    code: {
      type: String,
      required: [true, 'Unique software code is required'],
      trim: true,
      uppercase: true,
      unique: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    dataTypes: {
      type: [String],
      required: true,
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length > 0,
        message: 'At least one data type is required',
      },
    },
    metricFields: {
      type: [metricFieldSchema],
      default: [],
    },
    supportsExcelClasses: {
      type: Boolean,
      default: true,
    },
    requiresTxtExport: {
      type: Boolean,
      default: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    order: {
      type: Number,
      default: 100,
    },
    syncConfig: {
      mode: {
        type: String,
        enum: ['manual', 'webhook', 'api_poll'],
        default: 'manual',
      },
      endpointUrl: {
        type: String,
        default: '',
      },
      lastSyncedAt: {
        type: Date,
        default: null,
      },
    },
  },
  {
    timestamps: true,
  }
);

softwareSchema.index({ order: 1, name: 1 });

module.exports = mongoose.models.Software || mongoose.model('Software', softwareSchema);
