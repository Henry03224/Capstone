/**
 * resident.js
 * 
 * Backend router for handling residents in the Abongan Barangay system.
 * UPDATED: SMS logic now uses process.env variables.
 */

const express = require('express');
const oracledb = require('oracledb');
const dbConfig = require('../db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const admin = require('../firebase');
const mysql = require("mysql2/promise");
const axios = require("axios");

// Ensure environment variables are loaded if not already in server.js
require('dotenv').config(); 

const mysqlPool = mysql.createPool({
  host: process.env.MYSQL_HOST || "localhost",
  user: process.env.MYSQL_USER || "root",
  password: process.env.MYSQL_PASSWORD || "root",
  database: process.env.MYSQL_DATABASE || "abongan_residents"
});

const router = express.Router();

// -------------------- Setup Uploads Directory --------------------
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

// -------------------- Multer Setup --------------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueName =
      Date.now() + '-' + Math.round(Math.random() * 1e9) + path.extname(file.originalname);
    cb(null, uniqueName);
  },
});
const upload = multer({ storage });

// -------------------- CREATE RESIDENT --------------------
router.post('/', upload.single('profile_image'), async (req, res) => {
  const { first_name, middle_name, last_name, birth_date, gender, civil_status, purok, email, phone_number } = req.body;
  const profile_image = req.file ? `/uploads/${req.file.filename}` : null;

  const today = new Date();
  const birthDateObj = new Date(birth_date);
  let age = today.getFullYear() - birthDateObj.getFullYear();
  const monthDiff = today.getMonth() - birthDateObj.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDateObj.getDate())) age--;

  if (age < 18) {
    return res.status(400).json({ message: 'Resident must be at least 18 years old.' });
  }

  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);

    const result = await connection.execute(
      `INSERT INTO residents (
        first_name, middle_name, last_name, birth_date,
        gender, civil_status, purok, email, phone_number, profile_image
      ) VALUES (
        :first_name, :middle_name, :last_name, TO_DATE(:birth_date,'YYYY-MM-DD'),
        :gender, :civil_status, :purok, :email, :phone_number, :profile_image
      ) RETURNING resident_id INTO :resident_id`,
      {
        first_name,
        middle_name,
        last_name,
        birth_date,
        gender,
        civil_status,
        purok,
        email,
        phone_number,
        profile_image,
        resident_id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
      },
      { autoCommit: true }
    );

    const newResidentId = result.outBinds.resident_id[0];

    const purokResult = await connection.execute(
      `SELECT DISTINCT PUROK FROM RESIDENTS ORDER BY PUROK`,
      [], { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const purokList = purokResult.rows.map(r => r.PUROK);

    // -------------------- UPDATED SMS LOGIC --------------------
    let smsStatus = "Skipped (no phone)";
    if (phone_number) {
      try {
        let sms = `Good day ${first_name} ${middle_name || ""} ${last_name}. You are now registered as a resident of Brgy Abongan. Welcome!`;
        sms = sms.replace(/\s+/g, " ").trim();
        sms = sms.replace(/[!₱.]/g, ""); // sanitize

        const smsEncoded = encodeURIComponent(sms);
        
        // Use Env Variables
        const smsServer = process.env.SMS_SERVER_URL;
        const smsKey = process.env.SMS_KEY;
        
        const gatewayUrl = `${smsServer}/?phone=${phone_number}&message=${smsEncoded}&key=${smsKey}`;

        console.log("Sending SMS:", gatewayUrl);
        const response = await axios.get(gatewayUrl, { timeout: 5000 });
        smsStatus = response.data?.status === "sent" ? "Sent" : `Failed (status: ${response.status})`;
      } catch (err) {
        console.warn("SMS send failed:", err.message);
        smsStatus = "Failed / Logged";
      }
    }
    // -----------------------------------------------------------

    res.status(201).json({
      success: true,
      message: 'Resident saved successfully.',
      data: { resident_id: newResidentId, profile_image, purokList, smsStatus }
    });

  } catch (err) {
    console.error('❌ Error saving resident:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to save resident.', data: null });
  } finally {
    if (connection) try { await connection.close(); } catch {}
  }
});

