const express = require("express");
const router = express.Router();
const {
  getDashboard,
  getAdminDashboard,
  getProducerDashboard,
  getProducerAssignedCrew,
  getCrewDashboard,
  getBroadcasterDashboard,
  getInvestorDashboard,
} = require("../controllers/dashboard.controller");
const { protect, authorize } = require("../middleware/auth.middleware");

// All routes require authentication
router.use(protect);

// General dashboard (auto-routes based on role)
router.get("/", getDashboard);

// Role-specific dashboards
router.get("/admin", authorize("admin"), getAdminDashboard);
router.get("/producer", authorize("producer", "admin"), getProducerDashboard);
router.get(
  "/producer/crew",
  authorize("producer", "admin"),
  getProducerAssignedCrew,
);
router.get("/crew", authorize("crew"), getCrewDashboard);
router.get("/broadcaster", authorize("broadcaster"), getBroadcasterDashboard);
router.get("/investor", authorize("investor"), getInvestorDashboard);

module.exports = router;
