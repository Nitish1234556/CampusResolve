const {
  createAnnouncement,
  getAnnouncements,
  getAnnouncementDetails,
} = require("../controllers/announcementController");
const express = require("express");
const Issue = require("../models/issue");
const { isLoggedIn, checkRole } = require("../middlewares/authMiddleware");
const upload = require("../utils/upload");
const { createNotification } = require("../utils/notificationHelper");
const router = express.Router();

/* =====================================================
   DEFAULT AUTHORITY ROUTE → HOME
===================================================== */
router.get(
  "/",
  isLoggedIn,
  checkRole("warden", "advisor", "hod", "dean"),
  (req, res) => {
    res.redirect("/authority/home");
  }
);

/* =====================================================
   AUTHORITY HOME
===================================================== */
router.get(
  "/home",
  isLoggedIn,
  checkRole("warden", "advisor", "hod", "dean"),
  (req, res) => {
    res.render("authority/home", {
      user: req.session.user,
    });
  }
);

/* =====================================================
   AUTHORITY STATS
===================================================== */
router.get(
  "/stats",
  isLoggedIn,
  checkRole("warden", "advisor", "hod", "dean"),
  async (req, res) => {
    const role = req.session.user.role;

    const total = await Issue.countDocuments({ currentHandler: role });
    const approved = await Issue.countDocuments({
      status: "Approved",
      "timeline.by": role,
    });
    const rejected = await Issue.countDocuments({
      status: "Rejected",
      "timeline.by": role,
    });
    const pending = await Issue.countDocuments({ currentHandler: role });

    res.render("authority/stats", {
      user: req.session.user,
      stats: { total, approved, rejected, pending },
    });
  }
);

/* =====================================================
   AUTHORITY INBOX
===================================================== */
router.get(
  "/inbox",
  isLoggedIn,
  checkRole("warden", "advisor", "hod", "dean"),
  async (req, res) => {
    const role = req.session.user.role;

    const issues = await Issue.find({
      currentHandler: role,
    }).sort({ createdAt: -1 });

    res.render("authority/inbox", {
      user: req.session.user,
      issues,
    });
  }
);

/* =====================================================
   AUTHORITY – VIEW ISSUE DETAILS
===================================================== */
router.get(
  "/issues/:id",
  isLoggedIn,
  checkRole("warden", "advisor", "hod", "dean"),
  async (req, res) => {
    try {
      const issue = await Issue.findById(req.params.id);

      if (!issue) {
        return res.redirect("/authority/inbox");
      }

      res.render("authority/issue-details", {
        user: req.session.user,
        issue,
      });
    } catch (err) {
      console.error(err);
      res.redirect("/authority/inbox");
    }
  }
);

/* =====================================================
   APPROVE ISSUE
===================================================== */
router.get(
  "/issue/:id/approve",
  isLoggedIn,
  checkRole("warden", "advisor", "hod", "dean"),
  async (req, res) => {
    const issue = await Issue.findById(req.params.id);
    res.render("shared/approve", {
      user: req.session.user,
      issue,
      basePath: "/authority",
      mode: "approve",
    });
  }
);
router.post(
  "/issue/:id/approve",
  isLoggedIn,
  checkRole("warden", "advisor", "hod", "dean"),
  upload.single("proof"),
  async (req, res) => {

    const role = req.session.user.role;

    const issue = await Issue.findByIdAndUpdate(
      req.params.id,
      {
        status: "Approved",
        currentHandler: "student",
        resolution: {
          comment: req.body.comment,
          proof: req.file ? `/uploads/${req.file.filename}` : null,
          approvedBy: role,
          approvedAt: new Date(),
        },
        $push: {
          timeline: {
            action: "Issue approved with proof",
            by: role,
          },
        },
      },
      { new: true }
    );

    // notify student
    await createNotification(
      issue.studentId,
      "Your issue has been approved",
      `/issues/${issue._id}`
    );

    res.redirect("/authority/inbox");
  }
);



