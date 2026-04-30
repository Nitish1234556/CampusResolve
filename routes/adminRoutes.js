const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/user");
const Issue = require("../models/issue");
const { isLoggedIn, checkRole } = require("../middlewares/authMiddleware");
const upload = require("../utils/upload");
const { createNotification } = require("../utils/notificationHelper");

const router = express.Router();

/* =====================================================
   DEFAULT ADMIN ROUTE → REDIRECT TO HOME
===================================================== */
router.get(
  "/",
  isLoggedIn,
  checkRole("admin"),
  (req, res) => {
    res.redirect("/admin/home");
  }
);

/* =====================================================
   ADMIN HOME
===================================================== */
router.get(
  "/home",
  isLoggedIn,
  checkRole("admin"),
  (req, res) => {
    res.render("admin/home", {
      user: req.session.user,
    });
  }
);

/* =====================================================
   ADMIN STATS
===================================================== */
router.get(
  "/stats",
  isLoggedIn,
  checkRole("admin"),
  async (req, res) => {

    const total = await Issue.countDocuments();
    const approved = await Issue.countDocuments({ status: "Approved" });
    const rejected = await Issue.countDocuments({ status: "Rejected" });

    const pending = await Issue.countDocuments({
      currentHandler: "admin",
      status: { $nin: ["Approved", "Rejected"] }
    });

    res.render("admin/stats", {
      user: req.session.user,
      stats: { total, approved, rejected, pending },
    });
  }
);

/* =====================================================
   ADMIN INBOX
===================================================== */
router.get(
  "/inbox",
  isLoggedIn,
  checkRole("admin"),
  async (req, res) => {

    const issues = await Issue.find({
      currentHandler: "admin",
    }).sort({ createdAt: -1 });

    const authorities = await User.find({
      role: { $in: ["warden", "advisor", "hod", "dean"] },
    });

    res.render("admin/inbox", {
      user: req.session.user,
      issues,
      authorities,
    });

  }
);

/* =====================================================
   ADMIN VIEW ISSUE DETAILS
===================================================== */
router.get(
  "/issues/:id",
  isLoggedIn,
  checkRole("admin"),
  async (req, res) => {

    try {

      const issue = await Issue.findById(req.params.id);

      if (!issue) {
        return res.redirect("/admin/inbox");
      }

      res.render("admin/issue-details", {
        user: req.session.user,
        issue,
      });

    } catch (err) {

      console.error(err);
      res.redirect("/admin/inbox");

    }

  }
);

/* =====================================================
   ADMIN APPROVE ISSUE
===================================================== */
router.get(
  "/issue/:id/approve",
  isLoggedIn,
  checkRole("admin"),
  async (req, res) => {

    const issue = await Issue.findById(req.params.id);

    res.render("shared/approve", {
      user: req.session.user,
      issue,
      basePath: "/admin",
    });

  }
);

router.post(
  "/issue/:id/approve",
  isLoggedIn,
  checkRole("admin"),
  upload.single("proof"),
  async (req, res) => {

    const issue = await Issue.findByIdAndUpdate(
      req.params.id,
      {
        status: "Approved",
        currentHandler: "student",
        resolution: {
          comment: req.body.comment,
          proof: req.file ? `/uploads/${req.file.filename}` : null,
          approvedBy: "admin",
          approvedAt: new Date(),
        },
        $push: {
          timeline: {
            action: "Issue approved with proof",
            by: "admin",
          },
        },
      },
      { new: true }
    );

    await createNotification(
      issue.studentId,
      "Your issue has been approved by Admin",
      `/issues/${issue._id}`
    );

    res.redirect("/admin/inbox");

  }
);

/* =====================================================
   ADMIN REJECT ISSUE
===================================================== */
router.get(
  "/issue/:id/reject",
  isLoggedIn,
  checkRole("admin"),
  async (req, res) => {

    const issue = await Issue.findById(req.params.id);

    res.render("shared/approve", {
      user: req.session.user,
      issue,
      basePath: "/admin",
      mode: "reject",
    });

  }
);

