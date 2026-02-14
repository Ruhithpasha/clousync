const express = require("express");
const router = express.Router();
const AdminController = require("../controllers/AdminController");
const { authenticateAdmin } = require("../middleware/auth");

// All admin routes must be protected by authenticateAdmin
router.get("/admin/stats", authenticateAdmin, AdminController.getStats);
router.get("/admin/users", authenticateAdmin, AdminController.getAllUsers);
router.put(
  "/admin/users/plan",
  authenticateAdmin,
  AdminController.updateUserPlan,
);

module.exports = router;
