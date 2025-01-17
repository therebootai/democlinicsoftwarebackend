const { default: mongoose } = require("mongoose");
const generateCustomId = require("../middlewares/generateCustomId");
const Clinic = require("../models/Clinic");
const Stock = require("../models/Stocks");

exports.addStocks = async (req, res) => {
  try {
    const { stockProductName, stockQuantity, clinicId } = req.body;
    if (!stockProductName || !stockQuantity || !clinicId) {
      return res.status(400).json({
        message:
          "All fields are required. eg: stockProductName, stockQuantity, clinicId",
      });
    }
    const stockId = await generateCustomId(Stock, "stockId", "stockId");
    const newStock = new Stock({
      stockId,
      stockProductName,
      stockQuantity,
      clinicId,
    });
    const savedStock = await newStock.save();
    await Clinic.findByIdAndUpdate(clinicId, {
      $push: { stocks: savedStock._doc._id },
    });
    res.status(201).json(savedStock._doc);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getAllStocks = async (req, res) => {
  try {
    const {
      clinicId,
      stockQuantity,
      greaterQuantity,
      page = 1,
      limit = 10,
    } = req.query;

    let filter = {};

    if (clinicId) {
      if (mongoose.Types.ObjectId.isValid(clinicId)) {
        filter.clinicId = clinicId;
      } else {
        return res.status(400).json({ message: "Invalid clinicId format" });
      }
    }

    if (greaterQuantity) {
      // You can modify the condition based on your requirement (e.g., greater than, less than, etc.)
      filter.stockQuantity = { $gte: Number(greaterQuantity) }; // Example: find stocks with quantity >= stockQuantity
    }

    if (stockQuantity) {
      // You can modify the condition based on your requirement (e.g., greater than, less than, etc.)
      filter.stockQuantity = Number(stockQuantity); // Example: find stocks with quantity <= stockQuantity
    }

    const pageNumber = Number(page);
    const pageLimit = Number(limit);

    // Calculate the skip value based on the page number and limit
    const skip = (pageNumber - 1) * pageLimit;

    // Fetch the stocks from the database based on the filter, skip, and limit
    const stocks = await Stock.find(filter).skip(skip).limit(pageLimit);

    // Get the total count of stocks matching the filter (for pagination purposes)
    const totalCount = await Stock.countDocuments(filter);

    // Calculate total pages
    const totalPages = Math.ceil(totalCount / pageLimit);

    // Return the paginated result in the response
    res.status(200).json({
      stocks,
      totalCount,
      totalPages,
      currentPage: pageNumber,
      pageSize: pageLimit,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
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

    const items = await Stock.aggregate([
      {
        $match: {
          stockProductName: fuzzyRegex,
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

exports.getStockById = async (req, res) => {
  try {
    const { stockId } = req.params;
    const stock = await Stock.findOne({
      $or: [
        { stockId },
        {
          _id: mongoose.Types.ObjectId.isValid(stockId) ? stockId : undefined,
        },
      ],
    });
    if (!stock) {
      return res.status(404).json({ message: "Stock not found" });
    }
    res.status(200).json(stock);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateStock = async (req, res) => {
  try {
    const { stockId } = req.params;
    const { stockProductName, stockQuantity, clinicId } = req.body;
    const stock = await Stock.findOne({
      $or: [
        { stockId },
        {
          _id: mongoose.Types.ObjectId.isValid(stockId) ? stockId : undefined,
        },
      ],
    });
    if (!stock) {
      return res.status(404).json({ message: "Stock not found" });
    }

    stock.stockProductName = stockProductName || stock.stockProductName;
    stock.stockQuantity = stockQuantity || stock.stockQuantity;
    stock.clinicId = clinicId || stock.clinicId;
    const updatedStock = await stock.save();
    return res.status(200).json(updatedStock._doc);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};

exports.deleteStock = async (req, res) => {
  try {
    const { stockId } = req.params;
    const stock = await Stock.findOne({
      $or: [
        { stockId },
        {
          _id: mongoose.Types.ObjectId.isValid(stockId) ? stockId : undefined,
        },
      ],
    });
    if (!stock) {
      return res.status(404).json({ message: "Stock not found" });
    }
    await Clinic.findByIdAndUpdate(stock.clinicId, {
      $pull: { stocks: stock._id },
    });
    await Stock.findByIdAndDelete(stock._id);
    res.status(200).json({ message: "Stock deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
