const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const oralFindingSchema = new Schema({
  oralFindingId: { type: String },
  oralFindingName: { type: String },
  oralFindingArea: [String],
  oralFindingAdditionalNotes: { type: String },
});

const dentalProcedureSchema = new Schema({
  dentalProcedureId: { type: String },
  dentalProcedureRCTName: { type: String },
  dentalProcedureRCTArea: [String],
  dentalProcedureRCTAdditionalNotes: { type: String },
});

const vitalsSchema = new Schema({
  vitalsId: { type: String },
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
  medicalHistoryId: { type: String },
  medicalHistoryName: { type: String },
  medicalHistoryduration: { type: String },
});

const symptomSchema = new Schema({
  symptomId: { type: String },
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
  diagnosisId: { type: String },
  diagnosisName: { type: String },
  diagnosisNameText: { type: String },
  diagnosisDuration: { type: String },
  diagnosisDurationText: { type: String },
  diagnosisStatus: { type: String },
  diagnosisStatusText: { type: String },
});

const medicationsSchema = new Schema({
  medicationId: { type: String },
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
  referDoctorId: { type: String },
  referDoctor: { type: String },
});

// Main prescription schema
const prescriptionSchema = new Schema({
  prescriptionId: { type: String },
  oralFinding: [oralFindingSchema],
  dentalProcedure: [dentalProcedureSchema],
  vitals: [vitalsSchema],
  medicalHistory: [medicalHistorySchema],
  symptoms: [symptomSchema],
  diagnosis: [diagnosisSchema],
  medications: [medicationsSchema],
  referDoctor: [referDoctorSchema],
  prescriptionGenerateDate: { type: Date, default: Date.now },
});

prescriptionSchema.pre("save", function (next) {
  const prescriptionGenerateDate = this.prescriptionGenerateDate;
  const formattedDate = prescriptionGenerateDate.toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  this.prescriptionGenerateDate = formattedDate;
  next();
});

async function assignSequentialIds(model, subdocumentArray, idField, prefix) {
  let currentMaxId = 1;

  const latestEntry = await model
    .findOne({ [`${idField}`]: { $regex: `^${prefix}` } })
    .sort({ [idField]: -1 })
    .exec();

  if (latestEntry && latestEntry[idField]) {
    const latestIdNumber = parseInt(
      latestEntry[idField].replace(prefix, ""),
      10
    );
    currentMaxId = latestIdNumber + 1;
  }

  for (const entry of subdocumentArray) {
    if (!entry[idField]) {
      entry[idField] = `${prefix}${String(currentMaxId).padStart(4, "0")}`;
      currentMaxId += 1;
    }
  }
}

prescriptionSchema.pre("save", async function (next) {
  const prescription = this;

  if (!prescription.prescriptionId) {
    const PrescriptionModel = mongoose.model("Prescriptions");
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

  await assignSequentialIds(
    mongoose.model("Prescriptions"),
    prescription.oralFinding,
    "oralFindingId",
    "OF"
  );
  await assignSequentialIds(
    mongoose.model("Prescriptions"),
    prescription.dentalProcedure,
    "dentalProcedureId",
    "DP"
  );
  await assignSequentialIds(
    mongoose.model("Prescriptions"),
    prescription.vitals,
    "vitalsId",
    "VIT"
  );
  await assignSequentialIds(
    mongoose.model("Prescriptions"),
    prescription.medicalHistory,
    "medicalHistoryId",
    "MH"
  );
  await assignSequentialIds(
    mongoose.model("Prescriptions"),
    prescription.symptoms,
    "symptomId",
    "SYM"
  );
  await assignSequentialIds(
    mongoose.model("Prescriptions"),
    prescription.diagnosis,
    "diagnosisId",
    "DIA"
  );
  await assignSequentialIds(
    mongoose.model("Prescriptions"),
    prescription.medications,
    "medicationId",
    "MED"
  );
  await assignSequentialIds(
    mongoose.model("Prescriptions"),
    prescription.referDoctor,
    "referDoctorId",
    "RD"
  );

  next();
});

module.exports = mongoose.model("Prescriptions", prescriptionSchema);
