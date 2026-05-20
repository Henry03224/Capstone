const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");
const PizZip = require("pizzip");
const Docxtemplater = require("docxtemplater");
const oracledb = require("oracledb");
const libre = require("libreoffice-convert");
const dbConfig = require("../db");

// -------------------------
// Generate document (Pending by default)
// -------------------------
router.post("/", async (req, res) => {
  const { residentId, templateId } = req.body;
  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

    // Fetch resident
    const residentRes = await connection.execute(
      `SELECT first_name AS "FIRST_NAME", middle_name AS "MIDDLE_NAME",
              last_name AS "LAST_NAME", purok AS "PUROK",
              gender AS "GENDER", TO_CHAR(SYSDATE, 'MM/DD/YYYY') AS "TODAY"
       FROM residents WHERE resident_id = :id`,
      [residentId],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (!residentRes.rows.length)
      return res.status(404).json({ success: false, message: "Resident not found" });

    const resident = residentRes.rows[0];
    const fullName = `${resident.FIRST_NAME} ${resident.LAST_NAME}`;

    // Fetch template
    const templateRes = await connection.execute(
      `SELECT FILENAME, FILETYPE, LOCATION FROM TEMPLATES WHERE ID = :id`,
      [templateId],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (!templateRes.rows.length)
      return res.status(404).json({ success: false, message: "Template not found" });

    const template = templateRes.rows[0];
    const templatePath = path.join(__dirname, "..", template.LOCATION);

    if (!fs.existsSync(templatePath))
      return res.status(404).json({ success: false, message: "Template file missing" });

    // Load template
    const content = fs.readFileSync(templatePath, "binary");
    const zip = new PizZip(content);
    const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });

    doc.setData({
      name: fullName,
      middle: resident.MIDDLE_NAME || "",
      purok: resident.PUROK || "",
      gender: resident.GENDER || "",
      date: resident.TODAY,
    });

    doc.render();
    const buf = doc.getZip().generate({ type: "nodebuffer" });

    // Convert to PDF
    const pdfBuf = await new Promise((resolve, reject) => {
      libre.convert(buf, ".pdf", undefined, (err, done) => {
        if (err) return reject(err);
        resolve(done);
      });
    });

    // Save PDF
    const safeType = (template.FILETYPE || "Document").replace(/\s+/g, "_");
    const safeFirst = (resident.FIRST_NAME || "").replace(/\s+/g, "_");
    const safeLast = (resident.LAST_NAME || "").replace(/\s+/g, "_");
    const timestamp = Date.now();
    const outputFileName = `${safeType}_${safeFirst}_${safeLast}_${timestamp}.pdf`;
    const outputDir = path.join(__dirname, "..", "uploads", "generated");
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
    const outputPath = path.join(outputDir, outputFileName);
    fs.writeFileSync(outputPath, pdfBuf);

    // Insert into DB and store resident name
    await connection.execute(
      `INSERT INTO GENERATED_DOCS 
         (resident_id, template_id, file_path, file_type, status, created_at, resident_name)
       VALUES 
         (:residentId, :templateId, :filePath, :fileType, :status, SYSDATE, :residentName)`,
      {
        residentId,
        templateId,
        filePath: `/uploads/generated/${outputFileName}`,
        fileType: template.FILETYPE || "Document",
        status: "Pending",
        residentName: fullName,
      },
      { autoCommit: true }
    );

    res.json({
      success: true,
      file: `/uploads/generated/${outputFileName}`,
      type: "PDF",
      status: "Pending",
    });

  } catch (error) {
    console.error("Doc generation error:", error);
    res.status(500).json({ success: false, message: "Failed to generate document", error: error.message });
  } finally {
    if (connection) await connection.close();
  }
});

// -------------------------
// Fetch documents (filter by status optional)
// -------------------------
router.get("/", async (req, res) => {
  let connection;
  const { status } = req.query;

  try {
    connection = await oracledb.getConnection(dbConfig);

    let query = `
      SELECT ID, FILE_PATH, FILE_TYPE, STATUS, TO_CHAR(CREATED_AT, 'MM/DD/YYYY') AS DATE_GENERATED,
             TEMPLATE_ID, RESIDENT_ID,
             RESIDENT_NAME AS RESIDENT,  -- use stored resident name
             (SELECT FILENAME FROM templates t WHERE t.id = g.template_id) AS DOCUMENT_NAME
      FROM GENERATED_DOCS g
    `;
    const binds = [];

    if (status) {
      query += ` WHERE UPPER(STATUS) = :status`;
      binds.push(status.toUpperCase());
    }

    query += ` ORDER BY CREATED_AT DESC`;

    const result = await connection.execute(query, binds, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    res.json(result.rows);

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to fetch documents" });
  } finally {
    if (connection) await connection.close();
  }
});

// -------------------------
// Delete a document
// -------------------------
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

    const fileRes = await connection.execute(
      `SELECT file_path FROM GENERATED_DOCS WHERE ID = :id`,
      [id],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (!fileRes.rows.length)
      return res.status(404).json({ success: false, message: "Document not found" });

    const fullPath = path.join(__dirname, "..", fileRes.rows[0].FILE_PATH);

    await connection.execute(`DELETE FROM GENERATED_DOCS WHERE ID = :id`, [id], { autoCommit: true });

    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);

    res.json({ success: true, message: "Document deleted successfully." });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to delete document" });
  } finally {
    if (connection) await connection.close();
  }
});

// -------------------------
// Approve a document
// -------------------------
router.patch("/status/:id", async (req, res) => {
  const { id } = req.params;
  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

    await connection.execute(
      `UPDATE GENERATED_DOCS SET STATUS = 'Approve' WHERE ID = :id`,
      [id],
      { autoCommit: true }
    );

    res.json({ success: true, message: "Document approved successfully." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to approve document" });
  } finally {
    if (connection) await connection.close();
  }
});

// -------------------------
// Count approved documents
// -------------------------
router.get("/approved-count", async (req, res) => {
  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);

    const result = await connection.execute(
      `SELECT COUNT(*) AS COUNT FROM GENERATED_DOCS WHERE STATUS = 'Approve'`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    res.json({ count: result.rows[0].COUNT || 0 });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to fetch approved count" });
  } finally {
    if (connection) await connection.close();
  }
});

// -------------------------
// Count pending documents
// -------------------------
router.get("/pending-count", async (req, res) => {
  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);

    const result = await connection.execute(
      `SELECT COUNT(*) AS "COUNT" FROM GENERATED_DOCS WHERE STATUS = 'Pending'`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    res.json({ count: result.rows[0].COUNT ?? 0 });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to fetch pending count" });
  } finally {
    if (connection) await connection.close();
  }
});

module.exports = router;
