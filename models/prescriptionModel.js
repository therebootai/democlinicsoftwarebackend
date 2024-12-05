const mongoose = require("mongoose");
const Schema = mongoose.Schema;

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
    prescriptionPdf: {
      secure_url: {
        type: String,
      },
      public_id: {
        type: String,
      },
    },
  },
  {
    timestamps: true,
  }
);

prescriptionSchema.pre("save", async function (next) {
  const prescription = this;

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

module.exports = mongoose.model("Prescriptions", prescriptionSchema);
