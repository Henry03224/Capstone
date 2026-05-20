const express = require("express");
const router = express.Router();
const oracledb = require("oracledb");
const dbConfig = require("../db");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// 📂 Ensure uploads folder exists
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// ⚡ Multer config (store files in /uploads)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

// 🟢 GET all services
router.get("/", async (req, res) => {
  let conn;
  try {
    conn = await oracledb.getConnection(dbConfig);

    const result = await conn.execute(
      `SELECT 
         ID AS "id",
         NAME AS "name",
         TYPE AS "type",
         FEE AS "fee",
         DURATION AS "duration",
         TEMPLATE AS "template"
       FROM SERVICES
       ORDER BY ID DESC`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    // add file URL for template
    const rows = result.rows.map((r) => ({
      ...r,
      templateUrl: r.template ? `/uploads/${r.template}` : null,
    }));

    res.json(rows);
  } catch (err) {
    console.error("Error fetching services:", err);
    res.status(500).json({ error: "Failed to fetch services" });
  } finally {
    if (conn) await conn.close();
  }
});

// 🟢 POST new service with optional template upload
router.post("/", upload.single("template"), async (req, res) => {
  let conn;
  try {
    const { name, type, fee, duration } = req.body;
    const file = req.file ? req.file.filename : null;

    if (!name || !type) {
      return res.status(400).json({ error: "Name and type are required" });
    }

    conn = await oracledb.getConnection(dbConfig);

    const result = await conn.execute(
      `INSERT INTO SERVICES (NAME, TYPE, FEE, DURATION, TEMPLATE)
       VALUES (:name, :type, :fee, :duration, :template)
       RETURNING ID INTO :id`,
      {
        name,
        type,
        fee: fee || null,
        duration: duration || null,
        template: file,
        id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
      },
      { autoCommit: true }
    );

    res.json({
      id: result.outBinds.id[0],
      name,
      type,
      fee,
      duration,
      template: file,
      templateUrl: file ? `/uploads/${file}` : null,
    });
  } catch (err) {
    console.error("Error adding service:", err);
    res.status(500).json({ error: "Failed to add service" });
  } finally {
    if (conn) await conn.close();
  }
});

// 🟡 PUT update service with optional new template
router.put("/:id", upload.single("template"), async (req, res) => {
  let conn;
  try {
    const { id } = req.params;
    const { name, type, fee, duration } = req.body;
    const file = req.file ? req.file.filename : null;

    conn = await oracledb.getConnection(dbConfig);

    const result = await conn.execute(
      `UPDATE SERVICES
       SET NAME = :name,
           TYPE = :type,
           FEE = :fee,
           DURATION = :duration,
           TEMPLATE = COALESCE(:template, TEMPLATE)
       WHERE ID = :id`,
      {
        id,
        name,
        type,
        fee: fee || null,
        duration: duration || null,
        template: file,
      },
      { autoCommit: true }
    );

    res.json({
      success: result.rowsAffected > 0,
      id,
      name,
      type,
      fee,
      duration,
      template: file,
      templateUrl: file ? `/uploads/${file}` : null,
    });
  } catch (err) {
    console.error("Error updating service:", err);
    res.status(500).json({ error: "Failed to update service" });
  } finally {
    if (conn) await conn.close();
  }
});

// 🟢 BULK UPDATE service fees
router.put("/", async (req, res) => {
  let conn;
  try {
    const services = req.body; // expecting array of { id, fee }
    if (!Array.isArray(services)) {
      return res.status(400).json({ error: "Invalid request format" });
    }

    conn = await oracledb.getConnection(dbConfig);

    for (const s of services) {
      await conn.execute(
        `UPDATE SERVICES
         SET FEE = :fee
         WHERE ID = :id`,
        {
          id: s.id,
          fee: s.fee || null,
        }
      );
    }

    await conn.commit();

    res.json({ message: "Service fees updated successfully!" });
  } catch (err) {
    console.error("Error updating service fees:", err);
    res
      .status(500)
      .json({ error: "Failed to update service fees", details: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

module.exports = router;
