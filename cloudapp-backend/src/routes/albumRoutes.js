const express = require("express");
const AlbumController = require("../controllers/AlbumController");
const { authenticateUser } = require("../middleware/auth");

const router = express.Router();

router.get("/albums", authenticateUser, AlbumController.list);
router.post("/albums", authenticateUser, AlbumController.create);
router.put("/albums/:id", authenticateUser, AlbumController.update);
router.delete("/albums/:id", authenticateUser, AlbumController.delete);
router.get("/albums/:id/images", authenticateUser, AlbumController.listImages);

module.exports = router;