// -------------------- GET ALL RESIDENTS --------------------
router.get('/', async (req, res) => {
  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);
    const result = await connection.execute(
      `SELECT 
          resident_id AS "resident_id",
          first_name AS "first_name", 
          middle_name AS "middle_name", 
          last_name AS "last_name", 
          TO_CHAR(birth_date, 'YYYY-MM-DD') AS "birth_date", 
          gender AS "gender", 
          civil_status AS "civil_status", 
          purok AS "purok",
          'Abongan' AS "barangay",
          email AS "email",
          phone_number AS "phone_number",
          profile_image AS "profile_image"
        FROM residents`,
      [], { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Error fetching residents:', err);
    res.status(500).json({ message: 'Failed to fetch residents' });
  } finally {
    if (connection) try { await connection.close(); } catch {}
  }
});

// -------------------- SEARCH RESIDENTS --------------------
router.get('/search', async (req, res) => {
  const { name } = req.query;
  if (!name || name.trim() === '') return res.status(400).json({ message: 'Search term is required' });

  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);
    const result = await connection.execute(
      `SELECT 
          resident_id AS "resident_id",
          first_name AS "first_name",
          middle_name AS "middle_name",
          last_name AS "last_name",
          TO_CHAR(birth_date, 'YYYY-MM-DD') AS "birth_date",
          gender AS "gender",
          civil_status AS "civil_status",
          purok AS "purok",
          'Abongan' AS "barangay",
          email AS "email",
          phone_number AS "phone_number",
          profile_image AS "profile_image"
        FROM residents
        WHERE LOWER(first_name) LIKE LOWER(:name)
          OR LOWER(last_name) LIKE LOWER(:name)
          OR LOWER(middle_name) LIKE LOWER(:name)
          OR LOWER(email) LIKE LOWER(:name)
          OR LOWER(phone_number) LIKE LOWER(:name)`,
      [`%${name}%`], { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    res.json(result.rows);
  } catch (err) {
    console.error('❌ Error searching residents:', err);
    res.status(500).json({ message: 'Failed to search residents.' });
  } finally {
    if (connection) try { await connection.close(); } catch {}
  }
});

// -------------------- GET RESIDENT COUNT --------------------
router.get('/count', async (req, res) => {
  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);
    const result = await connection.execute(
      `SELECT COUNT(*) AS total FROM residents`,
      [], { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    res.json({ total: result.rows[0].TOTAL });
  } catch (err) {
    console.error('❌ Error fetching resident count:', err);
    res.status(500).json({ message: 'Failed to fetch resident count' });
  } finally {
    if (connection) try { await connection.close(); } catch {}
  }
});

// -------------------- GET ALL ARCHIVED RESIDENTS (MYSQL) --------------------
router.get('/archived', async (req, res) => {
  let mysqlConn;
  try {
    mysqlConn = await mysqlPool.getConnection();
    const [rows] = await mysqlConn.query(`
        SELECT 
          resident_id,
          first_name,
          middle_name,
          last_name,
          DATE_FORMAT(birth_date, '%Y-%m-%d') AS birth_date,
          gender,
          civil_status,
          purok,
          email,
          phone_number,
          profile_image,
          archive_reason,
          DATE_FORMAT(archived_at, '%Y-%m-%d %H:%i:%s') AS archived_at
        FROM archived_residents
        ORDER BY archived_at DESC
      `);
    res.json(rows);
  } catch (err) {
    console.error('❌ Error fetching archived residents:', err);
    res.status(500).json({ message: 'Failed to fetch archived residents' });
  } finally {
    if (mysqlConn) await mysqlConn.release().catch(() => { });
  }
});

