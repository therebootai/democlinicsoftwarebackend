const Medications = require("../models/medicationsModel");

// Create new medication
exports.createMedication = async (req, res) => {
  try {
    const { medicineBrandName, medicineComposition, medicineStrength } =
      req.body;

    if (!medicineBrandName) {
      return res
        .status(400)
        .json({ message: "medicineBrandName are required" });
    }

    const newMedication = new Medications({
      medicineBrandName,
      medicineComposition,
      medicineStrength,
    });
    await newMedication.save();

    res.status(201).json({
      message: "Medication created successfully",
      data: newMedication,
    });
  } catch (error) {
    console.error("Error creating medication:", error);
    res.status(500).json({
      message: "Error creating medication",
      error: error.message,
    });
  }
};

// Get all medications
exports.getAllMedications = async (req, res) => {
  try {
    const medications = await Medications.find();
    res.status(200).json(medications);
  } catch (error) {
    console.error("Error fetching medications:", error);
    res.status(500).json({
      message: "Error fetching medications",
      error: error.message,
    });
  }
};

// Get medication suggestions based on query
exports.getMedicationSuggestions = async (req, res) => {
  try {
    const searchQuery = req.query.query;
    if (!searchQuery) {
      return res.status(400).json({ message: "Query parameter is required" });
    }

    const fuzzyRegex = new RegExp(searchQuery.split("").join(".*"), "i");
    const suggestions = await Medications.find({
      $or: [
        { medicineBrandName: fuzzyRegex },
        { medicineComposition: fuzzyRegex },
      ],
    }).limit(30);

    res.status(200).json(suggestions);
  } catch (error) {
    console.error("Error fetching suggestions:", error);
    res.status(500).json({
      message: "Error fetching suggestions",
      error: error.message,
    });
  }
};

// Get random medication suggestions
exports.getRandomMedicationSuggestions = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 10;
    const randomMedications = await Medications.aggregate([
      { $sample: { size: limit } },
    ]);

    res.status(200).json(randomMedications);
  } catch (error) {
    console.error("Error fetching random suggestions:", error);
    res.status(500).json({
      message: "Error fetching random suggestions",
      error: error.message,
    });
  }
};

// Delete a medication by medicineBrandName
exports.deleteMedication = async (req, res) => {
  try {
    const { medicineBrandName } = req.params;

    if (!medicineBrandName) {
      return res
        .status(400)
        .json({ message: "Medicine brand name is required" });
    }

    const result = await Medications.findOneAndDelete({ medicineBrandName });

    if (result) {
      res.status(200).json({
        message: "Medication deleted successfully",
        data: result,
      });
    } else {
      res.status(404).json({
        message: "Medication not found",
      });
    }
  } catch (error) {
    console.error("Error deleting medication:", error);
    res.status(500).json({
      message: "Error deleting medication",
      error: error.message,
    });
  }
};
