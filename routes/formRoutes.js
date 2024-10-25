const express = require("express");
const { addForm, deleteForm } = require("../controllers/formController");
const router = express.Router();

router.post("/add", addForm);
router.delete(":id/delete", deleteForm);

module.exports = router;
