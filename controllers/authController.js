const User = require("../models/user");
const bcrypt = require("bcryptjs");

/* ===== REGISTER (Admin / Authority creation) ===== */
exports.register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      return res.render("admin/dashboard", {
        error: "User already exists",
      });
    }

    const hashed = await bcrypt.hash(password, 10);

    await User.create({
      name,
      email,
      password: hashed,
      role,
    });

    res.redirect("/admin");
  } catch (err) {
    res.send("Error creating user");
  }
};

/* ===== LOGIN ===== */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user)
      return res.render("login", { error: "Invalid credentials" });

    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.render("login", { error: "Invalid credentials" });

    req.session.userId = user._id;
    req.session.role = user.role;

    /* ---- Redirect by role ---- */
    if (user.role === "admin") return res.redirect("/admin");
    if (user.role === "student") return res.redirect("/");
    return res.redirect("/authority");
  } catch (err) {
    res.send("Login error");
  }
};

/* ===== LOGOUT ===== */
exports.logout = (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login");
  });
};
