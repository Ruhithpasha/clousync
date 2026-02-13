const express = require("express");
const ProfileController = require("../controllers/ProfileController");
const { authenticateUser } = require("../middleware/auth");

const router = express.Router();

router.get("/profile", authenticateUser, ProfileController.get);
router.put("/profile", authenticateUser, ProfileController.update);
router.post("/upgrade-plan", authenticateUser, ProfileController.upgradePlan);

module.exports = router;
