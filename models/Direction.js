const mongoose = require("mongoose");

const directionSchema = new mongoose.Schema(
  {
    directionId: {
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

const Direction = mongoose.model("Direction", directionSchema);

module.exports = Direction;
