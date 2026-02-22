const express = require("express");
const MemoryController = require("../controllers/MemoryController");
const { authenticateUser } = require("../middleware/auth");

const router = express.Router();

router.post("/", authenticateUser, MemoryController.create);
router.get("/", authenticateUser, MemoryController.list);
router.get("/:id", authenticateUser, MemoryController.getDetail);
router.put("/:id", authenticateUser, MemoryController.update);
router.delete("/:id", authenticateUser, MemoryController.delete);

module.exports = router;