// -------------------- GET RESIDENT BY ID --------------------
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  if (!id || isNaN(Number(id))) return res.status(400).json({ message: 'Invalid resident ID. Must be a number.' });

  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);
    const result = await connection.execute(
      `SELECT 
          resident_id AS "resident_id",
          first_name AS "first_name",
          middle_name AS "middle_name",
          last_name AS "last_name",
          TO_CHAR(birth_date, 'YYYY-MM-DD') AS "birth_date",
          gender AS "gender",
          civil_status AS "civil_status",
          purok AS "purok",
          'Abongan' AS "barangay",
          email AS "email",
          phone_number AS "phone_number",
          profile_image AS "profile_image"
        FROM residents
        WHERE resident_id = :id`,
      [Number(id)], { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (result.rows.length === 0) return res.status(404).json({ message: 'Resident not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('❌ Error fetching resident by ID:', err);
    res.status(500).json({ message: 'Failed to fetch resident.' });
  } finally {
    if (connection) try { await connection.close(); } catch {}
  }
});

// -------------------- UPDATE RESIDENT --------------------
router.put('/:id', upload.single('profile_image'), async (req, res) => {
  const { id } = req.params;
  const { first_name, middle_name, last_name, birth_date, gender, civil_status, purok, email, phone_number } = req.body;
  if (!id || isNaN(Number(id))) return res.status(400).json({ message: 'Invalid resident ID. Must be a number.' });

  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);

    let profile_image;
    if (req.file) {
      profile_image = `/uploads/${req.file.filename}`;
    } else {
      const existing = await connection.execute(
        `SELECT profile_image FROM residents WHERE resident_id = :id`,
        [Number(id)], { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      profile_image = existing.rows.length ? existing.rows[0].PROFILE_IMAGE : null;
    }

    await connection.execute(
      `UPDATE residents
        SET first_name = :first_name,
            middle_name = :middle_name,
            last_name = :last_name,
            birth_date = TO_DATE(:birth_date, 'YYYY-MM-DD'),
            gender = :gender,
            civil_status = :civil_status,
            purok = :purok,
            email = :email,
            phone_number = :phone_number,
            profile_image = :profile_image
        WHERE resident_id = :id`,
      { first_name, middle_name, last_name, birth_date, gender, civil_status, purok, email, phone_number, profile_image, id: Number(id) },
      { autoCommit: true }
    );

    res.json({ message: 'Resident updated successfully', barangay: 'Abongan', profile_image });
  } catch (err) {
    console.error('❌ Error updating resident:', err);
    res.status(500).json({ message: 'Failed to update resident.' });
  } finally {
    if (connection) try { await connection.close(); } catch {}
  }
});

// -------------------- DELETE RESIDENT --------------------
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  if (!id || isNaN(Number(id))) return res.status(400).json({ message: 'Invalid resident ID.' });

  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);

    const existing = await connection.execute(
      `SELECT profile_image FROM residents WHERE resident_id = :id`,
      [Number(id)], { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (existing.rows.length === 0) return res.status(404).json({ message: 'Resident not found.' });

    const imagePath = existing.rows[0].PROFILE_IMAGE ? path.join(__dirname, '..', existing.rows[0].PROFILE_IMAGE) : null;

    await connection.execute(`DELETE FROM residents WHERE resident_id = :id`, [Number(id)], { autoCommit: true });

    if (imagePath && fs.existsSync(imagePath)) fs.unlink(imagePath, (err) => { if (err) console.error('⚠️ Error deleting image:', err); });

    res.json({ message: 'Resident deleted successfully.' });
  } catch (err) {
    console.error('❌ Error deleting resident:', err);
    res.status(500).json({ message: 'Failed to delete resident.' });
  } finally {
    if (connection) try { await connection.close(); } catch {}
  }
});

