const OralFinding = require("../models/oralFindingModel");

exports.createOralFinding = async (req, res) => {
  try {
    const { ...oralFindingData } = req.body;

    const newOralFinding = new OralFinding({
      ...oralFindingData,
    });

    await newOralFinding.save();

    res.status(201).json({
      message: "Oral Finding Created Successfully",
      data: newOralFinding,
    });
  } catch (error) {
    console.error("Error creating Oral Finding:", error);
    res.status(500).json({
      message: "Error creating Oral Finding",
      error: error.message,
    });
  }
};

exports.getOralFinding = async (req, res) => {
  try {
    const result = await OralFinding.find();

    res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching Oral Finding:", error);
    res.status(500).json({
      message: "Error fetching Oral Finding",
      error: error.message,
    });
  }
};

exports.getOralFindingDropdown = async (req, res) => {
  try {
    const searchQuery = req.query.query;

    if (!searchQuery) {
      return res.status(400).json({ message: "Query parameter is required" });
    }

    // Fuzzy regex matching for oralFindingName
    const fuzzyRegex = new RegExp(searchQuery.split("").join(".*"), "i");

    const items = await OralFinding.aggregate([
      {
        $match: {
          oralFindingName: fuzzyRegex,
        },
      },
      {
        $limit: 30,
      },
    ]);

    res.status(200).json(items);
  } catch (error) {
    console.error("Error searching items:", error);
    res.status(500).json({
      message: "Error searching items",
      error: error.message,
    });
  }
};

// Get random item suggestions
exports.getOralFindingRandomSuggestions = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 10;

    const randomItems = await OralFinding.aggregate([
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

exports.updateOralFindingAreas = async (req, res) => {
  try {
    const { oralFindingName } = req.params;
    const { oralFindingArea } = req.body;

    const updatedOralFinding = await OralFinding.findOneAndUpdate(
      { oralFindingName },
      { $set: { oralFindingArea } },
      { new: true }
    );

    if (!updatedOralFinding) {
      return res.status(404).json({ message: "Oral Finding not found" });
    }

    res.status(200).json({
      message: "Oral Finding areas updated successfully",
      data: updatedOralFinding,
    });
  } catch (error) {
    console.error("Error updating Oral Finding areas:", error);
    res.status(500).json({
      message: "Error updating Oral Finding areas",
      error: error.message,
    });
  }
};

// Delete an oral finding by oralFindingName
exports.deleteOralFinding = async (req, res) => {
  try {
    const { oralFindingName } = req.params; // Get oralFindingName from URL params

    const result = await OralFinding.findOneAndDelete({ oralFindingName });

    if (result) {
      res.status(200).json({
        message: "Oral Finding deleted successfully",
        data: result,
      });
    } else {
      res.status(404).json({
        message: "Oral Finding not found",
      });
    }
  } catch (error) {
    console.error("Error deleting Oral Finding:", error);
    res.status(500).json({
      message: "Error deleting Oral Finding",
      error: error.message,
    });
  }
};
