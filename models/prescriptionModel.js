const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const Patient = require("./patientModel");

// Define individual schemas without IDs
const chiefComplainSchema = new Schema({
  chiefComplainName: { type: String },
});

const onExaminationSchema = new Schema({
  onExaminationName: { type: String },
  onExaminationArea: [String],
  onExaminationAdditionalNotes: { type: String },
});

const investigationSchema = new Schema({
  investigationName: { type: String },
});

const radiographySchema = new Schema({
  radiographyName: { type: String },
});

const adviceSchema = new Schema({
  advicesName: { type: String },
});

const medicationsSchema = new Schema({
  medicineBrandName: { type: String },
  medicineComposition: { type: String },
  medicineStrength: { type: String },
  medicineDose: { type: String },
  medicineFrequency: { type: String },
  medicineTiming: { type: String },
  medicineDuration: { type: String },
  medicineStartfrom: { type: String },
  medicineInstructions: { type: String },
  medicineQuantity: { type: String },
});

const referDoctorSchema = new Schema({
  referDoctor: { type: String },
});

// Main prescription schema
const prescriptionSchema = new Schema(
  {
    prescriptionId: { type: String },
    chiefComplain: [chiefComplainSchema],
    onExamination: [onExaminationSchema],
    investigation: [investigationSchema],
    radiography: [radiographySchema],
    advices: [adviceSchema],
    medications: [medicationsSchema],
    referDoctor: [referDoctorSchema],
    followupdate: { type: Date },
  },
  {
    timestamps: true,
  }
);

// Pre-save hook to generate only the prescriptionId
prescriptionSchema.pre("save", async function (next) {
  const prescription = this;

  // Generate prescriptionId if it doesn't exist
  if (!prescription.prescriptionId) {
    const PrescriptionModel = mongoose.model(
      "Prescriptions",
      prescriptionSchema
    );
    const latestPrescription = await PrescriptionModel.findOne()
      .sort({ prescriptionId: -1 })
      .exec();

    const newPrescriptionId = latestPrescription
      ? parseInt(latestPrescription.prescriptionId.replace("PRES", ""), 10) + 1
      : 1;
    prescription.prescriptionId = `PRES${String(newPrescriptionId).padStart(
      4,
      "0"
    )}`;
  }

  next();
});

// Export model
module.exports = mongoose.model("Prescriptions", prescriptionSchema);
