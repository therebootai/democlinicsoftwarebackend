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
    const uploadResult = await uploadFile(uploadedFile.tempFilePath);
    const directionDetails = new Direction({
      directionId,
      title: req.body.title,
      file: uploadResult.secure_url,
    });
    const newDirection = await directionDetails.save();
    fs.unlink(uploadedFile.tempFilePath, (err) => {
      if (err) {
        console.error("Failed to delete temporary file:", err);
      } else {
        console.log("Temporary file deleted successfully");
      }
    });
    return res.status(200).json(newDirection);
  } catch (error) {
    console.error(error.message);
    return res.status(500).send("Internal Server Error");
  }
};

exports.deleteDirection = async (req, res) => {
  try {
    const requestedDirection = await Direction.findById(req.params.id);
    let folderName = "images";
    if (requestedDirection.file.endsWith(".pdf")) {
      folderName = "pdf";
    }
    const deleteResult = await deleteFile(folderName, requestedForm.file);
    await Direction.findByIdAndDelete(req.params.id);
    return res
      .status(200)
      .json({ message: "Direction deleted successfully", success: true });
  } catch (error) {
    console.error(error.message);
    return res.status(500).send("Internal Server Error");
  }
};
