const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Subschema definitions
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
      secure_url: { type: String },
      public_id: { type: String },
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
    latestFollowupdate: { type: Date, default: null },
  },
  {
    timestamps: true,
  }
);

// Middleware to calculate totalPayment in patientTcCard
patientTcCardSchema.pre("save", function (next) {
  if (
    this.patientTcworkTypeDetails &&
    Array.isArray(this.patientTcworkTypeDetails)
  ) {
    this.totalPayment = this.patientTcworkTypeDetails.reduce((sum, detail) => {
      const amount = parseFloat(detail.tcamount) || 0;
      return sum + amount;
    }, 0);
  } else {
    this.totalPayment = 0;
  }
  next();
});

// Middleware to set latestFollowupdate in patientSchema

patientSchema.pre("save", function (next) {
  if (this.patientTcCard && Array.isArray(this.patientTcCard)) {
    const allAppointments = this.patientTcCard
      .flatMap((card) => card.patientTcCardDetails)
      .map((detail) => detail.nextAppointment)
      .filter((date) => date);

    if (allAppointments.length > 0) {
      const latestAppointment = allAppointments.reduce((latest, date) => {
        return new Date(date) > new Date(latest) ? date : latest;
      }, allAppointments[0]);

      this.latestFollowupdate = new Date(latestAppointment);
    } else {
      this.latestFollowupdate = null; // Set as null if no dates are found
    }
  }
  next();
});

patientSchema.pre("findOneAndUpdate", async function (next) {
  const docToUpdate = await this.model.findOne(this.getQuery());
  if (docToUpdate.patientTcCard && Array.isArray(docToUpdate.patientTcCard)) {
    const allAppointments = docToUpdate.patientTcCard
      .flatMap((card) => card.patientTcCardDetails)
      .map((detail) => detail.nextAppointment)
      .filter((date) => date);

    if (allAppointments.length > 0) {
      const latestAppointment = allAppointments.reduce((latest, date) => {
        return new Date(date) > new Date(latest) ? date : latest;
      }, allAppointments[0]);

      this.set({ latestFollowupdate: new Date(latestAppointment) });
    } else {
      this.set({ latestFollowupdate: null });
    }
  }
  next();
});

// Index for efficient querying
patientSchema.index({ createdAt: -1, patientId: 1 });

module.exports = mongoose.model("Patients", patientSchema);