// -------------------- FIREBASE REGISTRATION --------------------
router.post("/firebase-register/:id", async (req, res) => {
  const { id } = req.params;
  let connection;

  try {
    // 1️⃣ Connect to Oracle
    connection = await oracledb.getConnection(dbConfig);

    // 2️⃣ Get all resident info
    const result = await connection.execute(
      `SELECT 
         resident_id,
         first_name, 
         middle_name, 
         last_name, 
         email, 
         phone_number, 
         birth_date,
         gender,
         civil_status,
         purok,
         profile_image
       FROM residents
       WHERE resident_id = :id`,
      [Number(id)],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: "Resident not found" });
    }

    const resident = result.rows[0];

    if (!resident.EMAIL) {
      return res.status(400).json({ message: "Resident does not have an email." });
    }

    // 3️⃣ Calculate age
    let age = null;
    if (resident.BIRTH_DATE) {
      const birthDate = new Date(resident.BIRTH_DATE);
      const today = new Date();
      age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--;
    }

    // 4️⃣ Generate SIMPLE password (Letters & Numbers only)
    const tempPassword = generateSimplePassword(8); // 8 characters length

    // 5️⃣ Create Firebase Auth account
    const userRecord = await admin.auth().createUser({
      email: resident.EMAIL,
      password: tempPassword,
      displayName: `${resident.FIRST_NAME} ${resident.MIDDLE_NAME || ""} ${resident.LAST_NAME || ""}`.trim(),
    });

    // ---------------- START: BASE64 IMAGE CONVERSION ----------------
    let profileImageBase64 = "";
    if (resident.PROFILE_IMAGE) {
      try {
        const relativePath = resident.PROFILE_IMAGE.startsWith('/') 
          ? resident.PROFILE_IMAGE.substring(1) 
          : resident.PROFILE_IMAGE;

        const imagePath = path.join(__dirname, '..', relativePath);

        if (fs.existsSync(imagePath)) {
          const ext = path.extname(imagePath).toLowerCase();
          let mimeType = 'image/jpeg';
          if (ext === '.png') mimeType = 'image/png';
          if (ext === '.gif') mimeType = 'image/gif';

          const fileBuffer = fs.readFileSync(imagePath);
          profileImageBase64 = `data:${mimeType};base64,${fileBuffer.toString('base64')}`;
        }
      } catch (imgErr) {
        console.error("⚠️ Error converting image to Base64:", imgErr);
      }
    }
    // ---------------- END: BASE64 IMAGE CONVERSION ----------------

    // 6️⃣ Prepare full Realtime Database data
    const userData = {
      resident_id: resident.RESIDENT_ID,
      email: resident.EMAIL,
      firstName: resident.FIRST_NAME,
      middleName: resident.MIDDLE_NAME || "",
      lastName: resident.LAST_NAME || "",
      fullName: `${resident.FIRST_NAME} ${resident.MIDDLE_NAME || ""} ${resident.LAST_NAME || ""}`.trim(),
      age,
      birth_date: resident.BIRTH_DATE ? new Date(resident.BIRTH_DATE).toISOString().split("T")[0] : null,
      gender: resident.GENDER || "",
      civil_status: resident.CIVIL_STATUS || "",
      purok: resident.PUROK || "",
      profile_image: resident.PROFILE_IMAGE || "", 
      profile_image_base64: profileImageBase64,
      barangay: "Abongan",
      phone: resident.PHONE_NUMBER || "",
      deviceToken: "",
      lastLogin: new Date().toISOString(),
      updatedAt: Date.now(),
    };

    // 7️⃣ Save to Firebase Realtime Database
    await admin.database().ref(`users/${userRecord.uid}`).set(userData);

    // -------------------- UPDATED SMS LOGIC --------------------
    let smsStatus = "Skipped (no phone)";
    if (resident.PHONE_NUMBER) {
      // Create message
      let sms = `Good day ${resident.FIRST_NAME}. Your Brgy Abongan account is ready. Email: ${resident.EMAIL} Password: ${tempPassword}. Please change your password after login.`;
      
      sms = sms.replace(/[₱]/g, "P"); 

      const smsEncoded = encodeURIComponent(sms);
      
      // Use Env Variables
      const smsServer = process.env.SMS_SERVER_URL;
      const smsKey = process.env.SMS_KEY;
      
      const gatewayUrl = `${smsServer}/?phone=${resident.PHONE_NUMBER}&message=${smsEncoded}&key=${smsKey}`;

      try {
        console.log("Sending SMS:", gatewayUrl);
        const response = await axios.get(gatewayUrl, { timeout: 5000 });
        smsStatus = response.data?.status === "sent" ? "Sent" : "Failed";
      } catch (err) {
        console.warn("SMS failed:", err.message);
        smsStatus = "Failed / Logged";
      }
    }
    // -----------------------------------------------------------

    // 9️⃣ Respond to client
    res.json({
      message: "Firebase user created and all info saved to Realtime Database",
      uid: userRecord.uid,
      smsStatus,
      userData,
    });

  } catch (err) {
    console.error("❌ Firebase registration error:", err);
    res.status(500).json({ message: "Failed to register resident", error: err.message });
  } finally {
    if (connection) try { await connection.close(); } catch {}
  }
});

