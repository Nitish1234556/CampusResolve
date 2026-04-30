const mongoose = require("mongoose");

const announcementSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },

    description: {
      type: String,
      required: true,
    },

    proof: String, // file path

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    authorName: String,
    authorRole: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Announcement", announcementSchema);