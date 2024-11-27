const { deleteFile, uploadFile } = require("../middlewares/cloudinary");
const generateCustomId = require("../middlewares/generateCustomId");
const fs = require("fs");
const Direction = require("../models/Direction");

exports.addDirection = async (req, res) => {
  try {
    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).send("No files were uploaded.");
    }
    const directionId = await generateCustomId(
      Direction,
      "directionId",
      "directionId"
    );
    let uploadedFile = req.files.file;

    const uploadResult = await uploadFile(
      uploadedFile.tempFilePath,
      uploadedFile.mimetype
    );
    const directionDetails = new Direction({
      directionId,
      title: req.body.title,
      file: uploadResult.secure_url,
      publicId: uploadResult.public_id,
    });
    const newDirection = await directionDetails.save();
    fs.unlink(uploadedFile.tempFilePath, (err) => {
      if (err) {
        console.error("Failed to delete temporary file:", err);
      }
    });
    return res.status(200).json(newDirection);
  } catch (error) {
    console.error(error.message);
    return res.status(500).send("Internal Server Error");
  }
};

exports.getDirection = async (req, res) => {
  try {
    const result = await Direction.find().sort({ createdAt: -1 });
    res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching Direction:", error);
    res.status(500).json({
      message: "Error fetching Direction",
      error: error.message,
    });
  }
};

exports.deleteDirection = async (req, res) => {
  try {
    const requestedDirection = await Direction.findOne({
      directionId: req.params.id,
    });

    if (!requestedDirection) {
      return res
        .status(400)
        .json({ message: "Direction not found", success: false });
    }

    const deleteResult = await deleteFile(requestedDirection.publicId);
    if (deleteResult.result !== "ok") {
      return res.status(500).json({
        message: "Error deleting the file from Cloudinary",
        error: deleteResult,
      });
    }

    await Direction.findOneAndDelete({ directionId: req.params.id });

    return res
      .status(200)
      .json({ message: "Direction deleted successfully", success: true });
  } catch (error) {
    console.error("Error deleting direction:", error.message);
    return res
      .status(500)
      .json({ message: "Internal Server Error", success: false });
  }
};
