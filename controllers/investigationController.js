const Investigation = require("../models/investigationModel");

// Create a new investigation
exports.createInvestigation = async (req, res) => {
  try {
    const { investigationName } = req.body;

    const newInvestigation = new Investigation({
      investigationName,
    });

    await newInvestigation.save();

    res.status(201).json({
      message: "Investigation Created Successfully",
      data: newInvestigation,
    });
  } catch (error) {
    console.error("Error creating investigation:", error);
    res.status(500).json({
      message: "Error creating investigation",
      error: error.message,
    });
  }
};

// Fetch all investigations
exports.getInvestigations = async (req, res) => {
  try {
    const result = await Investigation.find();
    res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching investigations:", error);
    res.status(500).json({
      message: "Error fetching investigations",
      error: error.message,
    });
  }
};

// Fetch specific suggestions based on a search term
exports.getInvestigationDropdown = async (req, res) => {
  try {
    const searchQuery = req.query.query;
    if (!searchQuery) {
      return res.status(400).json({ message: "Query parameter is required" });
    }

    // Fuzzy regex matching for investigationName
    const fuzzyRegex = new RegExp(searchQuery.split("").join(".*"), "i");

    const items = await Investigation.aggregate([
      {
        $match: {
          investigationName: fuzzyRegex,
        },
      },
      {
        $limit: 30,
      },
    ]);

    res.status(200).json(items);
  } catch (error) {
    console.error("Error searching investigations:", error);
    res.status(500).json({
      message: "Error searching investigations",
      error: error.message,
    });
  }
};

// Get random investigation suggestions
exports.getInvestigationRandomSuggestions = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 10;

    const randomItems = await Investigation.aggregate([
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

// Delete an investigation by investigationName
exports.deleteInvestigation = async (req, res) => {
  try {
    const { investigationName } = req.params;

    const result = await Investigation.findOneAndDelete({ investigationName });

    if (result) {
      res.status(200).json({
        message: "Investigation deleted successfully",
        data: result,
      });
    } else {
      res.status(404).json({
        message: "Investigation not found",
      });
    }
  } catch (error) {
    console.error("Error deleting investigation:", error);
    res.status(500).json({
      message: "Error deleting investigation",
      error: error.message,
    });
  }
};
