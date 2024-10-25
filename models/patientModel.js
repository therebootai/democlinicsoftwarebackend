const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const Prescriptions = require("./prescriptionModel");

const patientSchema = new Schema({
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
  exitingDisease: { type: String },
  diabetes: { type: String },
  priority: { type: String },
  paymentMethod: { type: String },
  prescriptions: [{ type: Schema.Types.ObjectId, ref: Prescriptions }],
  appointmentdate: { type: Date, default: Date.now },
});

patientSchema.pre("save", function (next) {
  const appointmentDate = this.appointmentdate;
  const formattedDate = appointmentDate.toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  this.appointmentdate = formattedDate;
  next();
});

patientSchema.index({ createdAt: -1, patientId: 1 });

module.exports = mongoose.model("Patients", patientSchema);
