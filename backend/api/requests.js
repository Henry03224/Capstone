/**
 * requests.js
 *
 * Backend router for handling Document Requests (Firebase).
 * UPDATED: Added Fee in SMS + Push Notification
 */

const express = require("express");
const router = express.Router();
const admin = require("../firebase");
const db = admin.database();
const axios = require("axios");

require("dotenv").config();

// ==============================
// HELPER: Resolve Template by File Type
// ==============================
const resolveTemplate = (request, services) => {
  const typeMap = {};

  Object.keys(services).forEach((key) => {
    const service = services[key];
    const template = service.docxTemplate || "";

    // Map by Service ID
    if (key) typeMap[key] = template;

    // Map by File Type
    if (service.type) {
      typeMap[service.type.toLowerCase().trim()] = template;
    }
  });

  const fileTypeRaw = request.fileType || request.type || "General";

  let finalTemplate = null;

  // 1️⃣ By Service ID
  if (request.serviceId && typeMap[request.serviceId]) {
    finalTemplate = typeMap[request.serviceId];
  }

  // 2️⃣ By File Type
  if (!finalTemplate && fileTypeRaw) {
    const cleanType = fileTypeRaw.toLowerCase().trim();

    if (typeMap[cleanType]) {
      finalTemplate = typeMap[cleanType];
    }
  }

  // 3️⃣ Existing Request Template
  if (!finalTemplate && request.docxTemplate) {
    finalTemplate = request.docxTemplate;
  }

  return finalTemplate;
};

// ==========================================
// 1. GET ALL REQUESTS
// ==========================================
router.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query._page) || 1;
    const limit = parseInt(req.query._limit) || 10;

    const [requestsSnapshot, usersSnapshot, servicesSnapshot] =
      await Promise.all([
        db.ref("requests").once("value"),
        db.ref("users").once("value"),
        db.ref("services").once("value"),
      ]);

    const allRequests = requestsSnapshot.val() || {};
    const users = usersSnapshot.val() || {};
    const services = servicesSnapshot.val() || {};

    let requestsArray = Object.keys(allRequests).map((key) => {
      const request = allRequests[key];
      const user = users[request.uid] || {};
      const requestData = request.data || {};

      return {
        id: key,
        ...request,
        serviceName:
          request.serviceName ||
          request.service_name ||
          request.type ||
          "General",

        fullName:
          user.fullName ||
          requestData.fullName ||
          request.fullName ||
          "Unknown",

        residentId:
          user.resident_id ||
          user.residentId ||
          requestData.resident_id ||
          null,

        docxTemplate: resolveTemplate(request, services),

        createdAt:
          request.createdAt ||
          request.date_requested ||
          new Date().toISOString(),

        status: request.status || "Pending",
      };
    });

    // Sort newest first
    requestsArray.sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    // Pagination
    const start = (page - 1) * limit;
    const paginated = requestsArray.slice(start, start + limit);

    res.json(paginated);
  } catch (err) {
    console.error("Failed to fetch requests:", err);
    res.status(500).json({
      error: "Failed to fetch requests",
    });
  }
});

