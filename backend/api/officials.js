const express = require("express");
const router = express.Router();
const oracledb = require("oracledb");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const dbConfig = require("../db");

// Setup uploads directory
const uploadsDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_, file, cb) => cb(null, uploadsDir),
  filename: (_, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/\s+/g, "-").replace(/[^a-zA-Z0-9-_]/g, "");
    cb(null, `${Date.now()}-${base}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// Helper
function toPublicPath(filename) {
  return `/uploads/${filename}`;
}
async function tryDeleteFile(publicPath) {
  if (!publicPath) return;
  const filename = path.basename(publicPath);
  const full = path.join(uploadsDir, filename);
  if (fs.existsSync(full)) await fs.promises.unlink(full);
}

// GET all officials
router.get("/", async (req, res) => {
  let conn;
  try {
    conn = await oracledb.getConnection(dbConfig);
    const sql = `SELECT * FROM OFFICIALS ORDER BY TERM_YEAR DESC, STATUS DESC, ID`;
    const result = await conn.execute(sql, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch officials" });
  } finally {
    if (conn) try { await conn.close(); } catch {}
  }
});

// POST add official
router.post("/", upload.single("image"), async (req, res) => {
  const { name, position, contact, term_year } = req.body;
  if (!name || !position || !term_year) {
    if (req.file) await tryDeleteFile(toPublicPath(req.file.filename));
    return res.status(400).json({ message: "Name, Position, and TERM_YEAR are required." });
  }

  const image_url = req.file ? toPublicPath(req.file.filename) : null;

  let conn;
  try {
    conn = await oracledb.getConnection(dbConfig);
    const sql = `
      INSERT INTO OFFICIALS (NAME, POSITION, CONTACT, IMAGE_URL, STATUS, TERM_YEAR)
      VALUES (:name, :position, :contact, :image_url, 'ACTIVE', :term_year)
    `;
    await conn.execute(sql, { name, position, contact, image_url, term_year: Number(term_year) }, { autoCommit: true });
    res.json({ message: "Official added successfully.", image_url });
  } catch (err) {
    console.error(err);
    if (req.file) await tryDeleteFile(toPublicPath(req.file.filename));
    res.status(500).json({ message: "Failed to add official" });
  } finally {
    if (conn) try { await conn.close(); } catch {}
  }
});

// PUT update official
router.put("/:id", upload.single("image"), async (req, res) => {
  const { id } = req.params;
  const { name, position, contact, term_year } = req.body;
  if (!name || !position || !term_year) {
    if (req.file) await tryDeleteFile(toPublicPath(req.file.filename));
    return res.status(400).json({ message: "Name, Position, and TERM_YEAR are required." });
  }

  let conn;
  try {
    conn = await oracledb.getConnection();

    const sel = await conn.execute(`SELECT IMAGE_URL FROM OFFICIALS WHERE ID = :id`, { id }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    if (!sel.rows.length) return res.status(404).json({ message: "Official not found" });
    const existing = sel.rows[0].IMAGE_URL;

    const newImageUrl = req.file ? toPublicPath(req.file.filename) : existing;

    const sql = `
      UPDATE OFFICIALS
      SET NAME = :name, POSITION = :position, CONTACT = :contact, IMAGE_URL = :image_url, TERM_YEAR = :term_year
      WHERE ID = :id
    `;
    const result = await conn.execute(sql, { id, name, position, contact, image_url: newImageUrl, term_year: Number(term_year) }, { autoCommit: true });
    if (!result.rowsAffected) return res.status(404).json({ message: "Official not found" });

    if (req.file && existing && existing !== newImageUrl) await tryDeleteFile(existing);
    res.json({ message: "Official updated successfully.", image_url: newImageUrl });
  } catch (err) {
    console.error(err);
    if (req.file) await tryDeleteFile(toPublicPath(req.file.filename));
    res.status(500).json({ message: "Failed to update official" });
  } finally {
    if (conn) try { await conn.close(); } catch {}
  }
});

// DELETE official
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  let conn;
  try {
    conn = await oracledb.getConnection();

    const sel = await conn.execute(`SELECT IMAGE_URL FROM OFFICIALS WHERE ID = :id`, { id }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    if (!sel.rows.length) return res.status(404).json({ message: "Official not found" });
    const existing = sel.rows[0].IMAGE_URL;

    const result = await conn.execute(`DELETE FROM OFFICIALS WHERE ID = :id`, { id }, { autoCommit: true });
    if (!result.rowsAffected) return res.status(404).json({ message: "Official not found" });

    if (existing) await tryDeleteFile(existing);
    res.json({ message: "Official deleted successfully." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete official" });
  } finally {
    if (conn) try { await conn.close(); } catch {}
  }
});

// START NEW TERM - rollover current officials to previous
router.post("/start-new-year", async (req, res) => {
  const { term_year } = req.body;
  if (!term_year) return res.status(400).json({ message: "term_year is required" });

  let conn;
  try {
    conn = await oracledb.getConnection(dbConfig);
    await conn.execute(`UPDATE OFFICIALS SET STATUS = 'PREVIOUS' WHERE STATUS = 'ACTIVE'`, [], { autoCommit: true });
    res.json({ message: `New term ${term_year} started. All ACTIVE officials are now PREVIOUS.` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to start new year" });
  } finally {
    if (conn) try { await conn.close(); } catch {}
  }
});

module.exports = router;
