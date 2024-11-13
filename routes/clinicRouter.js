const express = require("express");
const {
  getAllClinics,
  addNewClinic,
  getClinicById,
  deleteClinicById,
} = require("../controllers/clinicController");
const router = express.Router();

router.get("/all", getAllClinics);

router.post("/add", addNewClinic);

router.route("/:clinicId").get(getClinicById).delete(deleteClinicById);

module.exports = router;
