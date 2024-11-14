const express = require("express");
const dentalProcedureController = require("../controllers/dentalProcedureController");

const router = express.Router();

router.post("/create", dentalProcedureController.createDentalProcedure);

router.get("/get", dentalProcedureController.getDentalProcedures);

router.get(
  "/getdropdown",
  dentalProcedureController.getDentalProcedureDropdown
);

router.get(
  "/getdropdown/random",
  dentalProcedureController.getDentalProcedureRandomSuggestions
);

router.put(
  "/update/:dentalProcedureName",
  dentalProcedureController.updateDentalProcedureAreas
);

router.delete(
  "/delete/:dentalProcedureName",
  dentalProcedureController.deleteDentalProcedure
);

module.exports = router;
