const Radiography = require("../models/radiographyModel");

// Create a new radiography entry
exports.createRadiography = async (req, res) => {
  try {
    const { radiographyName } = req.body;

    const newRadiography = new Radiography({
      radiographyName,
    });

    await newRadiography.save();

    res.status(201).json({
      message: "Radiography entry created successfully",
      data: newRadiography,
    });
  } catch (error) {
    console.error("Error creating radiography entry:", error);
    res.status(500).json({
      message: "Error creating radiography entry",
      error: error.message,
    });
  }
};

// Get all radiography entries
exports.getRadiography = async (req, res) => {
  try {
    const result = await Radiography.find();

    res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching radiography entries:", error);
    res.status(500).json({
      message: "Error fetching radiography entries",
      error: error.message,
    });
  }
};

// Get radiography entries for dropdown suggestions
exports.getRadiographyDropdown = async (req, res) => {
  try {
    const searchQuery = req.query.query;

    if (!searchQuery) {
      return res.status(400).json({ message: "Query parameter is required" });
    }

    const fuzzyRegex = new RegExp(searchQuery.split("").join(".*"), "i");

    const items = await Radiography.find({
      radiographyName: fuzzyRegex,
    }).limit(30);

    res.status(200).json(items);
  } catch (error) {
    console.error("Error fetching dropdown suggestions:", error);
    res.status(500).json({
      message: "Error fetching dropdown suggestions",
      error: error.message,
    });
  }
};

// Get random radiography suggestions
exports.getRadiographyRandomSuggestions = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 10;

    const randomItems = await Radiography.aggregate([
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

// Delete a radiography entry by name
exports.deleteRadiography = async (req, res) => {
  try {
    const { radiographyName } = req.params;

    const result = await Radiography.findOneAndDelete({ radiographyName });

    if (result) {
      res.status(200).json({
        message: "Radiography entry deleted successfully",
        data: result,
      });
    } else {
      res.status(404).json({
        message: "Radiography entry not found",
      });
    }
  } catch (error) {
    console.error("Error deleting radiography entry:", error);
    res.status(500).json({
      message: "Error deleting radiography entry",
      error: error.message,
    });
  }
};
