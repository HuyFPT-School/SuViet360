require("dotenv").config();
const mongoose = require("mongoose");
const env = require("../src/config/env");

const runMigration = async () => {
  const mongoUri = env.mongoUri || process.env.MONGO_URI;
  if (!mongoUri) {
    console.error("❌ MONGO_URI is not defined!");
    process.exit(1);
  }

  console.log(`Connecting to MongoDB at: ${mongoUri}...`);
  await mongoose.connect(mongoUri);
  console.log("Connected successfully!");

  const db = mongoose.connection.db;
  
  // Get collections list
  const collections = await db.listCollections().toArray();
  const collectionNames = collections.map(c => c.name);

  if (!collectionNames.includes("gamerequests")) {
    console.log("ℹ️ Collection 'gamerequests' does not exist. Nothing to migrate.");
    process.exit(0);
  }

  console.log("Reading documents from 'gamerequests'...");
  const oldDocs = await db.collection("gamerequests").find().toArray();
  console.log(`Found ${oldDocs.length} documents.`);

  if (oldDocs.length > 0) {
    const migratedDocs = oldDocs.map(doc => {
      const newDoc = { ...doc };
      // Rename resultLessonId to resultPodcastId if present
      if ("resultLessonId" in newDoc) {
        newDoc.resultPodcastId = newDoc.resultLessonId;
        delete newDoc.resultLessonId;
      }
      return newDoc;
    });

    console.log("Writing migrated documents to 'podcastrequests'...");
    await db.collection("podcastrequests").insertMany(migratedDocs);
    console.log("Migrated successfully!");
  } else {
    console.log("No documents to migrate.");
  }

  console.log("Dropping old 'gamerequests' collection...");
  await db.collection("gamerequests").drop();
  console.log("Dropped successfully!");

  console.log("🎉 Migration completed!");
  process.exit(0);
};

runMigration().catch(err => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
