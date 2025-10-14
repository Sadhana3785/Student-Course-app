const mongoose = require("mongoose");

const courseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  instructor: {
    type: String,
    required: true
  },
  level: {
    type: String,
    default: "beginner",
    enum: ["beginner", "intermediate", "advanced"]
  },
  price: {
    type: Number,
    default: 0
  }
});

module.exports = mongoose.model("Course", courseSchema);
