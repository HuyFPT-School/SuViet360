const dns = require('dns');
dns.setServers(['8.8.8.8']);

const mongoose = require("mongoose");
const Podcast = require("./models/Podcast");
const env = require("./config/env");

async function main() {
  await mongoose.connect(env.mongoUri);
  console.log("DB Connected");
  const podcasts = await Podcast.find();
  console.log(JSON.stringify(podcasts, null, 2));
  await mongoose.connection.close();
}

main().catch(console.error);
