// controllers/userController.js
const User = require("../models/User");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");
const { uploadFile, deleteFile } = require("../middlewares/cloudinary");

const generateCustomId = require("../middlewares/generateCustomId");
const { generateToken, verifyToken } = require("../middlewares/jsontoken");
const Clinic = require("../models/Clinic");
const { default: axios } = require("axios");

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
  const {
    name,
    email,
    phone,
    password,
    role,
    designation,
    doctorDegree,
    clinicId,
  } = req.body;

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

  if (role != "super_admin" && !clinicId) {
    return res
      .status(400)
      .json({ message: `ClinicId is required for role ${role}` });
  }

  try {
    // Check if the user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already in use" });
    }
    let clinics;
    if (clinicId && Array.isArray(clinicId)) {
      // Find all clinics with IDs in the clinicId array
      clinics = await Clinic.find({ _id: { $in: clinicId } });
    }

    // Check if any clinics were not found
    if (clinicId && (!clinics || clinics.length !== clinicId.length)) {
      return res.status(404).json({ message: "One or more clinics not found" });
    }

    const userId = await generateCustomId(User, "userId", idPrefix);

    let doctorSignature = {};
    if (req.files?.doctorSignature) {
      const tempFilePath = req.files.doctorSignature.tempFilePath;
      const uploadResult = await uploadFile(
        tempFilePath,
        req.files.doctorSignature.mimetype
      );

      if (uploadResult.secure_url && uploadResult.public_id) {
        doctorSignature = {
          secure_url: uploadResult.secure_url,
          public_id: uploadResult.public_id,
        };
      } else {
        return res
          .status(500)
          .json({ message: "Failed to upload doctor's signature" });
      }
    }

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
      doctorSignature,
      clinicId,
    });
    const savedUser = await newUser.save();

    // Generate JWT token
    const token = generateToken({
      userId: savedUser.userId,
      email: savedUser.email,
      role: savedUser.role,
      clinics,
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
    })
      .populate("clinicId")
      .exec();

    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Role-based access validation
    if (
      (role === "staff" && user.designation !== "Staff") ||
      (role === "doctor" && user.designation !== "Doctor") ||
      (role === "super_admin" && user.role !== "super_admin")
    ) {
      return res.status(403).json({ message: "Unauthorized role selection" });
    }

    const token = generateToken({ ...user });

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

exports.getUserByToken = async (req, res) => {
  try {
    const token = req.headers.authorization.split(" ")[1];
    const decodedToken = verifyToken(token);
    if (!decodedToken) {
      return res.status(404).json({ message: "Invalid token" });
    }
    res.status(200).json(decodedToken._doc);
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
};

exports.updateUser = async (req, res) => {
  const { userId } = req.params; // Extract userId from request parameters
  const {
    name,
    email,
    phone,
    password,
    role,
    designation,
    doctorDegree,
    clinicId,
  } = req.body;

  try {
    // Find the user by userId
    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update the fields if they are provided in the request body
    if (name) user.name = name;
    if (email) user.email = email;
    if (phone) user.phone = phone;
    if (password) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
    }
    if (role) user.role = role;
    if (designation) user.designation = designation;
    if (doctorDegree) user.doctorDegree = doctorDegree;
    if (clinicId) {
      if (Array.isArray(clinicId)) {
        const clinics = await Clinic.find({ _id: { $in: clinicId } });
        if (clinics.length !== clinicId.length) {
          return res
            .status(404)
            .json({ message: "One or more clinics not found" });
        }
        user.clinicId = clinicId;
      } else {
        return res.status(400).json({ message: "clinicId must be an array" });
      }
    }

    // Handle doctorSignature file upload
    if (req.files?.doctorSignature) {
      // Delete the existing signature from Cloudinary if it exists
      if (user.doctorSignature?.public_id) {
        await deleteFile(user.doctorSignature.public_id);
      }

      const tempFilePath = req.files.doctorSignature.tempFilePath;
      const uploadResult = await uploadFile(
        tempFilePath,
        req.files.doctorSignature.mimetype
      );

      if (uploadResult.secure_url && uploadResult.public_id) {
        user.doctorSignature = {
          secure_url: uploadResult.secure_url,
          public_id: uploadResult.public_id,
        };
      } else {
        return res
          .status(500)
          .json({ message: "Failed to upload doctor's signature" });
      }
    }

    // Save the updated user
    const updatedUser = await user.save();

    res
      .status(200)
      .json({ message: "User updated successfully", user: updatedUser });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getUserByPhone = async (req, res) => {
  try {
    const { phone } = req.query;

    if (!phone) {
      return res.status(400).json({ message: "Phone number is required." });
    }

    const user = await User.findOne({ phone });

    if (user) {
      return res.json({ exists: true, message: "Phone number found." });
    } else {
      return res.json({ exists: false, message: "Phone number not found." });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const otpStorage = {};
exports.sendOtp = async (req, res) => {
  try {
    let { phone, name } = req.body;

    if (!phone) {
      return res.status(400).json({ message: "Phone number is required" });
    }

    const formattedPhone = phone.startsWith("91") ? phone : "91" + phone;

    if (!name) {
      const user = await User.findOne({ phone: phone });
      if (user) {
        name = user.name;
      } else {
        name = "User";
      }
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    otpStorage[formattedPhone] = {
      otp: otpCode,
      expiresAt: Date.now() + 5 * 60 * 1000,
    };

    const payload = {
      "auth-key": "aa61059c453fd7b25e02a9dec860e9c4e23834a61d1d26de4b",
      "app-key": "0f71de7c-53dc-4793-9469-96356a6a2e4a",
      destination_number: formattedPhone,
      template_id: "554597174279371",
      device_id: "67599f6c1c50a6c971f41728",
      language: "en",
      variables: [name.toString(), otpCode.toString()],
    };

    const response = await axios.post(
      "https://web.wabridge.com/api/createmessage",
      payload
    );

    if (response.data.status === true) {
      return res.json({ success: true, message: "OTP sent successfully" });
    } else {
      return res
        .status(500)
        .json({ success: false, message: "Failed to send OTP" });
    }
  } catch (error) {
    console.error("Error sending OTP:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.verifyWithOtp = async (req, res) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res
        .status(400)
        .json({ message: "Phone number and OTP are required" });
    }

    const formattedPhone = phone.startsWith("91") ? phone : "91" + phone;

    if (
      otpStorage[formattedPhone] &&
      otpStorage[formattedPhone].otp === otp &&
      otpStorage[formattedPhone].expiresAt > Date.now()
    ) {
      const user = await User.findOne({ phone: phone });
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const token = generateToken({ ...user });
      delete otpStorage[formattedPhone];

      return res
        .status(200)
        .json({ success: true, user, token, name: user.name });
    } else {
      return res
        .status(400)
        .json({ success: false, message: "Invalid or expired OTP" });
    }
  } catch (error) {
    console.error("Error verifying OTP for login:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
