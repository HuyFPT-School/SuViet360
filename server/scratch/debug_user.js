const mongoose = require("mongoose");
const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, "../.env") });

const User = require("../src/models/User");

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB.");

  // Find all users or search by name
  const users = await User.find({ name: /Huy/i });
  console.log("Found users matching 'Huy':");
  users.forEach(u => {
    console.log(`- ID: ${u._id}, Name: ${u.name}, Email: ${u.email}, Role: ${u.role}, isEmailVerified: ${u.isEmailVerified}`);
  });

  await mongoose.disconnect();
}

run().catch(console.error);
