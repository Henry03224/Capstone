const express = require("express");
const router = express.Router();
const oracledb = require("oracledb");
const dbConfig = require("../db");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, "../uploads/templates");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, file.originalname),
});
const upload = multer({ storage });

// ----------------------------
// Upload template
// ----------------------------
router.post("/upload", upload.single("file"), async (req, res) => {
  let conn;
  try {
    if (!req.file)
      return res.status(400).json({ success: false, message: "No file uploaded" });

    const { templateType, serviceName } = req.body; // Added serviceName
    const originalName = req.file.originalname.trim();
    const ext = path.extname(originalName);
    const base = path.basename(originalName, ext);

    conn = await oracledb.getConnection(dbConfig);

    // Auto-numbering logic
    let filename = originalName;
    let counter = 1;
    
    // Check DB for existing filename to prevent duplicates
    while (true) {
      const check = await conn.execute(
        `SELECT COUNT(*) AS COUNT FROM TEMPLATES WHERE LOWER(FILENAME) = :filename`,
        { filename: filename.toLowerCase() },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      
      if (check.rows[0].COUNT === 0 && !fs.existsSync(path.join(uploadDir, filename))) break;
      
      filename = `${base}(${counter})${ext}`;
      counter++;
    }

    // Rename file if needed
    if (req.file.filename !== filename) {
      fs.renameSync(path.join(uploadDir, req.file.filename), path.join(uploadDir, filename));
    }

    const location = `/uploads/templates/${filename}`;

    // Insert into DB with SERVICE_NAME
    const result = await conn.execute(
      `INSERT INTO TEMPLATES (FILENAME, FILETYPE, SERVICE_NAME, LOCATION, UPLOADED_AT)
       VALUES (:filename, :filetype, :serviceName, :location, SYSDATE)
       RETURNING ID INTO :id`,
      {
        filename,
        filetype: templateType || "General",
        serviceName: serviceName || null, // optional service name
        location,
        id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
      },
      { autoCommit: true }
    );

    res.json({
      success: true,
      id: result.outBinds.id[0],
      filename,
      filetype: templateType || "General",
      serviceName: serviceName || null,
      location,
    });

  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ success: false, message: "Failed to upload template" });
  } finally {
    if (conn) await conn.close();
  }
});

// ----------------------------
// Get templates
// ----------------------------
router.get("/", async (req, res) => {
  let conn;
  try {
    const { type, serviceName } = req.query; // Added serviceName filter
    conn = await oracledb.getConnection(dbConfig);

    let sql = `SELECT ID, FILENAME, FILETYPE, SERVICE_NAME, LOCATION FROM TEMPLATES`;
    const binds = {};

    if (type || serviceName) {
      sql += ` WHERE 1=1`;
      if (type) {
        sql += ` AND UPPER(FILETYPE) LIKE '%' || UPPER(:type) || '%'`;
        binds.type = type;
      }
      if (serviceName) {
        sql += ` AND UPPER(SERVICE_NAME) LIKE '%' || UPPER(:serviceName) || '%'`;
        binds.serviceName = serviceName;
      }
    }

    sql += ` ORDER BY ID DESC`;

    const result = await conn.execute(sql, binds, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    
    const rows = result.rows.map(r => ({
      id: r.ID,
      filename: r.FILENAME,
      filetype: r.FILETYPE,
      serviceName: r.SERVICE_NAME,
      location: r.LOCATION
    }));

    res.json(rows);

  } catch (err) {
    console.error("Fetch templates error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch templates" });
  } finally {
    if (conn) await conn.close();
  }
});

// ----------------------------
// Delete template
// ----------------------------
router.delete("/:id", async (req, res) => {
  let conn;
  try {
    conn = await oracledb.getConnection(dbConfig);

    const fileRes = await conn.execute(
      `SELECT LOCATION FROM TEMPLATES WHERE ID = :id`,
      [req.params.id],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (!fileRes.rows.length)
      return res.status(404).json({ success: false, message: "Template not found" });

    const filePath = path.join(__dirname, "..", fileRes.rows[0].LOCATION);

    await conn.execute(
      `DELETE FROM TEMPLATES WHERE ID = :id`,
      [req.params.id],
      { autoCommit: true }
    );

    if (fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch(e) { console.error("File delete error:", e); }
    }

    res.json({ success: true, message: "Template deleted successfully" });

  } catch (err) {
    console.error("Delete template error:", err);
    res.status(500).json({ success: false, message: "Failed to delete template" });
  } finally {
    if (conn) await conn.close();
  }
});

module.exports = router;