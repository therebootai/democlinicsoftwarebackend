const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const investigationSchema = new Schema({
  investigationName: { type: String },
});

module.exports = mongoose.model("Investigation", investigationSchema);
