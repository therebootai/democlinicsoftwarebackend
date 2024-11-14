const ChiefComplain = require("../models/chiefComplainModel");

// Create a new Chief Complaint
exports.createChiefComplain = async (req, res) => {
  try {
    const { chiefComplainName } = req.body;

    const newChiefComplain = new ChiefComplain({
      chiefComplainName,
    });

    await newChiefComplain.save();

    res.status(201).json({
      message: "Chief Complaint Created Successfully",
      data: newChiefComplain,
    });
  } catch (error) {
    console.error("Error creating Chief Complaint:", error);
    res.status(500).json({
      message: "Error creating Chief Complaint",
      error: error.message,
    });
  }
};

// Get all Chief Complaints
exports.getChiefComplain = async (req, res) => {
  try {
    const result = await ChiefComplain.find();
    res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching Chief Complaints:", error);
    res.status(500).json({
      message: "Error fetching Chief Complaints",
      error: error.message,
    });
  }
};

// Get Chief Complaint suggestions based on search query
exports.getChiefComplainDropdown = async (req, res) => {
  try {
    const searchQuery = req.query.query;
    if (!searchQuery) {
      return res.status(400).json({ message: "Query parameter is required" });
    }

    // Fuzzy regex matching for chiefComplainName
    const fuzzyRegex = new RegExp(searchQuery.split("").join(".*"), "i");
    const items = await ChiefComplain.find({
      chiefComplainName: fuzzyRegex,
    }).limit(30);

    res.status(200).json(items);
  } catch (error) {
    console.error("Error searching items:", error);
    res.status(500).json({
      message: "Error searching items",
      error: error.message,
    });
  }
};

// Get random Chief Complaint suggestions
exports.getChiefComplainRandomSuggestions = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 10;
    const randomItems = await ChiefComplain.aggregate([
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

// Update Chief Complaint (only the name in this case)
exports.updateChiefComplain = async (req, res) => {
  try {
    const { chiefComplainName } = req.params;
    const { newChiefComplainName } = req.body;

    const updatedChiefComplain = await ChiefComplain.findOneAndUpdate(
      { chiefComplainName },
      { $set: { chiefComplainName: newChiefComplainName } },
      { new: true }
    );

    if (!updatedChiefComplain) {
      return res.status(404).json({ message: "Chief Complaint not found" });
    }

    res.status(200).json({
      message: "Chief Complaint updated successfully",
      data: updatedChiefComplain,
    });
  } catch (error) {
    console.error("Error updating Chief Complaint:", error);
    res.status(500).json({
      message: "Error updating Chief Complaint",
      error: error.message,
    });
  }
};

// Delete a Chief Complaint by name
exports.deleteChiefComplain = async (req, res) => {
  try {
    const { chiefComplainName } = req.params;
    const result = await ChiefComplain.findOneAndDelete({ chiefComplainName });

    if (result) {
      res.status(200).json({
        message: "Chief Complaint deleted successfully",
        data: result,
      });
    } else {
      res.status(404).json({
        message: "Chief Complaint not found",
      });
    }
  } catch (error) {
    console.error("Error deleting Chief Complaint:", error);
    res.status(500).json({
      message: "Error deleting Chief Complaint",
      error: error.message,
    });
  }
};
