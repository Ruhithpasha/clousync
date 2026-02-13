const express = require("express");
const multer = require("multer");
const path = require("path");
const ImageController = require("../controllers/ImageController");
const { authenticateUser } = require("../middleware/auth");

const router = express.Router();
const UPLOAD_DIR = path.join(__dirname, "../../uploads");

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const sanitizedFilename = file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_");
    cb(null, Date.now() + "-" + sanitizedFilename);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed"));
  },
}).single("image");

const uploadMiddleware = (req, res, next) => {
  upload(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    next();
  });
};

router.post(
  "/upload",
  authenticateUser,
  uploadMiddleware,
  ImageController.upload,
);
router.get("/images", authenticateUser, ImageController.list);
router.get("/local-images", authenticateUser, ImageController.list);
router.get("/search-images", authenticateUser, ImageController.search);
router.put("/images/:id", authenticateUser, ImageController.update);
router.put("/images-bulk", authenticateUser, ImageController.bulkUpdate);
router.delete("/images/:id", authenticateUser, ImageController.delete);
router.post("/restore/:filename", ImageController.restore);

module.exports = router;
