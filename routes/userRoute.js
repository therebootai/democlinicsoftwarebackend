const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");

// Get all users
router.get("/users", userController.getAllUsers);

// Create a new user
router.post("/users", userController.createUser);
router.post("/login", userController.loginUser);
router.delete("/delete/:userId", userController.deleteUser);

module.exports = router;