router.post(
  "/issue/:id/reject",
  isLoggedIn,
  checkRole("admin"),
  upload.single("proof"),
  async (req, res) => {

    const issue = await Issue.findByIdAndUpdate(
      req.params.id,
      {
        status: "Rejected",
        currentHandler: "Issue Closed",
        resolution: {
          comment: req.body.comment,
          proof: req.file ? `/uploads/${req.file.filename}` : null,
          approvedBy: "admin",
          approvedAt: new Date(),
        },
        $push: {
          timeline: {
            action: "Issue rejected",
            by: "admin",
          },
        },
      },
      { new: true }
    );

    await createNotification(
      issue.studentId,
      "Your issue has been rejected by Admin",
      `/issues/${issue._id}`
    );

    res.redirect("/admin/inbox");

  }
);

/* =====================================================
   ADMIN FORWARD ISSUE
===================================================== */
router.post(
  "/issue/:id/forward",
  isLoggedIn,
  checkRole("admin"),
  async (req, res) => {

    const { authority } = req.body;

    const issue = await Issue.findByIdAndUpdate(
      req.params.id,
      {
        status: "Forwarded",
        currentHandler: authority,
        $push: {
          timeline: {
            action: `Forwarded to ${authority}`,
            by: "admin",
          },
        },
      },
      { new: true }
    );

    await createNotification(
      issue.studentId,
      `Your issue has been forwarded to ${authority.toUpperCase()} by Admin`,
      `/issues/${issue._id}`
    );

    res.redirect("/admin/inbox");

  }
);

/* =====================================================
   ADMIN REPLY IN CONVERSATION
===================================================== */
router.post(
  "/issue/:id/reply",
  isLoggedIn,
  checkRole("admin"),
  async (req, res) => {

    try {

      const issue = await Issue.findById(req.params.id);

      if (!issue) {
        return res.redirect("/admin/inbox");
      }

      issue.messages.push({
        senderName: req.session.user.name,
        senderRole: "admin",
        text: req.body.message
      });

      await issue.save();

      await createNotification(
        issue.studentId,
        "Admin replied to your issue",
        `/issues/${issue._id}`
      );

      res.redirect(`/admin/issues/${req.params.id}`);

    } catch (err) {

      console.error(err);
      res.redirect("/admin/inbox");

    }

  }
);

/* =====================================================
   MANAGE AUTHORITIES
===================================================== */
router.get(
  "/manage-authorities",
  isLoggedIn,
  checkRole("admin"),
  async (req, res) => {

    const authorities = await User.find({
      role: { $in: ["warden", "advisor", "hod", "dean"] },
    });

    res.render("admin/manage-authorities", {
      user: req.session.user,
      authorities,
    });

  }
);

/* =====================================================
   CREATE AUTHORITY
===================================================== */
router.post(
  "/manage-authorities",
  isLoggedIn,
  checkRole("admin"),
  async (req, res) => {

    const { name, email, password, role } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      return res.send("Authority already exists");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await User.create({
      name,
      email,
      password: hashedPassword,
      role,
    });

    res.redirect("/admin/manage-authorities");

  }
);

/* =====================================================
   PLACEHOLDERS
===================================================== */
router.get(
  "/announcements",
  isLoggedIn,
  checkRole("admin"),
  (req, res) => {
    res.render("admin/announcements", {
      user: req.session.user,
    });
  }
);

router.get(
  "/notifications",
  isLoggedIn,
  checkRole("admin"),
  (req, res) => {
    res.render("admin/notifications", {
      user: req.session.user,
    });
  }
);

/* =====================================================
   ADMIN PROFILE
===================================================== */
router.get(
  "/profile",
  isLoggedIn,
  checkRole("admin"),
  (req, res) => {
    res.render("admin/profile", {
      user: req.session.user,
    });
  }
);

module.exports = router;