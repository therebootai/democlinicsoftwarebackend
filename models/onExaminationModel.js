const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const onExaminationSchema = new Schema({
  onExaminationName: { type: String },
  onExaminationArea: [String],
});

module.exports = mongoose.model("OnExamination", onExaminationSchema);
