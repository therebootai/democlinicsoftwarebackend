const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const medicationsSchema = new Schema({
  medicineBrandName: { type: String },
  medicineComposition: { type: String },
  medicineStrength: { type: String },
});

module.exports = mongoose.model("Medications", medicationsSchema);
