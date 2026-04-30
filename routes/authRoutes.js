const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/user");

const router = express.Router();

/* ================= LOGIN PAGE ================= */
router.get("/login", (req, res) => {
  res.render("login");
});

/* ================= STUDENT REGISTER ================= */
router.get("/register", (req, res) => {
  res.render("register");
});

router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.send("User already exists");

    const hashedPassword = await bcrypt.hash(password, 10);

    await User.create({
      name,
      email,
      password: hashedPassword,
      role: "student",
    });

    res.redirect("/login");
  } catch (err) {
    console.error(err);
    res.status(500).send("Registration failed");
  }
});

/* ================= LOGIN HANDLER ================= */
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) return res.send("User not found");

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.send("Invalid password");

  req.session.user = {
    id: user._id,
    role: user.role,
    name: user.name,
    email: user.email,
  };

  if (user.role === "admin") return res.redirect("/admin");
  if (["warden", "advisor", "hod", "dean"].includes(user.role))
    return res.redirect("/authority");

  return res.redirect("/student");
});

/* ================= LOGOUT ================= */
router.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login");
  });
});

module.exports = router;
