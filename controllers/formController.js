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
    const uploadResult = await uploadFile(uploadedFile.tempFilePath);
    const formDetails = new Form({
      formId,
      title: req.body.title,
      file: uploadResult.secure_url,
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

exports.deleteForm = async (req, res) => {
  try {
    const requestedForm = await Form.findById(req.params.id);
    let folderName = "images";
    if (requestedForm.file.endsWith(".pdf")) {
      folderName = "pdf";
    }
    const deleteResult = await deleteFile(folderName, requestedForm.file);
    return res
      .status(200)
      .json({ message: "file deleted successfully", success: true });
  } catch (error) {
    console.error(error.message);
    return res.status(500).send("Internal Server Error");
  }
};
