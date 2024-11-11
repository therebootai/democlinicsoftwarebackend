const express = require("express");
const medicationController = require("../controllers/medicationController");

const router = express.Router();

router.post("/create", medicationController.createMedication);
router.get("/get", medicationController.getAllMedications);
router.get("/getdropdown", medicationController.getMedicationSuggestions);
router.get(
  "/getdropdown/random",
  medicationController.getRandomMedicationSuggestions
);
router.delete(
  "/delete/:medicineBrandName",
  medicationController.deleteMedication
);

module.exports = router;
