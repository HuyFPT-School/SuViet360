const mongoose = require("mongoose");
const env = require("./env");

const connectDB = async () => {
  try {
    const redactedUri = env.mongoUri.replace(/:[^@]+@/, ":****@");
    console.log(`Connecting to MongoDB: ${redactedUri}`);

    if (env.nodeEnv === "production" && env.mongoUri.includes("127.0.0.1") || env.mongoUri.includes("localhost")) {
      console.warn("WARNING: Server is running in production mode but connecting to localhost/127.0.0.1! Please check your MONGO_URI env variable in Vercel.");
    }

    await mongoose.connect(env.mongoUri);
    console.log("Connected to MongoDB successfully");
  } catch(error) {
    console.error("MongoDB connection error:", error);
    throw error;
  }
};

module.exports = connectDB;
