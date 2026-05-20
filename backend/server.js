const path = require("path");
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const admin = require("firebase-admin");
const oracledb = require("oracledb");
const mysql = require("mysql2");

const app = express();

// ---------- Firebase Admin Initialization ----------
const serviceAccount = require("./firebase-service-account.json"); // <-- JSON file

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://abongan---online-request-default-rtdb.firebaseio.com",
  });
}

console.log("✅ Firebase Admin initialized");
// ---------- Middleware ----------
app.use(cors());
app.use(express.json());



// ---------- Static files ----------
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
const generatedDir = path.join(__dirname, "generated");
if (!fs.existsSync(generatedDir)) fs.mkdirSync(generatedDir);
app.use("/generated", express.static(generatedDir));

// ---------- DB (Oracle pool) setup ----------
const dbConfig = require("./db");

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

async function initDbPool() {
  try {
    await oracledb.createPool({
      user: dbConfig.user,
      password: dbConfig.password,
      connectString: dbConfig.connectString,
      poolMin: dbConfig.poolMin || 1,
      poolMax: dbConfig.poolMax || 4,
      poolIncrement: dbConfig.poolIncrement || 1,
    });
    console.log("✅ Oracle DB pool created");
  } catch (err) {
    console.error("Failed to create Oracle DB pool:", err);
    throw err;
  }
}

// ---------- MySQL Connection Setup ----------
const mysqlDbConfig = {
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
};

const mysqlPool = mysql.createPool(mysqlDbConfig);
console.log("✅ MySQL connection pool created");

// ---------- Service Fees Report Route ----------
app.get("/api/service-fees-report", async (req, res) => {
  const { q, status, date_from, date_to } = req.query;

  // Build the SQL query dynamically based on filters
  let query = "SELECT * FROM service_fees WHERE 1=1";
  let binds = [];

  if (q) {
    query += " AND (resident LIKE :q OR document_name LIKE :q)";
    binds.push(`%${q}%`);
  }

  if (status) {
    query += " AND status = :status";
    binds.push(status);
  }

  if (date_from) {
    query += " AND date_generated >= TO_DATE(:date_from, 'YYYY-MM-DD')";
    binds.push(date_from);
  }

  if (date_to) {
    query += " AND date_generated <= TO_DATE(:date_to, 'YYYY-MM-DD')";
    binds.push(date_to);
  }

  try {
    const connection = await oracledb.getConnection();
    const result = await connection.execute(query, binds, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    res.json(result.rows); // Return the query result as JSON
    connection.close();
  } catch (err) {
    console.error("Error querying service_fees:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ---------- Import routes ----------
const authRoutes = require("./authRoutes");
const residentRoutes = require("./api/resident");
const servicesRoutes = require("./api/services");
const templateRoutes = require("./api/templates");
const blottersRoutes = require("./api/blotters");
const generateRoutes = require("./api/generate");
const documentsRoutes = require("./api/documents");
const documentsGeneratedRoutes = require("./api/DocumentGenerated");
const requestsRoutes = require("./api/requests");
const activityRoutes = require("./api/activity");
const backupRoutes = require("./api/backup");
const accountsRoutes = require("./api/accounts");
const officialsRoutes = require("./api/officials"); // NEW
const announcementRoutes = require("./api/announcements");
const onlineServicesRoute = require("./api/onlineServices")


// ---------- Mount routes ----------
app.use("/api/auth", authRoutes);
app.use("/api/residents", residentRoutes);
app.use("/api/services", servicesRoutes);
app.use("/api/templates", templateRoutes);
app.use("/api/blotters", blottersRoutes);
app.use("/api/generate", generateRoutes);
app.use("/api/documents", documentsRoutes);
app.use("/api/documents-generated", documentsGeneratedRoutes);
app.use("/api/requests", requestsRoutes);
app.use("/api/activity", activityRoutes);
app.use("/api/backup", backupRoutes);
app.use("/api/accounts", accountsRoutes);
app.use("/api/officials", officialsRoutes); // NEW
app.use("/api/announcements", announcementRoutes);
app.use("/api/online-services", onlineServicesRoute);



// ---------- Start server after DB pool is ready ----------
const PORT = process.env.PORT || 5000;

async function start() {
  try {
    await initDbPool();

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`✅ Server running on all interfaces at port ${PORT}`);

      const os = require("os");
      const interfaces = os.networkInterfaces();
      for (const name of Object.keys(interfaces)) {
        for (const net of interfaces[name]) {
          if (net.family === "IPv4" && !net.internal) {
            console.log(`🌐 Access via LAN/Hotspot: http://${net.address}:${PORT}`);
          }
        }
      }
    });
  } catch (err) {
    console.error("Server failed to start:", err);
    process.exit(1);
  }
}

start();
