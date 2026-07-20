const fs = require('fs');

const p = "C:\\Users\\ADMIN\\Downloads\\SuViet360\\ReDecoder_Only.ipynb";

if (fs.existsSync(p)) {
  console.log(`Reading notebook: ${p}`);
  try {
    const content = JSON.parse(fs.readFileSync(p, 'utf8'));
    console.log("Number of cells:", content.cells.length);
    
    for (let i = 0; i < content.cells.length; i++) {
      const cell = content.cells[i];
      if (cell.cell_type === 'code') {
        const codeText = cell.source.join('');
        if (codeText.includes('SentenceTransformer') || codeText.includes('embed_model') || codeText.includes('embedding') || codeText.includes('faiss')) {
          console.log(`\n--- Cell ${i} (Code) ---`);
          console.log(codeText);
        }
      }
    }
  } catch (e) {
    console.error("Error parsing JSON:", e.message);
  }
} else {
  console.log("File not found:", p);
}
