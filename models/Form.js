const mongoose = require("mongoose");

const formSchema = new mongoose.Schema(
  {
    formId: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    file: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const Form = mongoose.model("Form", formSchema);

module.exports = Form;
