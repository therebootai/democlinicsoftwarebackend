const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const medicationsSchema = new Schema(
  {
    medicineId: { type: String, required: true, unique: true },
    medicineBrandName: { type: String },
    medicineComposition: { type: String },
    medicineStrength: { type: String },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Medications", medicationsSchema);
