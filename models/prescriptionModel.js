const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const oralFindingSchema = new Schema({
  oralFindingName: { type: String },
  oralFindingArea: [String],
  oralFindingAdditionalNotes: { type: String },
});
const dentalProcedureSchema = new Schema({
  dentalProcedureRCTName: { type: String },
  dentalProcedureRCTArea: [String],
  dentalProcedureRCTAdditionalNotes: { type: String },
});

const vitalsSchema = new Schema({
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
  medicalHistoryName: { type: String },
  medicalHistoryduration: { type: String },
});

const symptomSchema = new Schema({
  symptomsName: {
    type: String,
  },
  symptomsNameText: {
    type: String,
  },
  symptomsDuration: {
    type: String,
  },
  symptomsDurationText: {
    type: String,
  },
  symptomsSeverity: {
    type: String,
  },
  symptomsSeverityText: {
    type: String,
  },
  symptomsMore: {
    type: String,
  },
  symptomsMoreText: {
    type: String,
  },
});
const diagnosisSchema = new Schema({
  diagnosisName: {
    type: String,
  },
  diagnosisNameText: {
    type: String,
  },
  diagnosisDuration: {
    type: String,
  },
  diagnosisDurationText: {
    type: String,
  },

  diagnosisStatus: {
    type: String,
  },
  diagnosisStatusText: {
    type: String,
  },
});

const medicationsSchema = new Schema({
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
  referDoctor: { type: String },
});

const prescriptionSchema = new Schema({
  oralFinding: [oralFindingSchema],
  dentalProcedure: [dentalProcedureSchema],
  vitals: [vitalsSchema],
  medicalHistory: [medicalHistorySchema],
  symptoms: [symptomSchema],
  diagnosis: [diagnosisSchema],
  medications: [medicationsSchema],
  referDoctor: [referDoctorSchema],
});

module.exports = mongoose.model("Prescriptions", prescriptionSchema);
