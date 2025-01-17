const express = require("express");
const {
  addStocks,
  getDropdown,
  getAllStocks,
  getStockById,
  deleteStock,
  updateStock,
} = require("../controllers/stockController");

const stockRouter = express.Router();

stockRouter.post("/add", addStocks);

stockRouter.get("/getdropdown", getDropdown);

stockRouter.get("/", getAllStocks);

stockRouter
  .route("/:stockId")
  .get(getStockById)
  .delete(deleteStock)
  .put(updateStock);

module.exports = stockRouter;
