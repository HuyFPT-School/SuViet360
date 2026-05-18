const mongoose = require("mongoose");
const env = require("./env");

const connectDB = async () => {
  try {
    await mongoose.connect(env.mongoUri);
    console.log("Connected to MongoDB successfully");
  } catch(error) {
    console.log("MongoDB connection error:", error);
  }
};

module.exports = connectDB;