// ==========================================
// 2. UPDATE STATUS
// ==========================================
router.put("/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const ref = db.ref(`requests/${id}`);
    const snapshot = await ref.once("value");

    if (!snapshot.exists()) {
      return res.status(404).json({
        error: "Request not found",
      });
    }

    // Update status
    const updatedAt = Date.now();

    await ref.update({
      status,
      updatedAt,
    });

    // Fetch updated request
    const updatedRequest = await ref.once("value");
    const reqData = updatedRequest.val();

    // Fetch user
    const userSnapshot = await db
      .ref(`users/${reqData.uid}`)
      .once("value");

    const user = userSnapshot.val() || {};

    // Fetch services
    const servicesSnapshot = await db
      .ref("services")
      .once("value");

    const services = servicesSnapshot.val() || {};

    const fullName =
      user.fullName ||
      reqData.data?.fullName ||
      "Resident";

    const serviceName =
      reqData.serviceName ||
      reqData.service_name ||
      reqData.type ||
      "Service";

    // ==========================================
    // GET FEE
    // ==========================================
    let fee = 0;

    // Match by serviceId
    if (
      reqData.serviceId &&
      services[reqData.serviceId]
    ) {
      fee = services[reqData.serviceId].fee || 0;
    } else {
      // Match by service name
      Object.keys(services).forEach((key) => {
        const svc = services[key];

        if (
          svc.type &&
          svc.type.toLowerCase().trim() ===
            serviceName.toLowerCase().trim()
        ) {
          fee = svc.fee || 0;
        }
      });
    }

    console.log("SERVICE:", serviceName);
    console.log("FEE:", fee);

    // ==========================================
    // MESSAGE
    // ==========================================
    let notificationTitle = `Request ${status}`;

    let notificationBody =
      `Hello ${fullName}, your request for ${serviceName} ` +
      `has been ${status}.`;

    if (status === "Approved") {
      notificationBody =
        `Hello ${fullName}, your request for ${serviceName} is APPROVED. ` +
        `Fee: P${Number(fee).toFixed(2)}. ` +
        `Please proceed to the Barangay Hall.`;
    } else if (status === "Released") {
      notificationTitle = "Document Released";

      notificationBody =
        `Hello ${fullName}, your document for ${serviceName} ` +
        `has been RELEASED. Transaction Completed.`;
    } else if (status === "Declined") {
      notificationBody =
        `Hello ${fullName}, your request for ${serviceName} ` +
        `has been DECLINED.`;
    }

    // ==========================================
    // FCM NOTIFICATION
    // ==========================================
    let fcmStatus = "Skipped";

    try {
      if (user.deviceToken) {
        const message = {
          token: user.deviceToken,

          notification: {
            title: notificationTitle,
            body: notificationBody,
          },

          android: {
            priority: "high",
          },

          data: {
            requestId: id,
            status: status,
            serviceName: serviceName,
            fee: String(fee),
          },
        };

        await admin.messaging().send(message);

        fcmStatus = "Sent";
      }
    } catch (err) {
      console.error("FCM Error:", err.message);
      fcmStatus = "Failed";
    }

    // ==========================================
    // SMS NOTIFICATION
    // ==========================================
    let smsStatus = "Skipped";

    try {
      if (user.phone) {
        // Replace peso symbol
        let cleanBody = notificationBody.replace(/[₱]/g, "P");

        console.log("SMS MESSAGE:", cleanBody);

        const smsEncoded = encodeURIComponent(cleanBody);

        // ENV
        const smsServer = process.env.SMS_SERVER_URL;
        const smsKey = process.env.SMS_KEY;

        const gatewayUrl =
          `${smsServer}/?phone=${user.phone}` +
          `&message=${smsEncoded}` +
          `&key=${smsKey}`;

        console.log("Sending SMS to:", user.phone);

        await axios.get(gatewayUrl, {
          timeout: 5000,
        });

        smsStatus = "Sent";
      }
    } catch (err) {
      console.error("SMS Error:", err.message);
      smsStatus = "Failed";
    }

    // ==========================================
    // RESPONSE
    // ==========================================
    res.json({
      success: true,
      id,
      status,
      fee,
      fcmStatus,
      smsStatus,
    });

  } catch (err) {
    console.error("Failed to update status:", err);

    res.status(500).json({
      error: "Failed to update status",
    });
  }
});

// ==========================================
// 3. GET SINGLE REQUEST DETAILS
// ==========================================
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch request
    const snapshot = await db
      .ref(`requests/${id}`)
      .once("value");

    if (!snapshot.exists()) {
      return res.status(404).json({
        error: "Request not found",
      });
    }

    const request = snapshot.val();
    const requestData = request.data || {};

    // Fetch user
    const userSnapshot = await db
      .ref(`users/${request.uid}`)
      .once("value");

    const user = userSnapshot.val() || {};

    // Fetch services
    const servicesSnapshot = await db
      .ref("services")
      .once("value");

    const services = servicesSnapshot.val() || {};

    res.json({
      id,
      ...request,

      serviceName:
        request.serviceName ||
        request.service_name ||
        request.type ||
        "General",

      fullName:
        user.fullName ||
        requestData.fullName ||
        "Unknown",

      residentId:
        user.resident_id ||
        user.residentId ||
        requestData.resident_id ||
        null,

      docxTemplate: resolveTemplate(
        request,
        services
      ),
    });

  } catch (err) {
    console.error("Failed to fetch request:", err);

    res.status(500).json({
      error: "Failed to fetch request",
    });
  }
});

module.exports = router;