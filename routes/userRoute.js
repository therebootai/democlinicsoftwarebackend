const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");

// Get all users
router.get("/users", userController.getAllUsers);

// Get user by token
router.get("/", userController.getUserByToken);

router.get("/checknumber", userController.getUserByPhone);
router.post("/send-otp", userController.sendOtp);
router.post("/verify-with-otp", userController.verifyWithOtp);

// Create a new user
router.post("/users", userController.createUser);
router.post("/login", userController.loginUser);
router.put("/update/:userId", userController.updateUser);

router.delete("/delete/:userId", userController.deleteUser);

module.exports = router;
