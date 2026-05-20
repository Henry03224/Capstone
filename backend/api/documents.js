const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");
const PizZip = require("pizzip");
const Docxtemplater = require("docxtemplater");
const oracledb = require("oracledb");
const libre = require("libreoffice-convert");
const dbConfig = require("../db");
const axios = require("axios");
const admin = require("firebase-admin");

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
      `SELECT first_name AS "FIRST_NAME",
              middle_name AS "MIDDLE_NAME",
              last_name AS "LAST_NAME",
              purok AS "PUROK",
              gender AS "GENDER",
              civil_status AS "CIVIL_STATUS",
              TO_CHAR(SYSDATE, 'MM/DD/YYYY') AS "TODAY"
       FROM residents WHERE resident_id = :id`,
      [residentId],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (!residentRes.rows.length)
      return res.status(404).json({ success: false, message: "Resident not found" });

    const resident = residentRes.rows[0];

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
      name: `${resident.FIRST_NAME} ${resident.LAST_NAME}`,
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

    // Insert into DB (store resident name for deleted residents)
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
        residentName: `${resident.FIRST_NAME} ${resident.LAST_NAME}`,
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
// Delete a document (WITH CONFIRMATION CHECK)
// -------------------------
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  const { confirmation } = req.body; // Expecting { confirmation: "confirm" }

  // 1. Check Confirmation String
  if (confirmation !== "confirm") {
    return res.status(400).json({ 
      success: false, 
      message: "Action failed. Please type 'confirm' to delete this document." 
    });
  }

  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

    // 2. Get File Path
    const fileRes = await connection.execute(
      `SELECT file_path FROM GENERATED_DOCS WHERE ID = :id`,
      [id],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (!fileRes.rows.length)
      return res.status(404).json({ success: false, message: "Document not found" });

    const fullPath = path.join(__dirname, "..", fileRes.rows[0].FILE_PATH);

    // 3. Delete from DB
    await connection.execute(`DELETE FROM GENERATED_DOCS WHERE ID = :id`, [id], { autoCommit: true });

    // 4. Delete File from System
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
// Approve document + auto fee
// -------------------------
router.patch("/status/:id", async (req, res) => {
  const { id } = req.params;
  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

    /* =====================================
       1. GET DOCUMENT
    ===================================== */
    const docRes = await connection.execute(
      `SELECT FILE_TYPE, RESIDENT_ID FROM GENERATED_DOCS WHERE ID = :id`,
      { id: Number(id) },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (!docRes.rows.length) {
      return res.status(404).json({ success: false, message: "Document not found" });
    }

    const { FILE_TYPE, RESIDENT_ID } = docRes.rows[0];

    /* =====================================
       2. GET FEE
    ===================================== */
    const feeRes = await connection.execute(
      `SELECT FEE FROM SERVICES WHERE LOWER(TRIM(TYPE)) = LOWER(TRIM(:type))`,
      { type: FILE_TYPE },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const fee = feeRes.rows.length ? feeRes.rows[0].FEE : 0; // Added safety check if fee not found

    /* =====================================
       3. UPDATE DOCUMENT
    ===================================== */
    await connection.execute(
      `UPDATE GENERATED_DOCS SET STATUS = 'Approved', FEE = :fee WHERE ID = :id`,
      { fee, id: Number(id) },
      { autoCommit: true }
    );

    /* =====================================
       4. GET RESIDENT
    ===================================== */
    const residentRes = await connection.execute(
      `SELECT first_name, last_name, phone_number, email 
       FROM residents WHERE resident_id = :rid`,
      { rid: RESIDENT_ID },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const resident = residentRes.rows[0];
    const residentName = `${resident.FIRST_NAME} ${resident.LAST_NAME}`;
    const CONTACT = resident.PHONE_NUMBER;

    /* =====================================
       5. SEND SMS
    ===================================== */
    let smsStatus = "Skipped";

    if (CONTACT) {
      let sms = `Good day ${residentName}. Your ${FILE_TYPE} document is APPROVED. Fee: P${fee}. You may now claim it at Brgy Abongan.`;
      const smsEncoded = encodeURIComponent(sms);

      try {
        await axios.get(
          `http://192.168.248.177:8080/?phone=${CONTACT}&message=${smsEncoded}&key=MY_SECRET_KEY`,
          { timeout: 8000 }
        );
        smsStatus = "Sent";
      } catch (err) {
        smsStatus = "Failed";
      }
    }

    /* =====================================
       6. FIREBASE PUSH NOTIFICATION
    ===================================== */
    let pushStatus = "Skipped";

    try {
      const snapshot = await admin
        .database()
        .ref("users")
        .orderByChild("email")
        .equalTo(resident.EMAIL)
        .once("value");

      const users = snapshot.val();

      if (users) {
        const user = Object.values(users)[0];

        if (user.deviceToken) {
          const message = {
            token: user.deviceToken,
            notification: {
              title: "Document Approved",
              body: `Good day ${residentName}. Your ${FILE_TYPE} is approved. Fee: P${fee}.`,
            },
            android: {
              priority: "high",
            },
            data: {
              documentId: String(id),
              fee: String(fee),
              type: FILE_TYPE,
            },
          };

          await admin.messaging().send(message);
          pushStatus = "Sent";
        }
      }
    } catch (err) {
      console.error("FCM Error:", err.message);
      pushStatus = "Failed";
    }

    /* =====================================
       7. RESPONSE
    ===================================== */
    res.json({
      success: true,
      message: "Document Approved",
      fee,
      smsStatus,
      pushStatus,
      resident: {
        name: residentName,
        phone: CONTACT,
      },
    });

  } catch (err) {
    console.error("Approve failed:", err);
    res.status(500).json({ success: false, error: err.message });
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
      `SELECT COUNT(*) AS COUNT FROM GENERATED_DOCS WHERE STATUS = 'Approved'`, // Fixed spelling to 'Approved' based on PATCH logic
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

// -------------------------
// Fee summary (day | month | year)
// -------------------------
router.get("/fee-summary", async (req, res) => {
  const { type, month, year } = req.query;
  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

    let query = "";
    const binds = { year: Number(year) };

    if (type === "day") {
      binds.month = Number(month);
      query = `
        SELECT TO_CHAR(CREATED_AT, 'DD') AS LABEL,
               NVL(SUM(FEE), 0) AS TOTAL
        FROM GENERATED_DOCS
        WHERE STATUS = 'Approved'
          AND EXTRACT(MONTH FROM CREATED_AT) = :month
          AND EXTRACT(YEAR FROM CREATED_AT) = :year
        GROUP BY TO_CHAR(CREATED_AT, 'DD')
        ORDER BY LABEL
      `;
    } else if (type === "month") {
      query = `
        SELECT TO_CHAR(CREATED_AT, 'MM') AS LABEL,
               NVL(SUM(FEE), 0) AS TOTAL
        FROM GENERATED_DOCS
        WHERE STATUS = 'Approved'
          AND EXTRACT(YEAR FROM CREATED_AT) = :year
        GROUP BY TO_CHAR(CREATED_AT, 'MM')
        ORDER BY LABEL
      `;
    } else {
      query = `
        SELECT TO_CHAR(CREATED_AT, 'YYYY') AS LABEL,
               NVL(SUM(FEE), 0) AS TOTAL
        FROM GENERATED_DOCS
        WHERE STATUS = 'Approved'
        GROUP BY TO_CHAR(CREATED_AT, 'YYYY')
        ORDER BY LABEL
      `;
    }

    const result = await connection.execute(query, binds, {
      outFormat: oracledb.OUT_FORMAT_OBJECT
    });

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch summary" });
  } finally {
    if (connection) await connection.close();
  }
});

// -------------------------
// Get Document Details
// -------------------------
router.get("/details", async (req, res) => {
  let connection;
  const { status, date_from, date_to } = req.query;

  try {
    connection = await oracledb.getConnection(dbConfig);

    let query = `
      SELECT
        g.ID,
        g.RESIDENT_NAME AS RESIDENT,
        (SELECT FILENAME FROM TEMPLATES t WHERE t.ID = g.TEMPLATE_ID) AS DOCUMENT_NAME,
        g.FILE_TYPE,
        g.STATUS,
        g.FEE AS AMOUNT,
        TO_CHAR(g.CREATED_AT, 'YYYY-MM-DD') AS DATE_GENERATED
      FROM GENERATED_DOCS g
      WHERE 1=1
    `;

    const binds = {};

    if (status) {
      query += ` AND UPPER(g.STATUS) = :status`;
      binds.status = status.toUpperCase();
    }

    if (date_from) {
      query += ` AND g.CREATED_AT >= TO_DATE(:date_from, 'YYYY-MM-DD')`;
      binds.date_from = date_from;
    }

    if (date_to) {
      query += ` AND g.CREATED_AT <= TO_DATE(:date_to, 'YYYY-MM-DD')`;
      binds.date_to = date_to;
    }

    query += ` ORDER BY g.CREATED_AT DESC`;

    const result = await connection.execute(query, binds, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    res.json(result.rows);

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to fetch document details" });
  } finally {
    if (connection) await connection.close();
  }
});

module.exports = router;