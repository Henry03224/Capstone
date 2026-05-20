const express = require("express");
const router = express.Router();
const oracledb = require("oracledb");
const dbConfig = require("../db");

// ================= GET ALL ACTIVITY LOGS =================
router.get("/", async (req, res) => {
  let conn;

  try {
    conn = await oracledb.getConnection(dbConfig);

    const sql = `
      SELECT 
        USERNAME,
        ACTION,
        TO_CHAR(CREATED_AT, 'YYYY-MM-DD HH24:MI:SS') AS CREATED_AT
      FROM ACTIVITY_LOGS
      ORDER BY CREATED_AT DESC
    `;

    const result = await conn.execute(sql, [], {
      outFormat: oracledb.OUT_FORMAT_OBJECT
    });

    res.json(result.rows);

  } catch (err) {
    console.error("Fetch logs error:", err);
    res.status(500).json({
      message: "Failed to fetch activity logs."
    });

  } finally {
    if (conn) {
      try { await conn.close(); } catch (e) {}
    }
  }
});

module.exports = router;