const express = require("express");
const investigationController = require("../controllers/investigationController");

const router = express.Router();

// Create a new investigation
router.post("/create", investigationController.createInvestigation);

// Get all investigations
router.get("/get", investigationController.getInvestigations);

// Get dropdown suggestions based on search term
router.get("/getdropdown", investigationController.getInvestigationDropdown);

// Get random investigation suggestions
router.get(
  "/getdropdown/random",
  investigationController.getInvestigationRandomSuggestions
);

// Delete an investigation by name
router.delete(
  "/delete/:investigationName",
  investigationController.deleteInvestigation
);

module.exports = router;
