const Issue = require("../models/issue");
const { createNotification } = require("../utils/notificationHelper");
/* ---------- AUTO ROUTING LOGIC ---------- */
const authorityRouting = {
  Hostel: "warden",
  Academics: "advisor",
  Lab: "advisor",
  Infrastructure: "admin",
};

/* ---------- CREATE ISSUE (STUDENT) ---------- */
exports.createIssue = async (req, res) => {
  try {
    const { category, description, priority } = req.body;

    const issue = await Issue.create({
      studentId: req.user._id,
      category,
      description,
      priority,
      image: req.file ? req.file.path : null,
      currentAuthority: authorityRouting[category],
      timeline: [{ status: "Submitted", date: new Date() }],
    });

    // notify authority about new issue
      await createNotification(
        authorityRouting[category],
        "A new issue has been submitted",
        `/authority/issues/${issue._id}`
      );

    res.redirect("/student/dashboard");
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/* ---------- GET ALL ISSUES ---------- */
exports.getAllIssues = async (req, res) => {
  try {
    const issues = await Issue.find().populate(
      "studentId",
      "name email role"
    );
    res.json(issues);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/* ---------- UPDATE ISSUE (AUTHORITY) ---------- */
exports.updateIssueStatus = async (req, res) => {
  try {
    const { status, remarks } = req.body;
    const issue = await Issue.findById(req.params.id);

    issue.status = status;
    issue.remarks = remarks;

    issue.timeline.push({
      status,
      date: new Date(),
    });

    await issue.save();
    res.json(issue);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
