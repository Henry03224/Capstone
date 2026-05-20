const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");

// Firebase Realtime Database reference
const db = admin.database();
const DOCS_REF = db.ref("generated_docs");

// GET pending documents
router.get("/", async (req, res) => {
  const status = req.query.status || "Pending";
  try {
    const snapshot = await DOCS_REF.orderByChild("status").equalTo(status).once("value");
    const docsObj = snapshot.val() || {};
    const documents = Object.keys(docsObj).map((key) => ({
      ID: key,
      ...docsObj[key],
    }));
    res.json(documents);
  } catch (error) {
    console.error("Error fetching pending documents:", error);
    res.status(500).json({ success: false, message: "Failed to fetch documents" });
  }
});

// PATCH approve a document
router.patch("/status/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await DOCS_REF.child(id).update({ status: "Approve" });
    res.json({ success: true, message: "Document approved successfully." });
  } catch (error) {
    console.error("Error approving document:", error);
    res.status(500).json({ success: false, message: "Failed to approve document" });
  }
});

// POST create a document (for testing or generating new docs)
router.post("/", async (req, res) => {
  const { RESIDENT, FILE_TYPE, FILE_PATH } = req.body;
  const newDoc = {
    RESIDENT,
    FILE_TYPE: FILE_TYPE || "Document",
    FILE_PATH: FILE_PATH || "/uploads/sample.pdf",
    DATE_GENERATED: new Date().toLocaleDateString(),
    status: "Pending",
  };
  try {
    const newRef = DOCS_REF.push(newDoc);
    res.json({ ID: newRef.key, ...newDoc });
  } catch (error) {
    console.error("Error creating document:", error);
    res.status(500).json({ success: false, message: "Failed to create document" });
  }
});

module.exports = router;
