const multer = require("multer");
const path = require("path");

/* ===============================
   STORAGE CONFIGURATION
================================ */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/uploads");   // where files will be saved
  },
  filename: (req, file, cb) => {
    const unique =
      Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});

/* ===============================
   FILE TYPE FILTER
================================ */
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|mp4|webm/;
  const ext = allowedTypes.test(
    path.extname(file.originalname).toLowerCase()
  );

  if (ext) {
    cb(null, true);
  } else {
    cb(new Error("Only images and videos are allowed"));
  }
};

module.exports = multer({
  storage,
  fileFilter,
});
