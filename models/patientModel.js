const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const moment = require("moment-timezone");

const patientDocumentSchema = new Schema({
  documentId: { type: String },
  documentTitle: { type: String },
  publicId: { type: String },
  documentFile: { type: String },
});

const paymentDetailsSchema = new Schema(
  {
    iteamName: { type: String },
    iteamCharges: { type: String },
    paymentDescription: { type: String },
  },
  {
    timestamps: true,
  }
);
const paymentSchema = new Schema({
  paymentId: { type: String },
  paymentDetails: [paymentDetailsSchema],
  paymentMethod: { type: String },
  totalCharges: { type: String },
});

const medicalHistorySchema = new Schema({
  medicalHistoryName: { type: String },
  duration: { type: String },
  medicalHistoryMedicine: [String],
});

const patientSchema = new Schema(
  {
    patientId: {
      type: String,
      unique: true,
      required: true,
    },
    patientName: { type: String, required: true },
    mobileNumber: { type: String, required: true, unique: true },
    gender: { type: String, required: true },
    age: { type: Number, required: true },
    location: { type: String, required: true },
    chooseDoctor: { type: String },
    address: { type: String },
    city: { type: String },
    pinCode: { type: String },
    priority: { type: String },
    paymentMethod: { type: String },
    prescriptions: [{ type: Schema.Types.ObjectId, ref: "Prescriptions" }],
    patientDocuments: [patientDocumentSchema],
    medicalHistory: [medicalHistorySchema],
    paymentDetails: [paymentSchema],
    appointmentdate: { type: Date, default: Date.now },
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
  },
  {
    timestamps: true,
  }
);

paymentDetailsSchema.pre("save", function (next) {
  const paymentCreateDate = this.paymentCreateDate;
  const formattedDate = paymentCreateDate.toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  this.paymentCreateDate = formattedDate;
  next();
});

patientSchema.index({ appointmentdate: -1, patientId: 1 });

module.exports = mongoose.model("Patients", patientSchema);
