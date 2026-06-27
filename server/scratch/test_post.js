const jwt = require("jsonwebtoken");
const axios = require("axios");
const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, "../.env") });

async function run() {
  const userId = "6a34f49e512c3d0cd2e4183c"; // student
  const token = jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "1h" });

  const cookieStr = `token=${token}; csrf-token=dummy-csrf-token`;

  try {
    console.log("Sending POST request to http://localhost:5000/api/blog/posts...");
    const res = await axios.post("http://localhost:5000/api/blog/posts", {
      title: "Test Title from Script",
      content: "Test Content from Script",
      category: "Chủ đề chung",
    }, {
      headers: {
        "Cookie": cookieStr,
        "x-csrf-token": "dummy-csrf-token",
        "Content-Type": "application/json",
      }
    });

    console.log("Success:", res.status, res.data);
  } catch (err) {
    if (err.response) {
      console.log("Error status:", err.response.status);
      console.log("Error response data:", JSON.stringify(err.response.data, null, 2));
    } else {
      console.error("Error message:", err.message);
    }
  }
}

run().catch(console.error);
