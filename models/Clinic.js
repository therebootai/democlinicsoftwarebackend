const mongoose = require("mongoose");

const clinicScheama = new mongoose.Schema({
  clinicId: {
    type: String,
    required: true,
  },
  clinic_name: {
    type: String,
    required: true,
    unique: true,
  },
  clinic_address: {
    type: String,
    required: true,
  },
});

const Clinic = mongoose.model("Clinics", clinicScheama);

module.exports = Clinic;
