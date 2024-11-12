const express = require("express");
const {
  addForm,
  deleteForm,
  getForms,
} = require("../controllers/formController");
const router = express.Router();

router.post("/add", addForm);
router.get("/get", getForms);

router.delete("/:id/delete", deleteForm);

module.exports = router;
