const mongoose = require("mongoose");

const issueSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    studentName: String,
    title: {
      type: String,
      required: true,
    },

    category: {
      type: String,
      enum: ["Hostel", "Academics", "Lab", "Infrastructure"],
      required: true,
    },

    description: {
      type: String,
      required: true,
    },
    attachment: String,
    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Critical"],
      default: "Low",
    },

    status: {
      type: String,
      enum: [
        "Submitted",
        "Rejected",
        "Forwarded",
        "Approved",
      ],
      default: "Submitted",
    },

    currentHandler: {
      type: String, // admin / warden / dean / hod etc.
      default: "admin",
    },

    remarks: String,
    resolution: {
      comment: String,
      proof: String,        // file path (image/video)
      approvedBy: String,   // admin / warden / hod etc
      approvedAt: Date,
    },

    timeline: [
      {
        action: String,
        by: String,
        date: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    messages: [
      {
        senderName: String,
        senderRole: String,
        text: String,
        date: {
          type: Date,
          default: Date.now
        }
      }
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Issue", issueSchema);
