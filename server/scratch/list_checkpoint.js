const fs = require('fs');
const path = require('path');

const targetDir = "D:\\SU26\\checkpoint-900";

if (fs.existsSync(targetDir)) {
  console.log(`Listing contents of ${targetDir}:`);
  try {
    const files = fs.readdirSync(targetDir);
    for (const f of files) {
      const fullPath = path.join(targetDir, f);
      const stat = fs.statSync(fullPath);
      console.log(`- ${f} (${stat.isDirectory() ? 'DIR' : 'FILE'})`);
    }
  } catch (e) {
    console.error(`Error reading directory:`, e.message);
  }
} else {
  console.log(`Directory does not exist: ${targetDir}`);
}
