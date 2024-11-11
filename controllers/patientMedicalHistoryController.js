const PatientMedicalHistory = require("../models/patientMedicalHistoryModel");

// Create a new patient medical history entry
exports.createPatientMedicalHistory = async (req, res) => {
  try {
    const { patientMedicalHistoryName, patientMedicalHistoryMedicine } =
      req.body;

    const newMedicalHistory = new PatientMedicalHistory({
      patientMedicalHistoryName,
      patientMedicalHistoryMedicine, // Include the array of medicines
    });

    await newMedicalHistory.save();

    res.status(201).json({
      message: "Patient Medical History Created Successfully",
      data: newMedicalHistory,
    });
  } catch (error) {
    console.error("Error creating patient medical history:", error);
    res.status(500).json({
      message: "Error creating patient medical history",
      error: error.message,
    });
  }
};

// Get all patient medical history entries
exports.getAllPatientMedicalHistory = async (req, res) => {
  try {
    const result = await PatientMedicalHistory.find();

    res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching patient medical history:", error);
    res.status(500).json({
      message: "Error fetching patient medical history",
      error: error.message,
    });
  }
};

// Get patient medical history by name (for dropdown or search)
exports.getPatientMedicalHistoryByName = async (req, res) => {
  try {
    const searchQuery = req.query.query;

    if (!searchQuery) {
      return res.status(400).json({ message: "Query parameter is required" });
    }

    const fuzzyRegex = new RegExp(searchQuery.split("").join(".*"), "i");

    const items = await PatientMedicalHistory.find({
      patientMedicalHistoryName: fuzzyRegex,
    }).limit(30);

    res.status(200).json(items);
  } catch (error) {
    console.error("Error searching patient medical history:", error);
    res.status(500).json({
      message: "Error searching patient medical history",
      error: error.message,
    });
  }
};
exports.getMedicinesByHistoryName = async (req, res) => {
  try {
    const { patientMedicalHistoryName, search } = req.query;

    if (!patientMedicalHistoryName) {
      return res
        .status(400)
        .json({ message: "Medical history name is required" });
    }

    const history = await PatientMedicalHistory.findOne({
      patientMedicalHistoryName,
    });

    if (!history) {
      return res.status(404).json({ message: "Medical history not found" });
    }

    let medicines = history.patientMedicalHistoryMedicine;

    // Apply search filter if `search` query parameter is provided
    if (search) {
      medicines = medicines.filter((medicine) =>
        medicine.toLowerCase().includes(search.toLowerCase())
      );
    }

    res.status(200).json({
      medicines: medicines.slice(0, 7), // Limit to 7 suggestions
    });
  } catch (error) {
    console.error("Error fetching medicines by history name:", error);
    res.status(500).json({
      message: "Error fetching medicines",
      error: error.message,
    });
  }
};

exports.getPatientMedicalHistoryRandomSuggestions = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 10;

    const randomItems = await PatientMedicalHistory.aggregate([
      { $sample: { size: limit } },
    ]);

    res.status(200).json(randomItems);
  } catch (error) {
    console.error("Error fetching random suggestions:", error);
    res.status(500).json({
      message: "Error fetching random suggestions",
      error: error.message,
    });
  }
};

// Update patient medical history by name
exports.updatePatientMedicalHistory = async (req, res) => {
  try {
    const { patientMedicalHistoryName } = req.params;
    const { newName, patientMedicalHistoryMedicine } = req.body;

    // Fetch the existing record to append new medicines to the existing list
    const existingHistory = await PatientMedicalHistory.findOne({
      patientMedicalHistoryName,
    });

    if (!existingHistory) {
      return res.status(404).json({ message: "Medical history not found" });
    }

    // Append only new medicines to the existing ones
    const updatedMedicines = [
      ...new Set([
        ...existingHistory.patientMedicalHistoryMedicine,
        ...patientMedicalHistoryMedicine,
      ]),
    ];

    // Update fields
    const updateFields = {};
    if (newName) updateFields.patientMedicalHistoryName = newName;
    updateFields.patientMedicalHistoryMedicine = updatedMedicines;

    const updatedHistory = await PatientMedicalHistory.findOneAndUpdate(
      { patientMedicalHistoryName },
      { $set: updateFields },
      { new: true }
    );

    res.status(200).json({
      message: "Patient Medical History Updated Successfully",
      data: updatedHistory,
    });
  } catch (error) {
    console.error("Error updating patient medical history:", error);
    res.status(500).json({
      message: "Error updating patient medical history",
      error: error.message,
    });
  }
};

// Delete patient medical history by name
exports.deletePatientMedicalHistory = async (req, res) => {
  try {
    const { patientMedicalHistoryName } = req.params;

    const deletedHistory = await PatientMedicalHistory.findOneAndDelete({
      patientMedicalHistoryName,
    });

    if (!deletedHistory) {
      return res.status(404).json({ message: "Medical history not found" });
    }

    res.status(200).json({
      message: "Patient Medical History Deleted Successfully",
      data: deletedHistory,
    });
  } catch (error) {
    console.error("Error deleting patient medical history:", error);
    res.status(500).json({
      message: "Error deleting patient medical history",
      error: error.message,
    });
  }
};
