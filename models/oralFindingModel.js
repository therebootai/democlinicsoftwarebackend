const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const oralFindingSchema = new Schema({
  oralFindingName: { type: String },
  oralFindingArea: [String],
});

module.exports = mongoose.model("OralFinding", oralFindingSchema);
