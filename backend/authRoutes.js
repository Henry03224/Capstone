const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const oracledb = require('oracledb');
const dbConfig = require('./db'); // Oracle DB config

// ================= Password Validation =================
function validatePassword(password) {
  if (password.length < 8) {
    return 'Password must be at least 8 characters.';
  }
  if (!/[A-Z]/.test(password)) {
    return 'Password must contain at least one uppercase letter.';
  }
  if (!/[a-z]/.test(password)) {
    return 'Password must contain at least one lowercase letter.';
  }
  if (!/[0-9]/.test(password)) {
    return 'Password must contain at least one number.';
  }
  if (!/[!@#$%^&*]/.test(password)) {
    return 'Password must contain at least one special character (!@#$%^&*).';
  }
  return null;
}

// ================= Activity Log Helper =================
async function logActivity(username, action) {
  let conn;
  try {
    conn = await oracledb.getConnection(dbConfig);
    const sql = `
      INSERT INTO ACTIVITY_LOGS (USERNAME, ACTION, TIMESTAMP)
      VALUES (:username, :action, SYSDATE)
    `;
    await conn.execute(
      sql,
      { username, action },
      { autoCommit: true }
    );
  } catch (err) {
    console.error('Activity log error:', err);
  } finally {
    if (conn) {
      try { await conn.close(); } catch (e) {}
    }
  }
}

// ================= REGISTER =================
router.post('/register', async (req, res) => {
  // 1. Tanggapin ang mga bagong fields galing sa React
  const { 
    firstName, 
    middleName, 
    lastName, 
    suffix, 
    username, 
    password, 
    position 
  } = req.body;

  // 2. Validate Required Fields (Required ang First Name at Last Name)
  if (!firstName || !lastName || !username || !password || !position) {
    return res.status(400).json({
      message: 'First Name, Last Name, Username, password, and position are required.'
    });
  }

  // 3. Password validation
  const passwordError = validatePassword(password);
  if (passwordError) {
    return res.status(400).json({ message: passwordError });
  }

  let conn;
  try {
    conn = await oracledb.getConnection(dbConfig);
    const trimmedUsername = username.trim();

    // 4. Check kung existing na ang username
    const checkSql = `SELECT USERNAME FROM USERS WHERE USERNAME = :username`;
    const checkResult = await conn.execute(
      checkSql,
      { username: trimmedUsername },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (checkResult.rows.length > 0) {
      return res.status(409).json({
        message: 'Username already taken.'
      });
    }

    // 5. Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 6. Insert User (Kasama na ang Name fields)
    const insertSql = `
      INSERT INTO USERS (
        FIRST_NAME, 
        MIDDLE_NAME, 
        LAST_NAME, 
        SUFFIX, 
        USERNAME, 
        PASSWORD_HASH, 
        POSITION
      )
      VALUES (
        :firstName, 
        :middleName, 
        :lastName, 
        :suffix, 
        :username, 
        :passwordHash, 
        :position
      )
    `;

    await conn.execute(
      insertSql,
      {
        firstName: firstName.trim(),
        middleName: middleName ? middleName.trim() : '', // Handle empty fields
        lastName: lastName.trim(),
        suffix: suffix ? suffix.trim() : '',
        username: trimmedUsername,
        passwordHash: hashedPassword,
        position: position
      },
      { autoCommit: true }
    );

    // Log activity
    await logActivity(trimmedUsername, `Registered as ${position}`);

    res.status(201).json({
      message: 'User registered successfully.'
    });

  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({
      message: 'Registration failed.'
    });
  } finally {
    if (conn) {
      try { await conn.close(); } catch (e) {}
    }
  }
});

// ================= LOGIN =================
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      message: 'Username and password required.'
    });
  }

  let conn;
  try {
    conn = await oracledb.getConnection(dbConfig);

    // Isinama ko ang Name fields sa SELECT para magamit sa Frontend kung kailangan
    const sql = `
      SELECT 
        FIRST_NAME, 
        LAST_NAME, 
        USERNAME, 
        PASSWORD_HASH, 
        POSITION
      FROM USERS
      WHERE USERNAME = :username
    `;
    
    const result = await conn.execute(
      sql,
      { username: username.trim() },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        message: 'Invalid username or password.'
      });
    }

    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.PASSWORD_HASH);

    if (!match) {
      return res.status(401).json({
        message: 'Invalid username or password.'
      });
    }

    // Log activity
    await logActivity(user.USERNAME, 'Logged in');

    res.json({
      message: 'Login successful',
      user: {
        username: user.USERNAME,
        firstName: user.FIRST_NAME, // Return name to frontend
        lastName: user.LAST_NAME,
        position: user.POSITION
      }
    });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({
      message: 'Login failed.'
    });
  } finally {
    if (conn) {
      try { await conn.close(); } catch (e) {}
    }
  }
});

module.exports = router;