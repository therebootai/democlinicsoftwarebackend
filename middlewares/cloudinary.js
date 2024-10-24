const cloudinary = require("cloudinary").v2;
const fs = require("fs");
require("dotenv").config();

cloudinary.config({
  cloud_name: "djbdxrx6g",
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

exports.uploadFile = async (tempFilePath) => {
  try {
    let resourceType = "image";
    let folderName = "images";
    if (tempFilePath.endsWith(".pdf")) {
      resourceType = "raw";
      folderName = "pdf";
    }
    cloudinary.uploader.upload(
      tempFilePath,
      {
        folder: "dentity-dental/" + folderName,
        resource_type: resourceType,
      },
      async (err, result) => {
        if (err) {
          return err;
        }
        return result;
      }
    );
  } catch (error) {
    console.error("Error creating gallery:", error);
    return error;
  }
};

exports.deleteFile = async (folderName, publicId) => {
  cloudinary.uploader.destroy(
    `dentity-dental/${folderName}/${publicId}`,
    async (err, result) => {
      if (err) {
        console.error("Error deleting image from Cloudinary", err);
        return err;
      }
      return result;
    }
  );
};
