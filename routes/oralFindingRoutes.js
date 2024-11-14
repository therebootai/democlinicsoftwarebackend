const express = require("express");

const oralFindingController = require("../controllers/oralFindingController");

const router = express.Router();

router.post("/create", oralFindingController.createOralFinding);
router.get("/get", oralFindingController.getOralFinding);
router.get("/getdropdown", oralFindingController.getOralFindingDropdown);
router.get(
  "/getdropdown/random",
  oralFindingController.getOralFindingRandomSuggestions
);
router.put(
  "/update/:oralFindingName",
  oralFindingController.updateOralFindingAreas
);

router.delete(
  "/delete/:oralFindingName",
  oralFindingController.deleteOralFinding
);

module.exports = router;
