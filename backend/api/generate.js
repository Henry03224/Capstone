const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");
const os = require("os");
const { execSync } = require("child_process");
const PizZip = require("pizzip");
const Docxtemplater = require("docxtemplater");
const oracledb = require("oracledb");
const dbConfig = require("../db");

const librePath = `"C:\\Program Files\\LibreOffice\\program\\soffice.exe"`;

// ✅ SUPERSCRIPT ORDINAL FUNCTION
function getOrdinalSuffix(day) {
  const d = parseInt(day, 10);
  if (!d) return "";

  const suffixMap = {
    st: "ˢᵗ",
    nd: "ⁿᵈ",
    rd: "ʳᵈ",
    th: "ᵗʰ"
  };

  let suffix = "th";

  if (d >= 11 && d <= 13) suffix = "th";
  else {
    switch (d % 10) {
      case 1: suffix = "st"; break;
      case 2: suffix = "nd"; break;
      case 3: suffix = "rd"; break;
      default: suffix = "th";
    }
  }

  return `${d}${suffixMap[suffix]}`;
}

router.post("/", async (req, res) => {
  const { residentId, templateId, purpose } = req.body;
  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

    const residentRes = await connection.execute(
      `SELECT first_name AS "FIRST_NAME",
              middle_name AS "MIDDLE_NAME",
              last_name AS "LAST_NAME",
              purok AS "PUROK",
              gender AS "GENDER",
              civil_status AS "CIVIL_STATUS",
              TO_CHAR(SYSDATE, 'MM/DD/YYYY') AS "TODAY",
              TO_NUMBER(TO_CHAR(SYSDATE, 'DD')) AS "DAY",
              TO_CHAR(SYSDATE, 'Month') AS "MONTH",
              TO_CHAR(SYSDATE, 'YYYY') AS "YEAR"
       FROM residents
       WHERE resident_id = :id`,
      [residentId],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (!residentRes.rows.length) {
      return res.status(404).json({ success: false, message: "Resident not found" });
    }

    const resident = residentRes.rows[0];

    let prefix = "Mr./Ms.";
    if (resident.GENDER && resident.CIVIL_STATUS) {
      const gender = resident.GENDER.toLowerCase();
      const civil = resident.CIVIL_STATUS.toLowerCase();

      if (gender === "male") prefix = "Mr.";
      else if (gender === "female")
        prefix = civil === "married" ? "Mrs." : "Ms.";
    }

    const templateRes = await connection.execute(
      `SELECT FILENAME, FILETYPE, LOCATION FROM TEMPLATES WHERE ID = :id`,
      [templateId],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const template = templateRes.rows[0];
    const templatePath = path.join(__dirname, "..", template.LOCATION);

    const content = fs.readFileSync(templatePath, "binary");
    const zip = new PizZip(content);

    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      nullGetter: () => ""
    });

    // ✅ RENDER WITH SUPERSCRIPT DAY
    doc.render({
      prefix,
      name: `${resident.FIRST_NAME} ${resident.LAST_NAME}`,
      first_name: resident.FIRST_NAME,
      last_name: resident.LAST_NAME,
      middle: resident.MIDDLE_NAME,
      purok: resident.PUROK,
      gender: resident.GENDER,
      civil_status: resident.CIVIL_STATUS,

      // 🔥 SUPERSCRIPT OUTPUT HERE
      day: getOrdinalSuffix(resident.DAY || new Date().getDate()),

      month: resident.MONTH ? resident.MONTH.trim() : "",
      year: resident.YEAR,
      date: resident.TODAY,
      purpose: purpose || ""
    });

    const buf = doc.getZip().generate({ type: "nodebuffer" });

    const tempFolder = fs.mkdtempSync(path.join(os.tmpdir(), "libreoffice_"));
    const tempDocPath = path.join(tempFolder, "file.docx");

    fs.writeFileSync(tempDocPath, buf);

    execSync(
      `${librePath} --headless --convert-to pdf --outdir "${tempFolder}" "${tempDocPath}"`
    );

    const pdfFile = fs.readdirSync(tempFolder).find(f => f.endsWith(".pdf"));
    const pdfBuf = fs.readFileSync(path.join(tempFolder, pdfFile));

    const outputFileName = `Document_${Date.now()}.pdf`;
    const outputDir = path.join(__dirname, "..", "uploads", "generated");

    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    fs.writeFileSync(path.join(outputDir, outputFileName), pdfBuf);

    res.json({
      success: true,
      file: `/uploads/generated/${outputFileName}`
    });

    fs.rmSync(tempFolder, { recursive: true, force: true });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    if (connection) await connection.close();
  }
});

module.exports = router;