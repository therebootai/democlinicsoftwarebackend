const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const chiefComplainSchema = new Schema({
  chiefComplainName: { type: String },
});

module.exports = mongoose.model("ChiefComplain", chiefComplainSchema);
