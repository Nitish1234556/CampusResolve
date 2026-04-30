const {
  getAnnouncements,
  getAnnouncementDetails,
} = require("../controllers/announcementController");
const express = require("express");
const Issue = require("../models/issue");
const Notification = require("../models/notification");
const upload = require("../utils/upload");
const { isLoggedIn, checkRole } = require("../middlewares/authMiddleware");

const router = express.Router();

/* =====================================================
   SHOW CREATE ISSUE FORM (STUDENT)
===================================================== */
router.get(
  "/new",
  isLoggedIn,
  checkRole("student"),
  (req, res) => {
    res.render("student/raiseIssue", {
      user: req.session.user,
    });
  }
);

/* =====================================================
   STUDENT CREATES ISSUE
   FLOW: Student → Admin (always)
===================================================== */
router.post(
  "/create",
  isLoggedIn,
  checkRole("student"),
  upload.single("attachment"), // optional
  async (req, res) => {
    try {
      const {
        title,
        category,
        subCategory,
        description,
        priority,
        location,
      } = req.body;

      await Issue.create({
        studentId: req.session.user.id,
        studentName: req.session.user.name,

        title,
        category,
        subCategory,
        description,
        priority,
        location,

        attachment: req.file ? req.file.filename : null,

        // ✅ ALWAYS ADMIN FIRST
        status: "Submitted",
        currentHandler: "admin",

        timeline: [
          {
            action: "Issue submitted",
            by: "student",
            at: new Date(),
          },
        ],
      });

      res.redirect("/student/issues");
    } catch (err) {
      console.error(err);
      res.status(500).send("Failed to submit issue");
    }
  }
);
/* =====================================================
   STUDENT NOTIFICATIONS
===================================================== */
router.get(
  "/notifications",
  isLoggedIn,
  checkRole("student"),
  async (req, res) => {

    try {

      const notifications = await Notification
        .find({ userId: req.session.user.id })
        .sort({ createdAt: -1 })
        .limit(8);

      // mark notifications as read
      await Notification.updateMany(
        { userId: req.session.user.id, isNew: true },
        { isNew: false }
      );

      res.render("student/notifications", {
        user: req.session.user,
        notifications
      });

    } catch (err) {

      console.error(err);
      res.redirect("/student");

    }

  }
);

/* =====================================================
   ANNOUNCEMENTS (FOR STUDENTS)
===================================================== */

router.get(
  "/announcements",
  isLoggedIn,
  getAnnouncements
);

router.get(
  "/announcements/:id",
  isLoggedIn,
  getAnnouncementDetails
);

/* =====================================================
   STUDENT – VIEW SINGLE ISSUE DETAILS
===================================================== */
router.get(
  "/:id",
  isLoggedIn,
  checkRole("student"),
  async (req, res) => {
    try {
      const issue = await Issue.findOne({
        _id: req.params.id,
        studentId: req.session.user.id, // 🔐 security
      });

      if (!issue) {
        return res.redirect("/student/issues");
      }

      res.render("student/issue-details", {
        user: req.session.user,
        issue,
      });
    } catch (err) {
      console.error(err);
      res.redirect("/student/issues");
    }
  }
);
/* =====================================================
   ISSUE CONVERSATION REPLY
===================================================== */
router.post(
  "/:id/reply",
  isLoggedIn,
  async (req, res) => {
    try {

      const issue = await Issue.findById(req.params.id);

      if (!issue) {
        return res.redirect("/student/issues");
      }

      issue.messages.push({
        senderName: req.session.user.name,
        senderRole: req.session.user.role,
        text: req.body.message
      });

      await issue.save();

      // redirect back to the same issue page
      res.redirect(`/issues/${req.params.id}`);

    } catch (err) {

      console.error(err);
      res.redirect("/student/issues");

    }
  }
);

module.exports = router;