/* =====================================================
   REJECT ISSUE
===================================================== */
router.get(
  "/issue/:id/reject",
  isLoggedIn,
  checkRole("warden", "advisor", "hod", "dean"),
  async (req, res) => {
    const issue = await Issue.findById(req.params.id);

    res.render("shared/approve", {
      user: req.session.user,
      issue,
      basePath: "/authority",
      mode: "reject",
    });
  }
);

router.post(
  "/issue/:id/reject",
  isLoggedIn,
  checkRole("warden", "advisor", "hod", "dean"),
  upload.single("proof"),
  async (req, res) => {

    const role = req.session.user.role;

    const issue = await Issue.findByIdAndUpdate(
      req.params.id,
      {
        status: "Rejected",
        currentHandler: "student",
        resolution: {
          comment: req.body.comment,
          proof: req.file ? `/uploads/${req.file.filename}` : null,
          approvedBy: role,
          approvedAt: new Date(),
        },
        $push: {
          timeline: {
            action: "Issue rejected with reason",
            by: role,
          },
        },
      },
      { new: true }
    );

    // notify student
    await createNotification(
      issue.studentId,
      "Your issue has been rejected",
      `/issues/${issue._id}`
    );

    res.redirect("/authority/inbox");
  }
);


/* =====================================================
   FORWARD ISSUE (OPTIONAL)
===================================================== */
router.post(
  "/issue/:id/forward",
  isLoggedIn,
  checkRole("warden", "advisor", "hod", "dean"),
  async (req, res) => {

    const role = req.session.user.role;
    const { authority } = req.body;

    const issue = await Issue.findByIdAndUpdate(
      req.params.id,
      {
        status: "Forwarded",
        currentHandler: authority,
        $push: {
          timeline: {
            action: `Forwarded to ${authority}`,
            by: role,
          },
        },
      },
      { new: true }
    );

    // notify student that issue was forwarded
    await createNotification(
      issue.studentId,
      `Your issue has been forwarded to ${authority.toUpperCase()}`,
      `/issues/${issue._id}`
    );

    res.redirect("/authority/inbox");
  }
);
/* =====================================================
   AUTHORITY REPLY IN CONVERSATION
===================================================== */
router.post(
  "/issue/:id/reply",
  isLoggedIn,
  checkRole("warden", "advisor", "hod", "dean"),
  async (req, res) => {

    try {

      const issue = await Issue.findById(req.params.id);

      if (!issue) {
        return res.redirect("/authority/inbox");
      }

      issue.messages.push({
        senderName: req.session.user.name,
        senderRole: req.session.user.role,
        text: req.body.message
      });

      await issue.save();

      // notify student
      await createNotification(
        issue.studentId,
        "Authority replied to your issue",
        `/issues/${issue._id}`
      );

      res.redirect(`/authority/issues/${req.params.id}`);
    } catch (err) {

      console.error(err);
      res.redirect("/authority/inbox");

    }

  }
);

/* =====================================================
   PLACEHOLDERS
===================================================== */
router.get(
  "/announcements",
  isLoggedIn,
  checkRole("warden", "advisor", "hod", "dean"),
  getAnnouncements
);

/* CREATE ANNOUNCEMENT */
router.post(
  "/announcements/create",
  isLoggedIn,
  checkRole("warden", "advisor", "hod", "dean"),
  upload.single("proof"),
  createAnnouncement
);

/* VIEW DETAILS */
router.get(
  "/announcements/:id",
  isLoggedIn,
  getAnnouncementDetails
);

router.get("/notifications", isLoggedIn, (req, res) => {
  res.render("authority/notifications", { user: req.session.user });
});

/* =====================================================
   PROFILE
===================================================== */
router.get("/profile", isLoggedIn, (req, res) => {
  res.render("authority/profile", { user: req.session.user });
});

module.exports = router;
