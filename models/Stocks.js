const mongoose = require("mongoose");

const stockSchema = new mongoose.Schema(
  {
    stockId: { type: String, required: true, unique: true },
    stockProductName: { type: String, required: true },
    stockQuantity: { type: Number, required: true },
    clinicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Clinics",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const Stock = mongoose.models.Stocks || mongoose.model("Stocks", stockSchema);

module.exports = Stock;
