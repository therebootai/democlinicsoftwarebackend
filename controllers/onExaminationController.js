const OnExamination = require("../models/onExaminationModel");

// Create a new On Examination entry
exports.createOnExamination = async (req, res) => {
  try {
    const { ...onExaminationData } = req.body;

    const newOnExamination = new OnExamination({
      ...onExaminationData,
    });

    await newOnExamination.save();

    res.status(201).json({
      message: "On Examination Created Successfully",
      data: newOnExamination,
    });
  } catch (error) {
    console.error("Error creating On Examination:", error);
    res.status(500).json({
      message: "Error creating On Examination",
      error: error.message,
    });
  }
};

// Get all On Examination entries
exports.getOnExaminations = async (req, res) => {
  try {
    const result = await OnExamination.find();
    res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching On Examinations:", error);
    res.status(500).json({
      message: "Error fetching On Examinations",
      error: error.message,
    });
  }
};

// Get On Examination dropdown suggestions
exports.getOnExaminationDropdown = async (req, res) => {
  try {
    const searchQuery = req.query.query;

    if (!searchQuery) {
      return res.status(400).json({ message: "Query parameter is required" });
    }

    const fuzzyRegex = new RegExp(searchQuery.split("").join(".*"), "i");

    const items = await OnExamination.aggregate([
      {
        $match: {
          onExaminationName: fuzzyRegex,
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

// Get random suggestions for On Examination dropdown
exports.getOnExaminationRandomSuggestions = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 10;

    const randomItems = await OnExamination.aggregate([
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

// Update areas for a specific On Examination entry
exports.updateOnExaminationAreas = async (req, res) => {
  try {
    const { onExaminationName } = req.params;
    const { onExaminationArea } = req.body;

    const updatedOnExamination = await OnExamination.findOneAndUpdate(
      { onExaminationName },
      { $set: { onExaminationArea } },
      { new: true }
    );

    if (!updatedOnExamination) {
      return res.status(404).json({ message: "On Examination not found" });
    }

    res.status(200).json({
      message: "On Examination areas updated successfully",
      data: updatedOnExamination,
    });
  } catch (error) {
    console.error("Error updating On Examination areas:", error);
    res.status(500).json({
      message: "Error updating On Examination areas",
      error: error.message,
    });
  }
};

// Delete an On Examination entry by name
exports.deleteOnExamination = async (req, res) => {
  try {
    const { onExaminationName } = req.params;

    const result = await OnExamination.findOneAndDelete({ onExaminationName });

    if (result) {
      res.status(200).json({
        message: "On Examination deleted successfully",
        data: result,
      });
    } else {
      res.status(404).json({
        message: "On Examination not found",
      });
    }
  } catch (error) {
    console.error("Error deleting On Examination:", error);
    res.status(500).json({
      message: "Error deleting On Examination",
      error: error.message,
    });
  }
};
