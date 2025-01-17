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
const paymentSchema = new Schema(
  {
    paymentId: { type: String },
    paymentDetails: [paymentDetailsSchema],
    paymentMethod: { type: String },
    totalCharges: { type: String },
    totalPaid: { type: String },
    anyDue: { type: String },
  },
  {
    timestamps: true,
  }
);

const medicalHistorySchema = new Schema({
  medicalHistoryName: { type: String },
  duration: { type: String },
  medicalHistoryMedicine: [String],
});

const PatientTcworkTypeDetailsSchema = new Schema({
  typeOfWork: { type: String },
  tcamount: { type: String },
  dentalChart: [String],
});

const patientTcCardDetailsSchema = new Schema(
  {
    stepDone: { type: String },
    nextAppointment: { type: String },
    nextStep: { type: String },
    payment: { type: String },
    due: { type: String },
    paymentMethod: { type: String },
    comment: { type: String },
  },
  { timestamps: true }
);

const patientTcCardSchema = new Schema(
  {
    tcCardId: { type: String },
    patientTcworkTypeDetails: [PatientTcworkTypeDetailsSchema],
    patientTcCardDetails: [patientTcCardDetailsSchema],
    totalPayment: { type: String },
    tccardPdf: {
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
    clinicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Clinics",
      required: true,
    },
    patientTcCard: [patientTcCardSchema],
    latestFollowupdate: { type: String },
  },
  {
    timestamps: true,
  }
);

patientTcCardSchema.pre("save", function (next) {
  if (
    this.patientTcworkTypeDetails &&
    Array.isArray(this.patientTcworkTypeDetails)
  ) {
    // Calculate the total of tcamount
    this.totalPayment = this.patientTcworkTypeDetails.reduce((sum, detail) => {
      const amount = parseFloat(detail.tcamount) || 0; // Ensure tcamount is a number
      return sum + amount;
    }, 0);
  } else {
    this.totalPayment = 0; // Default to 0 if no details
  }
  next();
});

patientSchema.index({ createdAt: -1, patientId: 1 });

module.exports = mongoose.model("Patients", patientSchema);
