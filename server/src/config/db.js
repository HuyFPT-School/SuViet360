const mongoose = require("mongoose");
const dns = require('dns');

// Fix querySrv ECONNREFUSED by forcing Google DNS
dns.setServers(['8.8.8.8']);


const env = require("./env");

const connectDB = async () => {
  try {
    await mongoose.connect(env.mongoUri);
    console.log("Connected to MongoDB successfully");
  } catch (error) {
    console.error("MongoDB connection error:", error);
  }
};

module.exports = connectDB;
