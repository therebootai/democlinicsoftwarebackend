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

router.put("/update/:medicineId", medicationController.updateMedication);

router.delete("/delete/:medicineId", medicationController.deleteMedication);

module.exports = router;
