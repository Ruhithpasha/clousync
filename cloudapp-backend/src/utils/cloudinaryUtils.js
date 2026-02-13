const cloudinary = require("../config/cloudinary");

const uploadImage = async (filePath, originalName) => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      resource_type: "auto",
      public_id: originalName.split(".")[0],
    });
    return result;
  } catch (err) {
    console.error("Cloudinary upload utility error:", err);
    throw err;
  }
};

const deleteImage = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (err) {
    console.error("Cloudinary delete utility error:", err);
    throw err;
  }
};

module.exports = { uploadImage, deleteImage };
