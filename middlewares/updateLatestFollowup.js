// middlewares/updateLatestFollowup.js
const mongoose = require("mongoose");

const updateLatestFollowupForPatient = async (prescription) => {
  try {
    const Prescription = mongoose.model("Prescriptions");
    const Patient = mongoose.model("Patients");

    const latestPrescription = await Prescription.findOne()
      .sort({ followupdate: -1 })
      .exec();

    if (latestPrescription && latestPrescription.followupdate) {
      const patient = await Patient.findOne({
        patientId: latestPrescription.patientId,
      });

      if (patient) {
        patient.latestFollowupdate = latestPrescription.followupdate;

        await patient.save();
        console.log("Patient's latest follow-up date updated successfully.");
      }
    }
  } catch (error) {
    console.error("Error updating the patient's latest follow-up date:", error);
  }
};

module.exports = { updateLatestFollowupForPatient };
