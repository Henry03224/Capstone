const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const oracledb = require("oracledb");
const mysql = require("mysql2/promise");

const dbConfig = require("../db");

require("dotenv").config();


// ============================================
// MYSQL CONFIG
// ============================================
const mysqlPool = mysql.createPool({
  host: process.env.MYSQL_HOST || "localhost",
  user: process.env.MYSQL_USER || "root",
  password: process.env.MYSQL_PASSWORD || "root",
  database: process.env.MYSQL_DATABASE || "abongan_residents",
});


// ============================================
// DIRECTORIES
// ============================================
const generatedDir = path.join(__dirname, "../generated");
const uploadDir = path.join(__dirname, "../uploads");
const purokDir = path.join(__dirname, "../uploads/purok");

[generatedDir, uploadDir, purokDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});


// ============================================
// MULTER STORAGE
// ============================================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, generatedDir);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});

const upload = multer({ storage });


// ============================================
// CLEAN ORACLE VALUES
// ============================================
function cleanOracleValue(value) {
  if (value === null || value === undefined) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Buffer.isBuffer(value)) {
    return value.toString("base64");
  }

  if (typeof value === "object") {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch {
      return String(value);
    }
  }

  return value;
}

function cleanOracleRow(row) {
  const cleaned = {};

  for (const key in row) {
    cleaned[key] = cleanOracleValue(row[key]);
  }

  return cleaned;
}


