/**
 * blotter.js
 * FIXED: Current user properly logged
 * FIXED: Added blotter verification route
 */

const express = require("express");
const router = express.Router();
const oracledb = require("oracledb");
const dbConfig = require("../db");
const axios = require("axios");
const admin = require("../firebase");

require("dotenv").config();


// ================= CURRENT USER =================
function getCurrentUser(req) {
  return (
    req.headers["x-username"] ||
    "SYSTEM"
  );
}


// ================= ACTIVITY LOG =================
async function logActivity(username, action) {
  let conn;

  try {
    conn = await oracledb.getConnection(dbConfig);

    await conn.execute(
      `INSERT INTO ACTIVITY_LOGS (USERNAME, ACTION, CREATED_AT)
       VALUES (:username, :action, SYSTIMESTAMP)`,
      {
        username: username || "SYSTEM",
        action,
      },
      { autoCommit: true }
    );

  } catch (err) {
    console.error("Activity Log Error:", err.message);

  } finally {
    if (conn) await conn.close();
  }
}


// ================= SMS =================
async function sendSMS(phoneNumber, message) {
  if (!phoneNumber) return;

  try {
    const cleanPhone = phoneNumber.replace(/[^0-9]/g, "");

    const smsServer = process.env.SMS_SERVER_URL;
    const smsKey = process.env.SMS_KEY;

    const cleanMessage = message
      .replace(/[₱]/g, "P")
      .trim();

    const encoded = encodeURIComponent(cleanMessage);

    const url =
      `${smsServer}/?phone=${cleanPhone}&message=${encoded}&key=${smsKey}`;

    await axios.get(url, { timeout: 5000 });

  } catch (err) {
    console.error("SMS Error:", err.message);
  }
}


// ================= FCM =================
async function sendFCM(topic, title, body) {
  try {
    await admin.messaging().send({
      notification: { title, body },
      topic,
    });

  } catch (err) {
    console.error("FCM Error:", err.message);
  }
}


// ================= FIND PHONE =================
async function findPhoneByName(conn, fullName) {
  try {
    if (!fullName) return null;

    const result = await conn.execute(
      `SELECT phone_number
       FROM residents
       WHERE LOWER(first_name || ' ' || last_name) = LOWER(:name)
          OR LOWER(last_name || ', ' || first_name) = LOWER(:name)
       FETCH FIRST 1 ROWS ONLY`,
      { name: fullName },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    return result.rows.length
      ? result.rows[0].PHONE_NUMBER
      : null;

  } catch (err) {
    console.error("Phone lookup error:", err.message);
    return null;
  }
}


// ================= CHECK BLOTTER =================
router.get("/check/:name", async (req, res) => {
  let conn;

  try {
    conn = await oracledb.getConnection(dbConfig);

    const fullName = decodeURIComponent(req.params.name);

    const result = await conn.execute(
      `SELECT ID
       FROM BLOTTERS
       WHERE LOWER(TRIM(NAME)) = LOWER(TRIM(:name))
       AND LOWER(TRIM(STATUS)) != 'resolved'`,
      { name: fullName },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    res.json({
      hasBlotter: result.rows.length > 0
    });

  } catch (err) {
    console.error("Check blotter error:", err);

    res.status(500).json({
      error: "Failed to verify blotter status"
    });

  } finally {
    if (conn) await conn.close();
  }
});


// ================= GET ALL =================
router.get("/", async (req, res) => {
  let conn;

  try {
    conn = await oracledb.getConnection(dbConfig);

    const result = await conn.execute(
      `SELECT ID AS "id",
              NAME AS "respondent",
              COMPLAINT AS "complaint",
              STATUS AS "status",
              COMPLAINANT AS "complainant",
              CREATED_AT AS "date_filed"
       FROM BLOTTERS
       ORDER BY ID DESC`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    res.json(result.rows);

  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: "Failed to fetch blotters"
    });

  } finally {
    if (conn) await conn.close();
  }
});


// ================= GET SINGLE =================
router.get("/:id", async (req, res) => {
  let conn;

  try {
    conn = await oracledb.getConnection(dbConfig);

    const result = await conn.execute(
      `SELECT ID AS "id",
              NAME AS "respondent",
              COMPLAINT AS "complaint",
              STATUS AS "status",
              COMPLAINANT AS "complainant",
              CREATED_AT AS "date_filed"
       FROM BLOTTERS
       WHERE ID = :id`,
      [req.params.id],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (!result.rows.length) {
      return res.status(404).json({
        error: "Not found"
      });
    }

    res.json(result.rows[0]);

  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: "Failed fetch"
    });

  } finally {
    if (conn) await conn.close();
  }
});


// ================= CREATE =================
router.post("/", async (req, res) => {
  const {
    complainant,
    respondent,
    complaint,
    status
  } = req.body;

  const user = getCurrentUser(req);

  if (!complainant || !respondent || !complaint) {
    return res.status(400).json({
      error: "Missing fields"
    });
  }

  const blotterStatus =
    status === "RESOLVED"
      ? "RESOLVED"
      : "RECORDED";

  let conn;

  try {
    conn = await oracledb.getConnection(dbConfig);

    const result = await conn.execute(
      `DECLARE
          v_id NUMBER;
       BEGIN
          INSERT INTO BLOTTERS (
            ID,
            NAME,
            COMPLAINT,
            STATUS,
            COMPLAINANT
          )
          VALUES (
            blotters_seq.NEXTVAL,
            :respondent,
            :complaint,
            :status,
            :complainant
          )
          RETURNING ID INTO v_id;

          :id := v_id;
       END;`,
      {
        respondent,
        complaint,
        status: blotterStatus,
        complainant,
        id: {
          dir: oracledb.BIND_OUT,
          type: oracledb.NUMBER
        }
      },
      { autoCommit: true }
    );

    const newId = result.outBinds.id[0];

    await logActivity(
      user,
      `Created blotter #${newId}`
    );

    await sendFCM(
      "adminNotifications",
      "New Blotter",
      `${complainant} vs ${respondent}`
    );

    res.json({
      id: newId
    });

  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: "Failed create blotter"
    });

  } finally {
    if (conn) await conn.close();
  }
});


// ================= UPDATE STATUS =================
router.patch("/:id/status", async (req, res) => {
  const { status } = req.body;

  const user = getCurrentUser(req);

  let conn;

  try {
    conn = await oracledb.getConnection(dbConfig);

    await conn.execute(
      `UPDATE BLOTTERS
       SET STATUS = :status
       WHERE ID = :id`,
      {
        status,
        id: req.params.id
      },
      { autoCommit: true }
    );

    await logActivity(
      user,
      `Updated blotter #${req.params.id} to ${status}`
    );

    res.json({
      message: "Updated"
    });

  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: "Failed update"
    });

  } finally {
    if (conn) await conn.close();
  }
});


// ================= DELETE =================
router.delete("/:id", async (req, res) => {
  const user = getCurrentUser(req);

  let conn;

  try {
    conn = await oracledb.getConnection(dbConfig);

    await conn.execute(
      `DELETE FROM BLOTTERS
       WHERE ID = :id`,
      [req.params.id],
      { autoCommit: true }
    );

    await logActivity(
      user,
      `Deleted blotter #${req.params.id}`
    );

    res.json({
      message: "Deleted"
    });

  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: "Failed delete"
    });

  } finally {
    if (conn) await conn.close();
  }
});

module.exports = router;