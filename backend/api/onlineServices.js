const express = require("express");
const router = express.Router();
const admin = require("../firebase"); // Firebase Admin Config
const db = admin.database(); // Realtime Database
const oracledb = require("oracledb");
const dbConfig = require("../db"); // Oracle Config

// ==========================================
// 1. GET ALL SERVICES
// URL: GET /api/online-services
// ==========================================
router.get("/", async (req, res) => {
  try {
    const servicesSnapshot = await db.ref("services").once("value");
    const allServices = servicesSnapshot.val() || {};

    // Convert Object to Array para madali sa Frontend
    const servicesArray = Object.keys(allServices).map((key) => ({
      id: key,
      ...allServices[key],
    }));

    res.json(servicesArray);
  } catch (err) {
    console.error("Failed to fetch services:", err);
    res.status(500).json({ error: "Failed to fetch services" });
  }
});

// ==========================================
// 2. SYNC ORACLE TO FIREBASE (With Protection for Form Fields)
// URL: POST /api/online-services/sync
// ==========================================
router.post("/sync", async (req, res) => {
  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);

    // 1. Kunin ang latest data galing Oracle
    const result = await connection.execute(
      `SELECT ID, NAME, TYPE, FEE, DURATION, TEMPLATE FROM SERVICES`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const oracleServices = result.rows;

    if (oracleServices.length === 0) {
      return res.status(404).json({ message: "No services found in Oracle DB." });
    }

    // 2. Kunin muna ang CURRENT data sa Firebase para sa formFields
    const currentFbSnapshot = await db.ref("services").once("value");
    const currentFbData = currentFbSnapshot.val() || {};

    const firebaseData = {};

    oracleServices.forEach((service) => {
      const sId = String(service.ID);
      const existingService = currentFbData[sId] || {};

      firebaseData[sId] = {
        id: sId,
        // BALIKTAD: title ay TYPE, type ay NAME
        title: service.TYPE || "General",        
        type: service.NAME || "",                
        fee: service.FEE || 0,
        duration: service.DURATION || "",
        docxTemplate: service.TEMPLATE || "",
        templateUrl: service.TEMPLATE ? `/uploads/${service.TEMPLATE}` : null,

        // Preserve Firebase custom form fields
        formFields: existingService.formFields || [],
        requiresId: existingService.requiresId !== undefined ? existingService.requiresId : true,
        icon: existingService.icon || "document-text-outline",

        updatedAt: Date.now()
      };
    });

    // 3. I-save pabalik sa Firebase (Update All)
    await db.ref("services").set(firebaseData);

    res.json({ 
      message: "Sync successful! Services updated, Custom Forms preserved.", 
      count: oracleServices.length
    });

  } catch (err) {
    console.error("Sync Error:", err);
    res.status(500).json({ error: "Failed to sync services from Oracle" });
  } finally {
    if (connection) { try { await connection.close(); } catch (e) {} }
  }
});

// ==========================================
// 3. UPDATE SERVICE (Save Form Fields to Firebase)
// URL: PUT /api/online-services/:id
// ==========================================
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  
  const { title, type, docxTemplate, icon, requiresId, formFields } = req.body;

  if (!title) return res.status(400).json({ error: "Title required" });

  let connection;
  try {
    // STEP A: Update sa Oracle Database (Baliktad)
    connection = await oracledb.getConnection(dbConfig);
    const sql = `UPDATE SERVICES SET NAME = :name, TYPE = :type, TEMPLATE = :tpl WHERE ID = :id`;
    await connection.execute(sql, { name: type, type: title, tpl: docxTemplate || null, id }, { autoCommit: true });

    // STEP B: Update sa Firebase
    await db.ref(`services/${id}`).update({
      title: title,    // dati type
      type: type,      // dati title
      docxTemplate: docxTemplate || "",
      icon: icon || "document-text-outline",
      requiresId: requiresId === true,
      formFields: formFields || [],
      updatedAt: Date.now()
    });

    res.json({ message: "Service and Form Fields updated successfully!" });

  } catch (err) {
    console.error("Update Error:", err);
    res.status(500).json({ error: "Failed to update service" });
  } finally {
    if (connection) { try { await connection.close(); } catch (e) {} }
  }
});

// ==========================================
// 4. CREATE SERVICE (POST)
// ==========================================
router.post("/", async (req, res) => {
  const { title, type, fee, docxTemplate, icon, requiresId, formFields } = req.body;

  if (!title) return res.status(400).json({ error: "Title required" });

  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);

    // INSERT sa Oracle (Baliktad)
    const sql = `INSERT INTO SERVICES (NAME, TYPE, FEE, TEMPLATE) VALUES (:name, :type, :fee, :template) RETURNING ID INTO :id`;
    const result = await connection.execute(
      sql,
      { 
        name: type || "General",   // dati title
        type: title || "General",  // dati type
        fee: fee || 0, 
        template: docxTemplate || null, 
        id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT } 
      },
      { autoCommit: true }
    );

    const newId = result.outBinds.id[0];

    // Save sa Firebase
    const firebaseData = {
      id: String(newId),
      title: title || "General",
      type: type || "General",
      fee: fee || 0,
      docxTemplate: docxTemplate || "",
      templateUrl: docxTemplate ? `/uploads/${docxTemplate}` : null,
      icon: icon || "document-text-outline",
      requiresId: requiresId === true,
      formFields: formFields || [],
      updatedAt: Date.now()
    };

    await db.ref(`services/${newId}`).set(firebaseData);
    res.json({ message: "New Service Created!", id: newId });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create" });
  } finally {
    if (connection) { try { await connection.close(); } catch (e) {} }
  }
});

// ==========================================
// 5. DELETE SERVICE
// ==========================================
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  let connection;
  try {
    // Delete from Oracle
    connection = await oracledb.getConnection(dbConfig);
    await connection.execute(`DELETE FROM SERVICES WHERE ID = :id`, { id }, { autoCommit: true });
    
    // Delete from Firebase
    await db.ref(`services/${id}`).remove();
    
    res.json({ message: "Service deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete" });
  } finally {
    if (connection) { try { await connection.close(); } catch (e) {} }
  }
});

module.exports = router;