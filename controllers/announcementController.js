const Announcement = require("../models/announcement");

/* ================= CREATE ANNOUNCEMENT ================= */
exports.createAnnouncement = async (req, res) => {
  try {
    const { title, description } = req.body;

    await Announcement.create({
      title,
      description,
      proof: req.file ? `/uploads/${req.file.filename}` : null,
      createdBy: req.session.user.id,
      authorName: req.session.user.name,
      authorRole: req.session.user.role,
    });

    res.redirect("/authority/announcements");
  } catch (err) {
    console.error(err);
    res.send("Error creating announcement");
  }
};

/* ================= GET ALL ANNOUNCEMENTS ================= */
exports.getAnnouncements = async (req, res) => {
  try {
    const announcements = await Announcement.find().sort({ createdAt: -1 });

    // detect role automatically
    const role = req.session.user.role;

    if (["warden", "advisor", "hod", "dean"].includes(role)) {
      return res.render("authority/announcements", {
        user: req.session.user,
        announcements,
      });
    } else {
      return res.render("student/announcements", {
        user: req.session.user,
        announcements,
      });
    }
  } catch (err) {
    console.error(err);
    res.send("Error loading announcements");
  }
};

/* ================= VIEW DETAILS ================= */
exports.getAnnouncementDetails = async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);

    const role = req.session.user.role;

    if (["warden", "advisor", "hod", "dean"].includes(role)) {
      return res.render("authority/announcement-details", {
        user: req.session.user,
        announcement,
      });
    } else {
      return res.render("student/announcement-details", {
        user: req.session.user,
        announcement,
      });
    }
  } catch (err) {
    console.error(err);
    res.redirect("/announcements");
  }
};