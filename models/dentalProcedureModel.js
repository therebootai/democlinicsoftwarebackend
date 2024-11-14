const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const dentalProcedureSchema = new Schema({
  dentalProcedureName: { type: String },
  dentalProcedureArea: [String],
});

module.exports = mongoose.model("dentalProcedure", dentalProcedureSchema);
