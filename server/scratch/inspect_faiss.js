const fs = require('fs');

const p = "C:\\Users\\ADMIN\\Downloads\\kb_index.faiss";

if (fs.existsSync(p)) {
  console.log(`Path exists: ${p}`);
  try {
    const fd = fs.openSync(p, 'r');
    const buffer = Buffer.alloc(100);
    fs.readSync(fd, buffer, 0, 100, 0);
    fs.closeSync(fd);
    
    console.log("First 24 bytes in Hex:");
    console.log(buffer.toString('hex').slice(0, 48));
    
    console.log("First 24 bytes as 32-bit integers:");
    for (let i = 0; i < 6; i++) {
      console.log(`Int32 at offset ${i*4}:`, buffer.readInt32LE(i*4));
    }
    
    console.log("ASCII:", buffer.toString('ascii').replace(/[^ -~]/g, '.'));
  } catch (e) {
    console.error(`Error reading ${p}:`, e.message);
  }
} else {
  console.log(`Path does not exist: ${p}`);
}
