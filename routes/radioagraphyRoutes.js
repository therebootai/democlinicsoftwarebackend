const express = require("express");
const radiographyController = require("../controllers/radiographyController");

const router = express.Router();

router.post("/create", radiographyController.createRadiography);
router.get("/get", radiographyController.getRadiography);
router.get("/getdropdown", radiographyController.getRadiographyDropdown);
router.get(
  "/getdropdown/random",
  radiographyController.getRadiographyRandomSuggestions
);
router.delete(
  "/delete/:radiographyName",
  radiographyController.deleteRadiography
);

module.exports = router;
