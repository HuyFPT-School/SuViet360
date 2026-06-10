const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "../.env") });

const Lesson = require("../src/models/Lesson");

async function check() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    const lesson = await Lesson.findOne({ title: "Bài 1-Việt Nam" });
    if (!lesson) {
      console.log("Lesson 'Bài 1-Việt Nam' not found!");
      const all = await Lesson.find().select("title");
      console.log("Existing lessons:", all.map(l => l.title));
    } else {
      console.log("Lesson details:");
      console.log(JSON.stringify(lesson, null, 2));
    }
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await mongoose.disconnect();
  }
}

check();
