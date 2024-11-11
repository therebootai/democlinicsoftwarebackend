// controllers/userController.js
const User = require("../models/User");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");

const generateCustomId = require("../middlewares/generateCustomId");
const { generateToken } = require("../middlewares/jsontoken");

dotenv.config();
// Get all users
exports.getAllUsers = async (req, res) => {
  try {
    const { designation, userId } = req.query;

    const query = {};
    if (designation) query.designation = designation;
    if (userId) query.userId = userId;
    const users = await User.find(query);

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create a new user
exports.createUser = async (req, res) => {
  const { name, email, phone, password, role, designation, doctorDegree } =
    req.body;

  const idPrefix =
    designation === "Doctor"
      ? "doctorId"
      : designation === "Staff"
      ? "staffId"
      : "userId";

  // Validate required fields
  if (!name || !email || !phone || !password || !role || !designation) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    // Check if the user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already in use" });
    }

    const userId = await generateCustomId(User, "userId", idPrefix);

    // Create new user
    const newUser = new User({
      userId,
      name,
      email,
      phone,
      password,
      role,
      designation,
      doctorDegree,
    });
    const savedUser = await newUser.save();

    // Generate JWT token
    const token = generateToken({
      userId: savedUser.userId,
      email: savedUser.email,
      role: savedUser.role,
    });

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

exports.deleteUser = async (req, res) => {
  const { userId } = req.params;

  try {
    const deletedUser = await User.findOneAndDelete({ userId });

    if (!deletedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res
      .status(200)
      .json({ message: "User deleted successfully", user: deletedUser });
  } catch (error) {
    res.status(500).json({
      message: "An error occurred while deleting the user",
      error: error.message,
    });
  }
};
