const dentalProcedure = require("../models/dentalProcedureModel");

// Create a new dental procedure
exports.createDentalProcedure = async (req, res) => {
  try {
    const { dentalProcedureName, dentalProcedureArea } = req.body;

    const newDentalProcedure = new dentalProcedure({
      dentalProcedureName,
      dentalProcedureArea,
    });

    await newDentalProcedure.save();

    res.status(201).json({
      message: "Dental Procedure Created Successfully",
      data: newDentalProcedure,
    });
  } catch (error) {
    console.error("Error creating Dental Procedure:", error);
    res.status(500).json({
      message: "Error creating Dental Procedure",
      error: error.message,
    });
  }
};

// Get all dental procedures
exports.getDentalProcedures = async (req, res) => {
  try {
    const result = await dentalProcedure.find();

    res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching Dental Procedures:", error);
    res.status(500).json({
      message: "Error fetching Dental Procedures",
      error: error.message,
    });
  }
};

// Search dental procedures with a fuzzy search for dropdown suggestions
exports.getDentalProcedureDropdown = async (req, res) => {
  try {
    const searchQuery = req.query.query;

    if (!searchQuery) {
      return res.status(400).json({ message: "Query parameter is required" });
    }

    const fuzzyRegex = new RegExp(searchQuery.split("").join(".*"), "i");

    const items = await dentalProcedure.aggregate([
      {
        $match: {
          dentalProcedureName: fuzzyRegex,
        },
      },
      {
        $limit: 30,
      },
    ]);

    res.status(200).json(items);
  } catch (error) {
    console.error("Error searching dental procedures:", error);
    res.status(500).json({
      message: "Error searching dental procedures",
      error: error.message,
    });
  }
};

// Get random dental procedure suggestions
exports.getDentalProcedureRandomSuggestions = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 10;

    const randomItems = await dentalProcedure.aggregate([
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

exports.updateDentalProcedureAreas = async (req, res) => {
  try {
    const { dentalProcedureName } = req.params;
    const { dentalProcedureArea } = req.body;

    const updateddentalProcedure = await dentalProcedure.findOneAndUpdate(
      { dentalProcedureName },
      { $set: { dentalProcedureArea } },
      { new: true }
    );

    if (!updateddentalProcedure) {
      return res.status(404).json({ message: "dental Procedure not found" });
    }

    res.status(200).json({
      message: "dental Procedure areas updated successfully",
      data: updateddentalProcedure,
    });
  } catch (error) {
    console.error("Error updating dental Procedure areas:", error);
    res.status(500).json({
      message: "Error updating dental Procedure areas",
      error: error.message,
    });
  }
};

// Delete a dental procedure by name
exports.deleteDentalProcedure = async (req, res) => {
  try {
    const { dentalProcedureName } = req.params;

    const result = await dentalProcedure.findOneAndDelete({
      dentalProcedureName,
    });

    if (result) {
      res.status(200).json({
        message: "Dental Procedure deleted successfully",
        data: result,
      });
    } else {
      res.status(404).json({
        message: "Dental Procedure not found",
      });
    }
  } catch (error) {
    console.error("Error deleting Dental Procedure:", error);
    res.status(500).json({
      message: "Error deleting Dental Procedure",
      error: error.message,
    });
  }
};
