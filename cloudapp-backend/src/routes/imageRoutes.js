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
  limits: { fileSize: 50 * 1024 * 1024 }, // Increased to 50MB
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
router.get(
  "/restorable-images",
  authenticateUser,
  ImageController.getRestorable,
);
router.post(
  "/check-status-bulk",
  authenticateUser,
  ImageController.checkCloudinaryStatusBulk,
);
router.get("/local-images", authenticateUser, ImageController.list);
router.get("/search-images", authenticateUser, ImageController.search);
router.get(
  "/images/:id/similar",
  authenticateUser,
  ImageController.findSimilar,
);
router.put("/images/:id", authenticateUser, ImageController.update);
router.put("/images-bulk", authenticateUser, ImageController.bulkUpdate);
router.delete("/images/:id", authenticateUser, ImageController.delete);
// Metadata-based restore: uses public_id stored in Supabase to call Cloudinary backup API
router.post(
  "/images/:id/restore",
  authenticateUser,
  ImageController.restoreFromMetadata,
);
// Legacy restore (deprecated)
router.post("/restore/:filename", ImageController.restore);

// Sharing System
router.post("/images/:id/share", authenticateUser, ImageController.share);
router.get("/s/:token", ImageController.resolveShare); // Publicly accessible

module.exports = router;
