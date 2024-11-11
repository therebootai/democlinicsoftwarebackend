const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const patientMedicalHistorySchema = new Schema({
  patientMedicalHistoryName: { type: String },
  patientMedicalHistoryMedicine: [String],
});

module.exports = mongoose.model(
  "patientMedicalHistory",
  patientMedicalHistorySchema
);
