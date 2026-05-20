const express = require("express");
const router = express.Router();
const oracledb = require("oracledb");
const dbConfig = require("../db");

// ===============================
// GET ALL ACCOUNTS
// ===============================
router.get("/", async (req, res) => {
  let conn;

  try {
    conn = await oracledb.getConnection(dbConfig);

    const sql = `
      SELECT 
        FIRST_NAME,
        MIDDLE_NAME,
        LAST_NAME,
        SUFFIX,
        USERNAME,
        POSITION
      FROM USERS
      ORDER BY LAST_NAME, FIRST_NAME
    `;

    const result = await conn.execute(
      sql,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    res.json(result.rows);

  } catch (err) {
    console.error("Error fetching accounts:", err);
    res.status(500).json({ message: "Failed to fetch accounts" });
  } finally {
    if (conn) {
      try { await conn.close(); } catch (e) {}
    }
  }
});

// ===============================
// UPDATE POSITION
// ===============================
router.put("/:username", async (req, res) => {
  const { username } = req.params;
  const { position } = req.body;

  if (!position) {
    return res.status(400).json({ message: "Position is required." });
  }

  let conn;

  try {
    conn = await oracledb.getConnection(dbConfig);

    const sql = `
      UPDATE USERS
      SET POSITION = :position
      WHERE USERNAME = :username
    `;

    const result = await conn.execute(
      sql,
      { position, username },
      { autoCommit: true }
    );

    if (result.rowsAffected === 0) {
      return res.status(404).json({ message: "User not found." });
    }

    res.json({ message: "Position updated successfully." });

  } catch (err) {
    console.error("Error updating position:", err);
    res.status(500).json({ message: "Failed to update position." });
  } finally {
    if (conn) {
      try { await conn.close(); } catch (e) {}
    }
  }
});

// ===============================
// DELETE ACCOUNT
// ===============================
router.delete("/:username", async (req, res) => {
  const { username } = req.params;

  let conn;

  try {
    conn = await oracledb.getConnection(dbConfig);

    const sql = `
      DELETE FROM USERS
      WHERE USERNAME = :username
    `;

    const result = await conn.execute(
      sql,
      { username },
      { autoCommit: true }
    );

    if (result.rowsAffected === 0) {
      return res.status(404).json({ message: "User not found." });
    }

    res.json({ message: "Account deleted successfully." });

  } catch (err) {
    console.error("Error deleting account:", err);
    res.status(500).json({ message: "Failed to delete account." });
  } finally {
    if (conn) {
      try { await conn.close(); } catch (e) {}
    }
  }
});

module.exports = router;