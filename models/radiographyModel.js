const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const radiographySchema = new Schema({
  radiographyName: { type: String },
});

module.exports = mongoose.model("Radiography", radiographySchema);
