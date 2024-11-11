const express = require("express");
const onExaminationController = require("../controllers/onExaminationController");

const router = express.Router();

router.post("/create", onExaminationController.createOnExamination);
router.get("/get", onExaminationController.getOnExaminations);
router.get("/getdropdown", onExaminationController.getOnExaminationDropdown);
router.get(
  "/getdropdown/random",
  onExaminationController.getOnExaminationRandomSuggestions
);
router.put(
  "/update/:onExaminationName",
  onExaminationController.updateOnExaminationAreas
);
router.delete(
  "/delete/:onExaminationName",
  onExaminationController.deleteOnExamination
);

module.exports = router;
