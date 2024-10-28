const express = require("express");

const patientController = require("../controllers/patientController");

const router = express.Router();

router.post("/create", patientController.createPatients);
router.get("/get", patientController.getPatients);
router.put("/update/:patientId", patientController.updatePatients);
router.put(
  "/update/prescriptions/:patientId",
  patientController.updatePatientWithPrescription
);
router.put(
  "/update/prescriptions/:patientId/:prescriptionId/:subdocument",
  patientController.addSubdocumentEntry
);
router.put(
  "/update/prescriptions/:patientId/:prescriptionId/:subdocument/:customId",
  patientController.updatePatientSubdocumentEntry
);
router.put(
  "/add/patient/:patientId/document",
  patientController.addPatientDocument
);
router.put(
  "/update/patient/:patientId/document/:documentId",
  patientController.updatePatientDocument
);

router.delete(
  "/delete/prescriptions/:patientId/:prescriptionId/:subdocument/:customId",
  patientController.deleteSubdocumentEntry
);

router.delete("/delete/:patientId", patientController.deletePatients);
router.delete(
  "/delete/:patientId/prescription/:prescriptionId",
  patientController.deletePatientPrescription
);
router.delete(
  "/delete/patient/:patientId/document/:documentId",
  patientController.deletePatientDocument
);

module.exports = router;
