const express = require("express");
const chiefComplainController = require("../controllers/chiefComplainController");

const router = express.Router();

router.post("/create", chiefComplainController.createChiefComplain);
router.get("/get", chiefComplainController.getChiefComplain);
router.get("/getdropdown", chiefComplainController.getChiefComplainDropdown);
router.get(
  "/getdropdown/random",
  chiefComplainController.getChiefComplainRandomSuggestions
);
router.put(
  "/update/:chiefComplainName",
  chiefComplainController.updateChiefComplain
);
router.delete(
  "/delete/:chiefComplainName",
  chiefComplainController.deleteChiefComplain
);

module.exports = router;
