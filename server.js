
const express = require("express");
const authorityRoutes = require("./routes/authorityRoutes");
const mongoose = require("mongoose");
const path = require("path");
const session = require("express-session");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const Issue = require("./models/issue");
const User = require("./models/user");

/* ===== ROUTES ===== */
const authRoutes = require("./routes/authRoutes");
const issueRoutes = require("./routes/issueRoutes");
const adminRoutes = require("./routes/adminRoutes");

/* ===== MIDDLEWARE ===== */
const { isLoggedIn, checkRole } = require("./middlewares/authMiddleware");

const app = express();
const { getAnnouncements } = require("./controllers/announcementController");
/* ================= MIDDLEWARE ================= */
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("public"));

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "campusresolve_secret",
    resave: false,
    saveUninitialized: false,
  })
);

const Notification = require("./models/notification");

/* ===== GLOBAL NOTIFICATION COUNTER ===== */
app.use(async (req, res, next) => {

  if (req.session && req.session.user && req.session.user.role === "student") {

    try {

      const count = await Notification.countDocuments({
        userId: req.session.user.id,
        isNew: true
      });

      res.locals.notificationCount = count;

    } catch (err) {
      res.locals.notificationCount = 0;
    }

  } else {
    res.locals.notificationCount = 0;
  }

  next();

});

/* ================= VIEW ENGINE ================= */
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

/* ================= DATABASE ================= */
mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("MongoDB connected");

    const adminExists = await User.findOne({ role: "admin" });
    if (!adminExists) {
      const hashed = await bcrypt.hash("01@admin", 10);
      await User.create({
        name: "Admin",
        email: "admin@campus.com",
        password: hashed,
        role: "admin",
      });
      console.log("✅ Admin created");
    }
  })
  .catch((err) => console.log(err));

/* ================= ROUTES ================= */

/* ---- PUBLIC ROOT ---- */
app.get("/", (req, res) => {
  res.redirect("/login");
});

/* ---- AUTH ROUTES ---- */
app.use("/", authRoutes);

/* ---- STUDENT HOME ---- */
app.get(
  "/student/home",
  isLoggedIn,
  checkRole("student"),
  (req, res) => {
    res.render("student/home", {
      user: req.session.user,
    });
  }
);

/* ---- STUDENT ISSUES ---- */
app.get(
  "/student/issues",
  isLoggedIn,
  checkRole("student"),
  async (req, res) => {
    const issues = await Issue.find({
      studentId: req.session.user.id,
    }).sort({ createdAt: -1 });

    res.render("student/issues", {
      user: req.session.user,
      issues,
    });
  }
);

/* ---- STUDENT PROFILE ---- */
app.get(
  "/student/profile",
  isLoggedIn,
  checkRole("student"),
  (req, res) => {
    res.render("student/profile", {
      user: req.session.user,
    });
  }
);

app.get("/student/notifications", isLoggedIn, checkRole("student"), (req, res) => {
  res.render("student/notifications", { user: req.session.user });
});

/* ---- DEFAULT STUDENT REDIRECT ---- */
app.get("/student", (req, res) => {
  res.redirect("/student/home");
});


/* ---- AUTHORITY ROUTES ---- */
app.use(
  "/authority",
  isLoggedIn,
  checkRole("warden", "advisor", "hod", "dean"),
  authorityRoutes
);


/* ---- ISSUE ROUTES ---- */
app.use("/issues", isLoggedIn, issueRoutes);

/* ---- ADMIN ROUTES ---- */
app.use("/admin", isLoggedIn, checkRole("admin"), adminRoutes);

/* ================= SERVER ================= */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
