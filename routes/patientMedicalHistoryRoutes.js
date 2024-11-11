const express = require("express");
const patientMedicalHistoryController = require("../controllers/patientMedicalHistoryController");

const router = express.Router();

router.post(
  "/create",
  patientMedicalHistoryController.createPatientMedicalHistory
);
router.get("/get", patientMedicalHistoryController.getAllPatientMedicalHistory);
router.get(
  "/getdropdown",
  patientMedicalHistoryController.getPatientMedicalHistoryByName
);
router.get(
  "/getMedicinesByHistoryName",
  patientMedicalHistoryController.getMedicinesByHistoryName
);

router.get(
  "/getdropdown/random",
  patientMedicalHistoryController.getPatientMedicalHistoryRandomSuggestions
);

router.put(
  "/update/:patientMedicalHistoryName",
  patientMedicalHistoryController.updatePatientMedicalHistory
);
router.delete(
  "/delete/:patientMedicalHistoryName",
  patientMedicalHistoryController.deletePatientMedicalHistory
);

module.exports = router;
