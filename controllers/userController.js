// controllers/userController.js
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");
const generateCustomId = require("../middlewares/generateCustomId");
const { generateToken } = require("../middlewares/jsontoken");

dotenv.config();
// Get all users
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create a new user
exports.createUser = async (req, res) => {
  const { name, email, phone, password, role } = req.body;

  const userId = await generateCustomId(User, "userId");

  // Validate required fields
  if (!name || !email || !phone || !password || !role) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    // Check if the user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already in use" });
    }

    // Create new user
    const newUser = new User({ userId, name, email, phone, password, role });
    const savedUser = await newUser.save();

    // Generate JWT token
    const token = generateToken(savedUser);

    // Respond with the created user and token
    res.status(201).json({ user: savedUser, token });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.loginUser = async (req, res) => {
  const { emailOrPhone, password, role } = req.body;

  if (!emailOrPhone || !password || !role) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    const user = await User.findOne({
      $or: [{ email: emailOrPhone }, { phone: emailOrPhone }],
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = generateToken(user);

    res.status(200).json({ user, token, name: user.name });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteUser = async (req, res) => {};
