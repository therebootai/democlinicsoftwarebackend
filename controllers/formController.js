const { uploadFile, deleteFile } = require("../middlewares/cloudinary");
const generateCustomId = require("../middlewares/generateCustomId");
const fs = require("fs");
const Form = require("../models/Form");

exports.addForm = async (req, res) => {
  try {
    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).send("No files were uploaded.");
    }
    const formId = await generateCustomId(Form, "formId", "formId");
    let uploadedFile = req.files.file;
    const uploadResult = await uploadFile(
      uploadedFile.tempFilePath,
      uploadedFile.mimetype
    );
    const formDetails = new Form({
      formId,
      title: req.body.title,
      file: uploadResult.secure_url,
      publicId: uploadResult.public_id,
    });
    const newForm = await formDetails.save();
    fs.unlink(uploadedFile.tempFilePath, (err) => {
      if (err) {
        console.error("Failed to delete temporary file:", err);
      } else {
        console.log("Temporary file deleted successfully");
      }
    });
    return res.status(200).json(newForm);
  } catch (error) {
    console.error(error.message);
    return res.status(500).send("Internal Server Error");
  }
};

exports.getForms = async (req, res) => {
  try {
    const result = await Form.find();
    res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching Form:", error);
    res.status(500).json({
      message: "Error fetching Form",
      error: error.message,
    });
  }
};

exports.deleteForm = async (req, res) => {
  try {
    const requestedForm = await Form.findById(req.params.id);

    const deleteResult = await deleteFile(requestedForm.publicId);
    if (deleteResult.result != "ok") {
      return res
        .status(400)
        .json({ message: "file deletation failed", success: false });
    }
    await Form.findByIdAndDelete(req.params.id);
    return res
      .status(200)
      .json({ message: "file deleted successfully", success: true });
  } catch (error) {
    console.error(error.message);
    return res.status(500).send("Internal Server Error");
  }
};
