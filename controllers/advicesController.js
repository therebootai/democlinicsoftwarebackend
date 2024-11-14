const Advices = require("../models/advicesModel");

// Create new advice
exports.createAdvice = async (req, res) => {
  try {
    const { advicesName } = req.body;

    const newAdvice = new Advices({ advicesName });
    await newAdvice.save();

    res.status(201).json({
      message: "Advice created successfully",
      data: newAdvice,
    });
  } catch (error) {
    console.error("Error creating advice:", error);
    res.status(500).json({
      message: "Error creating advice",
      error: error.message,
    });
  }
};

// Get all advices
exports.getAllAdvices = async (req, res) => {
  try {
    const advices = await Advices.find();
    res.status(200).json(advices);
  } catch (error) {
    console.error("Error fetching advices:", error);
    res.status(500).json({
      message: "Error fetching advices",
      error: error.message,
    });
  }
};

// Get advice suggestions based on query
exports.getAdviceSuggestions = async (req, res) => {
  try {
    const searchQuery = req.query.query;
    if (!searchQuery) {
      return res.status(400).json({ message: "Query parameter is required" });
    }

    // Fuzzy search
    const fuzzyRegex = new RegExp(searchQuery.split("").join(".*"), "i");
    const suggestions = await Advices.find({ advicesName: fuzzyRegex }).limit(
      30
    );

    res.status(200).json(suggestions);
  } catch (error) {
    console.error("Error fetching suggestions:", error);
    res.status(500).json({
      message: "Error fetching suggestions",
      error: error.message,
    });
  }
};

// Get random advice suggestions
exports.getRandomAdviceSuggestions = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 10;
    const randomAdvices = await Advices.aggregate([
      { $sample: { size: limit } },
    ]);

    res.status(200).json(randomAdvices);
  } catch (error) {
    console.error("Error fetching random suggestions:", error);
    res.status(500).json({
      message: "Error fetching random suggestions",
      error: error.message,
    });
  }
};

// Delete an advice by advicesName
exports.deleteAdvice = async (req, res) => {
  try {
    const { advicesName } = req.params; // Get advicesName from URL params

    const result = await Advices.findOneAndDelete({ advicesName });

    if (result) {
      res.status(200).json({
        message: "Advice deleted successfully",
        data: result,
      });
    } else {
      res.status(404).json({
        message: "Advice not found",
      });
    }
  } catch (error) {
    console.error("Error deleting advice:", error);
    res.status(500).json({
      message: "Error deleting advice",
      error: error.message,
    });
  }
};
