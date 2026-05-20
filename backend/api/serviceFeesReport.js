const express = require("express");
const router = express.Router();
const oracledb = require("oracledb");
const dbConfig = require("../db");

router.get("/", async (req, res) => {
  const { q = "", status = "", date_from = "", date_to = "" } = req.query;
  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

    // Base query for fetching service fees reports
    let query = `
      SELECT sf.ID, r.FIRST_NAME || ' ' || r.LAST_NAME AS RESIDENT, 
             d.FILENAME AS DOCUMENT_NAME, sf.DATE_GENERATED, 
             sf.FILE_TYPE, sf.STATUS, sf.AMOUNT
      FROM SERVICE_FEES sf
      JOIN GENERATED_DOCS gd ON sf.GENERATED_DOC_ID = gd.ID
      JOIN RESIDENTS r ON gd.RESIDENT_ID = r.RESIDENT_ID
      JOIN TEMPLATES d ON gd.TEMPLATE_ID = d.ID
      WHERE 1=1
    `;

    // Apply filters to the query
    if (q) {
      query += ` AND (r.FIRST_NAME || ' ' || r.LAST_NAME LIKE :q 
                  OR d.FILENAME LIKE :q)`;
    }
    if (status) {
      query += ` AND sf.STATUS = :status`;
    }
    if (date_from) {
      query += ` AND sf.DATE_GENERATED >= TO_DATE(:date_from, 'YYYY-MM-DD')`;
    }
    if (date_to) {
      query += ` AND sf.DATE_GENERATED <= TO_DATE(:date_to, 'YYYY-MM-DD')`;
    }

    // Execute the query
    const result = await connection.execute(query, {
      q: `%${q}%`,
      status,
      date_from,
      date_to,
    }, { outFormat: oracledb.OUT_FORMAT_OBJECT });

    res.json(result.rows);  // Respond with the fetched data
  } catch (error) {
    console.error("Error fetching service fees reports:", error);
    res.status(500).json({ success: false, message: "Failed to fetch service fees report" });
  } finally {
    if (connection) await connection.close();
  }
});

module.exports = router;
