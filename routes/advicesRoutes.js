const express = require("express");
const advicesController = require("../controllers/advicesController");

const router = express.Router();

// Create a new advice
router.post("/create", advicesController.createAdvice);

// Get all advices
router.get("/get", advicesController.getAllAdvices);

// Get advice suggestions based on search query
router.get("/getdropdown", advicesController.getAdviceSuggestions);

// Get random advice suggestions
router.get("/getdropdown/random", advicesController.getRandomAdviceSuggestions);

router.delete("/delete/:advicesName", advicesController.deleteAdvice);

module.exports = router;
