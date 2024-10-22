const express = require("express");

const patientController = require("../controllers/patientController");

const router = express.Router();

router.post("/create", patientController.createPatients);
router.get("/get", patientController.getPatients);

module.exports = router;
