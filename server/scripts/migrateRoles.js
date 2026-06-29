const mongoose = require("mongoose");
const path = require("path");
const dotenv = require("dotenv");

// Load .env configuration from the server directory
dotenv.config({ path: path.join(__dirname, "../.env") });

const env = require("../src/config/env");

async function migrate() {
  const mongoUri = env.mongoUri || process.env.MONGO_URI;
  if (!mongoUri) {
    console.error("❌ MONGO_URI is not defined in .env file!");
    process.exit(1);
  }

  console.log(`Connecting to MongoDB at: ${mongoUri.replace(/:([^@:]+)@/, ":****@")}...`);

  try {
    await mongoose.connect(mongoUri);
    console.log("✅ Connected to MongoDB.");

    const db = mongoose.connection.db;
    const usersCollection = db.collection("users");

    // Count how many users have the role "user"
    const count = await usersCollection.countDocuments({ role: "user" });
    console.log(`Found ${count} user(s) with role: "user".`);

    if (count > 0) {
      console.log('Migrating role "user" to "student"...');
      const result = await usersCollection.updateMany(
        { role: "user" },
        { $set: { role: "student" } }
      );
      console.log(`✅ Successfully updated ${result.modifiedCount} user(s).`);
    } else {
      console.log("No users need migration.");
    }

  } catch (error) {
    console.error("❌ Migration failed with error:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  }
}

migrate();