// --- UPDATED PASSWORD FUNCTION (Easy Letters + Numbers Only) ---
function generateSimplePassword(length = 8) {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}



// -------------------- ARCHIVE RESIDENT (Oracle -> MySQL) --------------------
router.post('/archive/:id', async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body; 

  if (!id || isNaN(Number(id))) return res.status(400).json({ message: "Invalid resident ID." });

  let oracleConn;
  let mysqlConn;

  try {
    oracleConn = await oracledb.getConnection(dbConfig);
    mysqlConn = await mysqlPool.getConnection();

    // Start Oracle transaction
    await oracleConn.execute("SAVEPOINT beforeArchive");

    // Fetch resident
    const result = await oracleConn.execute(
      `SELECT * FROM residents WHERE resident_id = :id`,
      [Number(id)],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (result.rows.length === 0) return res.status(404).json({ message: "Resident not found." });
    const r = result.rows[0];

    // Insert into MySQL archive
    await mysqlConn.execute(
      `INSERT INTO archived_residents (
          resident_id, first_name, middle_name, last_name, birth_date, gender,
          civil_status, purok, email, phone_number, profile_image, archive_reason, archived_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE
          first_name = VALUES(first_name),
          middle_name = VALUES(middle_name),
          last_name = VALUES(last_name),
          birth_date = VALUES(birth_date),
          gender = VALUES(gender),
          civil_status = VALUES(civil_status),
          purok = VALUES(purok),
          email = VALUES(email),
          phone_number = VALUES(phone_number),
          profile_image = VALUES(profile_image),
          archive_reason = VALUES(archive_reason),
          archived_at = NOW()`,
      [
        r.RESIDENT_ID, 
        r.FIRST_NAME, 
        r.MIDDLE_NAME, 
        r.LAST_NAME, 
        r.BIRTH_DATE, 
        r.GENDER, 
        r.CIVIL_STATUS, 
        r.PUROK, 
        r.EMAIL, 
        r.PHONE_NUMBER, 
        r.PROFILE_IMAGE,
        reason || 'Unspecified' 
      ]
    );

    // Delete from Oracle
    await oracleConn.execute(`DELETE FROM residents WHERE resident_id = :id`, [Number(id)]);

    // Commit Oracle transaction
    await oracleConn.commit();

    res.json({ message: "Resident archived successfully." });
  } catch (err) {
    console.error('❌ Error archiving resident:', err);
    if (oracleConn) try { await oracleConn.rollback(); } catch (e) { console.error('⚠️ Rollback failed', e); }
    res.status(500).json({ message: "An error occurred while archiving the resident." });
  } finally {
    if (oracleConn) try { await oracleConn.close(); } catch {}
    if (mysqlConn) try { await mysqlConn.release(); } catch {}
  }
});

