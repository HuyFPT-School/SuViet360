const mongoose = require("mongoose");
const path = require("path");
const env = require("./src/config/env");

require("./src/models/Lesson");
require("./src/models/Podcast");

const Podcast = mongoose.model("Podcast");
const Lesson = mongoose.model("Lesson");

async function inspect() {
  console.log("Connecting to:", env.mongoUri);
  await mongoose.connect(env.mongoUri);
  console.log("Connected!");

  // Find all podcasts
  const podcasts = await Podcast.find({}).populate("lessonId");
  console.log(`\n--- ALL PODCASTS (${podcasts.length}) ---`);
  podcasts.forEach(p => {
    console.log(`ID: ${p._id}`);
    console.log(`Title: "${p.title}"`);
    console.log(`Status: "${p.status}"`);
    console.log(`LessonId: ${p.lessonId ? p.lessonId._id : 'null'}`);
    if (p.lessonId) {
      console.log(`Linked Lesson Title: "${p.lessonId.title}"`);
      console.log(`Linked Lesson Status: "${p.lessonId.status}"`);
      console.log(`Linked Lesson Game JSON: "${p.lessonId.game ? p.lessonId.game.tilemapJsonUrl : 'no game'}"`);
    }
  });

  await mongoose.disconnect();
  console.log("\nDisconnected!");
}

inspect().catch(console.error);
