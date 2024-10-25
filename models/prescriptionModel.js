const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const generateCustomId = require("../middlewares/generateCustomId"); // Import custom ID generator

// Define the schemas for each subdocument with a custom ID field
const oralFindingSchema = new Schema({
  oralFindingId: { type: String }, // Custom ID field
  oralFindingName: { type: String },
  oralFindingArea: [String],
  oralFindingAdditionalNotes: { type: String },
});

const dentalProcedureSchema = new Schema({
  dentalProcedureId: { type: String }, // Custom ID field
  dentalProcedureRCTName: { type: String },
  dentalProcedureRCTArea: [String],
  dentalProcedureRCTAdditionalNotes: { type: String },
});

const vitalsSchema = new Schema({
  vitalsId: { type: String }, // Custom ID field
  pulseRate: { type: String },
  bloodPressure: { type: String },
  bloodTemperature: { type: String },
  respiratoryRate: { type: String },
  bodyWidth: { type: String },
  bodyHeight: { type: String },
  systolicBloodPressure: { type: String },
  diastolicBloodPressure: { type: String },
  Hemoglobin: { type: String },
  bloodSugarRandom: { type: String },
  bloodSugarFasting: { type: String },
  bloodSugarPP: { type: String },
});

const medicalHistorySchema = new Schema({
  medicalHistoryId: { type: String }, // Custom ID field
  medicalHistoryName: { type: String },
  medicalHistoryduration: { type: String },
});

const symptomSchema = new Schema({
  symptomId: { type: String }, // Custom ID field
  symptomsName: { type: String },
  symptomsNameText: { type: String },
  symptomsDuration: { type: String },
  symptomsDurationText: { type: String },
  symptomsSeverity: { type: String },
  symptomsSeverityText: { type: String },
  symptomsMore: { type: String },
  symptomsMoreText: { type: String },
});

const diagnosisSchema = new Schema({
  diagnosisId: { type: String }, // Custom ID field
  diagnosisName: { type: String },
  diagnosisNameText: { type: String },
  diagnosisDuration: { type: String },
  diagnosisDurationText: { type: String },
  diagnosisStatus: { type: String },
  diagnosisStatusText: { type: String },
});

const medicationsSchema = new Schema({
  medicationId: { type: String }, // Custom ID field
  medicineName: { type: String },
  medicineDose: { type: String },
  medicineFrequency: { type: String },
  medicineTiming: { type: String },
  medicineDuration: { type: String },
  medicineStartfrom: { type: String },
  medicineInstructions: { type: String },
  medicineQuantity: { type: String },
});

const referDoctorSchema = new Schema({
  referDoctorId: { type: String }, // Custom ID field
  referDoctor: { type: String },
});

// Main prescription schema
const prescriptionSchema = new Schema({
  prescriptionId: { type: String }, // Custom ID for the prescription itself
  oralFinding: [oralFindingSchema],
  dentalProcedure: [dentalProcedureSchema],
  vitals: [vitalsSchema],
  medicalHistory: [medicalHistorySchema],
  symptoms: [symptomSchema],
  diagnosis: [diagnosisSchema],
  medications: [medicationsSchema],
  referDoctor: [referDoctorSchema],
});

// Pre-save hook to generate custom IDs for new items in array fields
prescriptionSchema.pre("save", async function (next) {
  const prescription = this;

  // Generate custom ID for the main prescription if not already set
  if (!prescription.prescriptionId) {
    prescription.prescriptionId = await generateCustomId(
      mongoose.model("Prescriptions"),
      "prescriptionId",
      "PRES"
    );
  }

  // Generate unique IDs for each subdocument array only if the ID is missing

  for (const oralFinding of prescription.oralFinding) {
    if (!oralFinding.oralFindingId) {
      oralFinding.oralFindingId = await generateCustomId(
        mongoose.model("Prescriptions"),
        "oralFindingId",
        "OF"
      );
    }
  }

  for (const dentalProcedure of prescription.dentalProcedure) {
    if (!dentalProcedure.dentalProcedureId) {
      dentalProcedure.dentalProcedureId = await generateCustomId(
        mongoose.model("Prescriptions"),
        "dentalProcedureId",
        "DP"
      );
    }
  }

  for (const vitals of prescription.vitals) {
    if (!vitals.vitalsId) {
      vitals.vitalsId = await generateCustomId(
        mongoose.model("Prescriptions"),
        "vitalsId",
        "VIT"
      );
    }
  }

  for (const medicalHistory of prescription.medicalHistory) {
    if (!medicalHistory.medicalHistoryId) {
      medicalHistory.medicalHistoryId = await generateCustomId(
        mongoose.model("Prescriptions"),
        "medicalHistoryId",
        "MH"
      );
    }
  }

  for (const symptom of prescription.symptoms) {
    if (!symptom.symptomId) {
      symptom.symptomId = await generateCustomId(
        mongoose.model("Prescriptions"),
        "symptomId",
        "SYM"
      );
    }
  }

  for (const diagnosis of prescription.diagnosis) {
    if (!diagnosis.diagnosisId) {
      diagnosis.diagnosisId = await generateCustomId(
        mongoose.model("Prescriptions"),
        "diagnosisId",
        "DIA"
      );
    }
  }

  for (const medication of prescription.medications) {
    if (!medication.medicationId) {
      medication.medicationId = await generateCustomId(
        mongoose.model("Prescriptions"),
        "medicationId",
        "MED"
      );
    }
  }

  for (const referDoctor of prescription.referDoctor) {
    if (!referDoctor.referDoctorId) {
      referDoctor.referDoctorId = await generateCustomId(
        mongoose.model("Prescriptions"),
        "referDoctorId",
        "RD"
      );
    }
  }

  next(); // Call next() to proceed with the save operation
});

// Export the model
module.exports = mongoose.model("Prescriptions", prescriptionSchema);
