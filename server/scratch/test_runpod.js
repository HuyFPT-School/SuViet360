const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const url = (process.env.CHATBOT_API_URL || process.env.RUNPOD_API_URL || '').trim();
const key = (process.env.CHATBOT_API_KEY || process.env.RUNPOD_API_KEY || '').trim();

console.log("Testing RunPod Connection...");
console.log("URL:", url);
console.log("KEY (masked):", key ? key.substring(0, 10) + "..." : "NOT SET");

if (!url || !key) {
  console.error("URL or KEY is missing in .env!");
  process.exit(1);
}

const body = {
  input: {
    question: "liên hợp quốc thành lập khi nào"
  }
};

fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${key}`
  },
  body: JSON.stringify(body)
})
.then(async res => {
  console.log("Response Status:", res.status);
  const text = await res.text();
  console.log("Response Body:");
  try {
    console.log(JSON.stringify(JSON.parse(text), null, 2));
  } catch (e) {
    console.log(text);
  }
})
.catch(err => {
  console.error("Fetch Error:", err);
});
