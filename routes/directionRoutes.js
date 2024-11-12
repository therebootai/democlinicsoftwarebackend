const express = require("express");
const {
  addDirection,
  deleteDirection,
  getDirection,
} = require("../controllers/directionController");
const router = express.Router();

router.post("/add", addDirection);
router.get("/get", getDirection);

router.delete("/:id/delete", deleteDirection);

module.exports = router;
