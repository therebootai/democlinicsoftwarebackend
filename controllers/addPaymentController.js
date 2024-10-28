const addPayments = require("../models/addPaymentModel");
const generateCustomId = require("../middlewares/generateCustomId");

exports.createPayments = async (req, res) => {
  try {
    const paymentId = await generateCustomId(
      addPayments,
      "paymentId",
      "paymentId"
    );

    const { ...paymentsData } = req.body;

    const newPayments = new addPayments({
      ...paymentsData,
      paymentId,
    });

    await newPayments.save();

    res.status(201).json({
      message: "Payements Created Successfully",
      data: newPayments,
    });
  } catch (error) {
    console.error("Error creating Payments:", error);
    res.status(500).json({
      message: "Error creating Payments",
      error: error.message,
    });
  }
};

exports.getPayments = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const match = {};

    const totalDocuments = await addPayments.countDocuments(match);
    const payments = await addPayments
      .find(match)
      .sort({ paymentCreateDate: -1 })
      .skip(skip)
      .limit(limit);

    const totalPages = Math.ceil(totalDocuments / limit);

    const result = {
      page,
      totalPages,
      totalDocuments,
      data: payments,
    };

    res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching payments:", error);
    res.status(500).json({
      message: "Error fetching payments",
      error: error.message,
    });
  }
};

exports.getDropdown = async (req, res) => {
  try {
    const searchQuery = req.query.query;

    if (!searchQuery) {
      return res.status(400).json({ message: "Query parameter is required" });
    }

    // Fuzzy regex matching for iteamName
    const fuzzyRegex = new RegExp(searchQuery.split("").join(".*"), "i");

    const items = await addPayments.aggregate([
      {
        $match: {
          iteamName: fuzzyRegex,
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
exports.getRandomSuggestions = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 10;

    const randomItems = await addPayments.aggregate([
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

exports.updatePayments = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const updateData = req.body;

    if (!paymentId) {
      return res.status(400).json({ message: "Payment ID is required" });
    }

    const updatedPayment = await addPayments.findOneAndUpdate(
      { paymentId },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedPayment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    res.status(200).json({
      message: "Payment updated successfully",
      data: updatedPayment,
    });
  } catch (error) {
    console.error("Error updating payment:", error);
    res.status(500).json({
      message: "Error updating payment",
      error: error.message,
    });
  }
};

exports.deletePayments = async (req, res) => {
  try {
    const { paymentId } = req.params;

    if (!paymentId) {
      return res.status(400).json({ message: "Payment ID is required" });
    }

    const deletedPayment = await addPayments.findOneAndDelete({ paymentId });

    if (!deletedPayment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    res.status(200).json({
      message: "Payment deleted successfully",
      data: deletedPayment,
    });
  } catch (error) {
    console.error("Error deleting payment:", error);
    res.status(500).json({
      message: "Error deleting payment",
      error: error.message,
    });
  }
};
