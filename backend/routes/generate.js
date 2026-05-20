const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");

// 📂 Path to generated folder
const generatedDir = path.join(__dirname, "../generated");

// 🟢 POST /api/generate
router.post("/", async (req, res) => {
  try {
    const filename = `doc_${Date.now()}.docx`;
    const filepath = path.join(generatedDir, filename);

    // ✍️ For demo: create a simple file (replace with real .docx logic later)
    fs.writeFileSync(filepath, "Hello, this is a generated document!");

    res.json({ filename });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to generate document" });
  }
});

module.exports = router;
