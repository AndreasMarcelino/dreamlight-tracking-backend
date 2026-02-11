const express = require("express");
const router = express.Router({ mergeParams: true }); // Important for nested routes
const {
  getProjectCrew,
  getAvailableCrew,
  assignCrewToProject,
  bulkAssignCrew,
  updateCrewAssignment,
  removeCrewFromProject,
  checkCrewAssignment,
} = require("../controllers/projectcrew.controller");
const { protect, authorize } = require("../middleware/auth.middleware");

// All routes require authentication
router.use(protect);

/**
 * Base path: /api/projects/:projectId/crew
 */

// Get available crew (not yet assigned)
router.get("/available", authorize("admin"), getAvailableCrew);

// Check if specific user is assigned
router.get("/check/:userId", checkCrewAssignment);

// Get all crew assigned to project
router.get("/", authorize("admin", "producer"), getProjectCrew);

// Assign single crew to project
router.post("/", authorize("admin"), assignCrewToProject);

// Bulk assign multiple crew
router.post("/bulk", authorize("admin"), bulkAssignCrew);

// Update crew assignment (role in project)
router.put("/:userId", authorize("admin"), updateCrewAssignment);

// Remove crew from project
router.delete("/:userId", authorize("admin"), removeCrewFromProject);

module.exports = router;
