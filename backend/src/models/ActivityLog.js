const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      enum: ['AUTH', 'USER', 'SOFTWARE', 'DATA_ENTRY', 'EXCEL', 'SYSTEM'],
      required: true,
    },
    action: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    software: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Software',
      default: null,
    },
    softwareName: {
      type: String,
      default: '',
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    userName: {
      type: String,
      default: 'System',
    },
    userEmail: {
      type: String,
      default: '',
    },
    userRole: {
      type: String,
      default: '',
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

activityLogSchema.index({ category: 1, createdAt: -1 });
activityLogSchema.index({ software: 1, createdAt: -1 });
activityLogSchema.index({ createdAt: -1 });

module.exports = mongoose.models.ActivityLog || mongoose.model('ActivityLog', activityLogSchema);