// -------------------- RESTORE RESIDENT (MySQL -> Oracle) --------------------
router.post('/restore/:id', async (req, res) => {
  const { id } = req.params;
  if (!id || isNaN(Number(id))) return res.status(400).json({ message: "Invalid resident ID." });

  let oracleConn;
  let mysqlConn;

  try {
    mysqlConn = await mysqlPool.getConnection();
    oracleConn = await oracledb.getConnection(dbConfig);

    // Start Oracle transaction
    await oracleConn.execute("SAVEPOINT beforeRestore");

    // Get resident from MySQL archive
    const [rows] = await mysqlConn.query(
      `SELECT * FROM archived_residents WHERE resident_id = ?`,
      [Number(id)]
    );

    if (rows.length === 0) return res.status(404).json({ message: "Archived resident not found." });
    const r = rows[0];

    // Insert back into Oracle
    await oracleConn.execute(
      `INSERT INTO residents (
          resident_id, first_name, middle_name, last_name, birth_date, gender,
          civil_status, purok, email, phone_number, profile_image
        ) VALUES (
          :resident_id, :first_name, :middle_name, :last_name, TO_DATE(:birth_date, 'YYYY-MM-DD'),
          :gender, :civil_status, :purok, :email, :phone_number, :profile_image
        )`,
      {
        resident_id: r.resident_id,
        first_name: r.first_name,
        middle_name: r.middle_name,
        last_name: r.last_name,
        birth_date: r.birth_date.toISOString().split('T')[0],
        gender: r.gender,
        civil_status: r.civil_status,
        purok: r.purok,
        email: r.email,
        phone_number: r.phone_number,
        profile_image: r.profile_image,
      }
    );

    // Commit Oracle transaction
    await oracleConn.commit();

    // Delete from MySQL archive
    await mysqlConn.query(`DELETE FROM archived_residents WHERE resident_id = ?`, [Number(id)]);

    res.json({ message: "Resident restored successfully." });
  } catch (err) {
    console.error("❌ Error restoring resident:", err);
    if (oracleConn) try { await oracleConn.rollback(); } catch (e) { console.error('⚠️ Rollback failed', e); }
    res.status(500).json({ message: "Failed to restore resident." });
  } finally {
    if (oracleConn) try { await oracleConn.close(); } catch {}
    if (mysqlConn) try { await mysqlConn.release(); } catch {}
  }
});

// -------------------- DELETE ARCHIVED RESIDENT --------------------
router.delete('/archived/:id', async (req, res) => {
  const { id } = req.params;
  if (!id || isNaN(Number(id))) return res.status(400).json({ message: "Invalid resident ID." });

  let mysqlConn;
  try {
    mysqlConn = await mysqlPool.getConnection();

    const [result] = await mysqlConn.query(
      `DELETE FROM archived_residents WHERE resident_id = ?`,
      [Number(id)]
    );

    if (result.affectedRows === 0) return res.status(404).json({ message: "Archived resident not found." });

    res.json({ message: "Archived resident deleted successfully." });
  } catch (err) {
    console.error("❌ Error deleting archived resident:", err);
    res.status(500).json({ message: "Failed to delete archived resident." });
  } finally {
    if (mysqlConn) try { await mysqlConn.release(); } catch {}
  }
});

/* ===================== PUROK IMAGE SETUP ===================== */
const purokDir = path.join(__dirname, "../uploads/purok");

if (!fs.existsSync(purokDir)) {
  fs.mkdirSync(purokDir, { recursive: true });
}

const purokStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, purokDir);
  },
  filename: (req, file, cb) => {
    const purokName = req.params.purok
      .replace(/\s+/g, "_")
      .toUpperCase();
    const ext = path.extname(file.originalname);
    cb(null, `${purokName}${ext}`);
  },
});

const uploadPurok = multer({ storage: purokStorage });

/* ===================== UPLOAD PUROK IMAGE ===================== */
router.post(
  "/purok/:purok/upload",
  uploadPurok.single("image"),
  (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No image uploaded" });
      }

      const imageUrl = `${req.protocol}://${req.get(
        "host"
      )}/uploads/purok/${req.file.filename}`;

      res.json({
        message: "Purok image uploaded successfully",
        imageUrl,
      });
    } catch (err) {
      console.error("❌ Purok upload error:", err);
      res.status(500).json({ message: "Upload failed" });
    }
  }
);

