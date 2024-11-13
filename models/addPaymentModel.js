const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const addPaymentSchema = new Schema({
  paymentId: { type: String, unique: true, required: true },
  iteamName: { type: String, required: true },
  iteamCharges: { type: String },
  paymentCreateDate: { type: Date, default: Date.now },
  clinicId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Clinics",
    required: true,
  },
});

addPaymentSchema.pre("save", function (next) {
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

module.exports = mongoose.model("addPayments", addPaymentSchema);
