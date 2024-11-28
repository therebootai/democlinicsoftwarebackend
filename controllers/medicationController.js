const generateCustomId = require("../middlewares/generateCustomId");
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

    const medicineId = await generateCustomId(
      Medications,
      "medicineId",
      "medicine"
    );

    const newMedication = new Medications({
      medicineId,
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
    const { page = 1, limit = 20, medicineBrandName = "" } = req.query;

    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);

    const searchQuery = medicineBrandName
      ? { medicineBrandName: { $regex: medicineBrandName, $options: "i" } }
      : {};

    const medications = await Medications.find(searchQuery)
      .sort({ createdAt: -1 })
      .skip((pageNumber - 1) * limitNumber)
      .limit(limitNumber);

    const totalMedications = await Medications.countDocuments(searchQuery);

    res.status(200).json({
      total: totalMedications,
      page: pageNumber,
      limit: limitNumber,
      totalPages: Math.ceil(totalMedications / limitNumber),
      medications,
    });
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

// Update an existing medication
exports.updateMedication = async (req, res) => {
  try {
    const { medicineBrandName, medicineComposition, medicineStrength } =
      req.body;
    const medicineId = req.params.medicineId;

    if (!medicineBrandName || !medicineComposition || !medicineStrength) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const updatedMedication = await Medications.findOneAndUpdate(
      { medicineId: medicineId },
      {
        medicineBrandName,
        medicineComposition,
        medicineStrength,
      },
      { new: true }
    );

    if (!updatedMedication) {
      return res.status(404).json({ message: "Medication not found" });
    }

    res.status(200).json({
      message: "Medication updated successfully",
      data: updatedMedication,
    });
  } catch (error) {
    console.error("Error updating medication:", error);
    res.status(500).json({
      message: "Error updating medication",
      error: error.message,
    });
  }
};

// Delete a medication by medicineBrandName
exports.deleteMedication = async (req, res) => {
  try {
    const medicineId = req.params.medicineId;

    if (!medicineId) {
      return res.status(400).json({ message: "Medicine ID is required" });
    }

    const result = await Medications.findOneAndDelete({
      medicineId: medicineId,
    });

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
