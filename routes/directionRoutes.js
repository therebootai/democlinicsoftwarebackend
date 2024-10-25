const express = require("express");
const {
  addDirection,
  deleteDirection,
} = require("../controllers/directionController");
const router = express.Router();

router.post("/add", addDirection);
router.delete(":id/delete", deleteDirection);

module.exports = router;