/* ===================== GET PUROK IMAGE ===================== */
router.get("/purok/:purok/image", (req, res) => {
  try {
    const purokName = req.params.purok
      .replace(/\s+/g, "_")
      .toUpperCase();

    if (!fs.existsSync(purokDir)) {
      return res.status(404).json({ message: "No image directory" });
    }

    const files = fs.readdirSync(purokDir);
    const imageFile = files.find((f) => f.startsWith(purokName));

    if (!imageFile) {
      return res.status(404).json({ message: "No image found" });
    }

    res.json({
      imageUrl: `${req.protocol}://${req.get(
        "host"
      )}/uploads/purok/${imageFile}`,
    });
  } catch (err) {
    console.error("❌ Fetch purok image error:", err);
    res.status(500).json({ message: "Failed to load image" });
  }
});

// -------------------- FIREBASE UPDATE DATA ONLY --------------------
router.put("/firebase-update/:id", async (req, res) => {
  const { id } = req.params;
  let connection;

  try {
    // 1. Get latest resident info from Oracle
    connection = await oracledb.getConnection(dbConfig);
    const result = await connection.execute(
      `SELECT resident_id, first_name, middle_name, last_name, email, phone_number, birth_date, gender, civil_status, purok, profile_image FROM residents WHERE resident_id = :id`,
      [Number(id)],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (!result.rows.length) return res.status(404).json({ message: "Resident not found in Oracle" });
    const resident = result.rows[0];

    if (!resident.EMAIL) return res.status(400).json({ message: "No email found for resident." });

    // 2. Find Firebase UID using Email (Check if registered)
    let userRecord;
    try {
      userRecord = await admin.auth().getUserByEmail(resident.EMAIL);
    } catch (e) {
      return res.status(404).json({ message: "Firebase user not found. Please click 'Register' first." });
    }

    // 3. Process Image to Base64 (Update the image)
    let profileImageBase64 = "";
    if (resident.PROFILE_IMAGE) {
      try {
        const relativePath = resident.PROFILE_IMAGE.startsWith('/') ? resident.PROFILE_IMAGE.substring(1) : resident.PROFILE_IMAGE;
        const imagePath = path.join(__dirname, '..', relativePath);
        
        if (fs.existsSync(imagePath)) {
          const ext = path.extname(imagePath).toLowerCase();
          let mimeType = 'image/jpeg';
          if (ext === '.png') mimeType = 'image/png';
          
          const fileBuffer = fs.readFileSync(imagePath);
          profileImageBase64 = `data:${mimeType};base64,${fileBuffer.toString('base64')}`;
        }
      } catch (err) { console.error("Image processing error", err); }
    }

    // 4. Calculate Age
    let age = null;
    if (resident.BIRTH_DATE) {
      const bdate = new Date(resident.BIRTH_DATE);
      const today = new Date();
      age = today.getFullYear() - bdate.getFullYear();
      if (today.getMonth() < bdate.getMonth() || (today.getMonth() === bdate.getMonth() && today.getDate() < bdate.getDate())) age--;
    }

    // 5. Update Realtime Database
    const updates = {
      firstName: resident.FIRST_NAME,
      middleName: resident.MIDDLE_NAME || "",
      lastName: resident.LAST_NAME || "",
      fullName: `${resident.FIRST_NAME} ${resident.MIDDLE_NAME || ""} ${resident.LAST_NAME || ""}`.trim(),
      age: age,
      birth_date: resident.BIRTH_DATE ? new Date(resident.BIRTH_DATE).toISOString().split("T")[0] : null,
      gender: resident.GENDER || "",
      civil_status: resident.CIVIL_STATUS || "",
      purok: resident.PUROK || "",
      phone: resident.PHONE_NUMBER || "",
      profile_image: resident.PROFILE_IMAGE || "",
      profile_image_base64: profileImageBase64, // Update the image string
      updatedAt: Date.now()
    };

    await admin.database().ref(`users/${userRecord.uid}`).update(updates);

    res.json({ message: "Resident data updated in Firebase successfully!", updates });

  } catch (err) {
    console.error("Update error:", err);
    res.status(500).json({ message: "Update failed", error: err.message });
  } finally {
    if (connection) try { await connection.close(); } catch {}
  }
});

module.exports = router;