// ============================================
// LIST BACKUPS
// ============================================
router.get("/list", async (req, res) => {
  try {
    const files = fs
      .readdirSync(generatedDir)
      .filter((file) => file.endsWith(".json"))
      .sort((a, b) => {
        return (
          fs.statSync(path.join(generatedDir, b)).mtime.getTime() -
          fs.statSync(path.join(generatedDir, a)).mtime.getTime()
        );
      });

    res.json({
      success: true,
      files,
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});


// ============================================
// EXPORT BACKUP
// ============================================
router.get("/export", async (req, res) => {
  let oracleConn;
  let mysqlConn;

  try {
    oracleConn = await oracledb.getConnection(dbConfig);
    mysqlConn = await mysqlPool.getConnection();

    const backupData = {
      backupDate: new Date().toISOString(),
      oracle: {},
      mysql: {},
      files: {},
    };

    // Only application tables
    const tableResult = await oracleConn.execute(
      `
      SELECT table_name
      FROM user_tables
      WHERE table_name NOT LIKE 'BIN$%'
      AND table_name NOT LIKE 'MVIEW$%'
      AND table_name NOT LIKE 'REPL_%'
      AND table_name NOT LIKE 'LOGMNR_%'
      AND table_name NOT LIKE 'AQ$%'
      ORDER BY table_name
      `,
      [],
      {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
      }
    );

    const tables = tableResult.rows.map(
      (row) => row.TABLE_NAME || row.table_name
    );

    console.log("Oracle Tables:", tables);

    // Backup Oracle Tables
    for (const table of tables) {
      try {
        const result = await oracleConn.execute(
          `SELECT * FROM "${table}"`,
          [],
          {
            outFormat: oracledb.OUT_FORMAT_OBJECT,
          }
        );

        backupData.oracle[table] = result.rows.map(cleanOracleRow);

      } catch (err) {
        console.log(`Skipping ${table}: ${err.message}`);
      }
    }


    // Backup MySQL archived residents
    try {
      const [rows] = await mysqlConn.query(
        `SELECT * FROM archived_residents`
      );

      backupData.mysql.archived_residents = rows;

    } catch (err) {
      console.log("MySQL backup failed:", err.message);
    }


    // Backup profile uploads
    if (fs.existsSync(uploadDir)) {
      const files = fs.readdirSync(uploadDir);

      backupData.files.uploads = [];

      for (const file of files) {
        const filePath = path.join(uploadDir, file);

        if (fs.statSync(filePath).isFile()) {
          backupData.files.uploads.push({
            name: file,
            data: fs.readFileSync(filePath).toString("base64"),
          });
        }
      }
    }


    // Backup purok uploads
    if (fs.existsSync(purokDir)) {
      const files = fs.readdirSync(purokDir);

      backupData.files.purok = [];

      for (const file of files) {
        const filePath = path.join(purokDir, file);

        if (fs.statSync(filePath).isFile()) {
          backupData.files.purok.push({
            name: file,
            data: fs.readFileSync(filePath).toString("base64"),
          });
        }
      }
    }


    // ============================================
    // SAVE JSON FILE WITH DATE + TIME
    // ============================================
    const now = new Date();

    const formattedDate = now
      .toISOString()
      .replace("T", "_")
      .replace(/:/g, "-")
      .split(".")[0];

    const filename = `backup-${formattedDate}.json`;
    const filePath = path.join(generatedDir, filename);

    fs.writeFileSync(
      filePath,
      JSON.stringify(backupData, null, 2)
    );

    res.json({
      success: true,
      message: "Backup completed successfully",
      file: filename,
    });

  } catch (err) {
    console.error("Backup failed:", err);

    res.status(500).json({
      success: false,
      error: err.message,
    });

  } finally {
    if (oracleConn) {
      try {
        await oracleConn.close();
      } catch {}
    }

    if (mysqlConn) {
      try {
        mysqlConn.release();
      } catch {}
    }
  }
});


// ============================================
// IMPORT BACKUP
// ============================================
router.post("/import", async (req, res) => {
  let oracleConn;
  let mysqlConn;

  try {
    const { filename } = req.body;

    if (!filename) {
      return res.status(400).json({
        success: false,
        error: "Filename required",
      });
    }

    const filePath = path.join(generatedDir, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: "Backup file not found",
      });
    }

    const rawData = fs.readFileSync(filePath, "utf8");

    if (!rawData || rawData.trim() === "") {
      return res.status(400).json({
        success: false,
        error: "Backup file is empty",
      });
    }

    let backupData;

    try {
      backupData = JSON.parse(rawData);
    } catch {
      return res.status(400).json({
        success: false,
        error: "Invalid backup JSON file",
      });
    }

    oracleConn = await oracledb.getConnection(dbConfig);
    mysqlConn = await mysqlPool.getConnection();


    // Clear Oracle tables
    const oracleTables = Object.keys(backupData.oracle);

    for (const table of [...oracleTables].reverse()) {
      try {
        await oracleConn.execute(
          `DELETE FROM "${table}"`
        );
        console.log(`Cleared ${table}`);
      } catch (err) {
        console.log(`Skip delete ${table}: ${err.message}`);
      }
    }

    await oracleConn.commit();


    // Restore Oracle tables
    for (const table of oracleTables) {
      const rows = backupData.oracle[table];

      for (const row of rows) {
        try {
          const cleanedRow = {};

          for (const key in row) {
            let value = row[key];

            if (typeof value === "string") {
              if (/^\d{4}-\d{2}-\d{2}T/.test(value)) {
                value = new Date(value);
              }
            }

            cleanedRow[key] = value;
          }

          const columns = Object.keys(cleanedRow);

          const placeholders = columns
            .map((col) => `:${col}`)
            .join(",");

          const quotedColumns = columns
            .map((col) => `"${col}"`)
            .join(",");

          await oracleConn.execute(
            `INSERT INTO "${table}" (${quotedColumns})
             VALUES (${placeholders})`,
            cleanedRow
          );

        } catch (err) {
          console.log(
            `Skipped restore ${table}: ${err.message}`
          );
        }
      }
    }

    await oracleConn.commit();


    // Restore MySQL
    try {
      await mysqlConn.query(
        `DELETE FROM archived_residents`
      );
    } catch (err) {
      console.log(err.message);
    }

    if (backupData.mysql?.archived_residents) {
      for (const row of backupData.mysql.archived_residents) {
        try {
          await mysqlConn.query(
            `INSERT INTO archived_residents SET ?`,
            row
          );
        } catch (err) {
          console.log(
            "MySQL restore skipped:",
            err.message
          );
        }
      }
    }


    // Restore uploads
    if (backupData.files.uploads) {
      for (const file of backupData.files.uploads) {
        fs.writeFileSync(
          path.join(uploadDir, file.name),
          Buffer.from(file.data, "base64")
        );
      }
    }


    // Restore purok files
    if (backupData.files.purok) {
      for (const file of backupData.files.purok) {
        fs.writeFileSync(
          path.join(purokDir, file.name),
          Buffer.from(file.data, "base64")
        );
      }
    }

    res.json({
      success: true,
      message: "Backup restored successfully",
    });

  } catch (err) {
    console.error("Import failed:", err);

    res.status(500).json({
      success: false,
      error: err.message,
    });

  } finally {
    if (oracleConn) {
      try {
        await oracleConn.close();
      } catch {}
    }

    if (mysqlConn) {
      try {
        mysqlConn.release();
      } catch {}
    }
  }
});


// ============================================
// UPLOAD IMPORT
// ============================================
router.post(
  "/upload-import",
  upload.single("backup"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: "No file uploaded",
        });
      }

      if (!req.file.originalname.endsWith(".json")) {
        fs.unlinkSync(req.file.path);

        return res.status(400).json({
          success: false,
          error: "Only JSON files allowed",
        });
      }

      const content = fs.readFileSync(
        req.file.path,
        "utf8"
      );

      if (!content.trim()) {
        fs.unlinkSync(req.file.path);

        return res.status(400).json({
          success: false,
          error: "Uploaded file is empty",
        });
      }

      try {
        JSON.parse(content);
      } catch {
        fs.unlinkSync(req.file.path);

        return res.status(400).json({
          success: false,
          error: "Invalid JSON file",
        });
      }

      res.json({
        success: true,
        message: "Backup uploaded successfully",
        filename: req.file.filename,
      });

    } catch (err) {
      console.error(err);

      res.status(500).json({
        success: false,
        error: err.message,
      });
    }
  }
);

module.exports = router;