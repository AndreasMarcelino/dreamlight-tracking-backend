const express = require("express");
const router = express.Router();
const {
  getMilestones,
  getMilestoneById,
  createMilestone,
  updateMilestone,
  updateMilestoneStatus,
  approveTaskSubmission,
  rejectTaskSubmission,
  deleteMilestone,
  getCrewTasks,
  getPendingApprovals,
} = require("../controllers/milestone.controller");
const { protect, authorize } = require("../middleware/auth.middleware");
const {
  validateMilestone,
  validate,
} = require("../middleware/validation.middleware");

// All routes require authentication
router.use(protect);

// Crew specific routes
router.get("/crew/my-tasks", authorize("crew"), getCrewTasks);

// Producer/Admin: Get pending approvals
router.get(
  "/pending-approvals",
  authorize("admin", "producer"),
  getPendingApprovals,
);

// Status update (crew can update their own)
router.patch("/:id/status", updateMilestoneStatus);

// Producer/Admin: Approve or Reject tasks
router.post(
  "/:id/approve",
  authorize("admin", "producer"),
  approveTaskSubmission,
);
router.post(
  "/:id/reject",
  authorize("admin", "producer"),
  rejectTaskSubmission,
);

// General milestone routes
router
  .route("/")
  .get(getMilestones)
  .post(
    authorize("admin", "producer"),
    validateMilestone,
    validate,
    createMilestone,
  );

router
  .route("/:id")
  .get(getMilestoneById)
  .put(
    authorize("admin", "producer"),
    validateMilestone,
    validate,
    updateMilestone,
  )
  .delete(authorize("admin", "producer"), deleteMilestone);

module.exports = router;
