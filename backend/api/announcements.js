const express = require("express");
const router = express.Router();
const axios = require("axios");
const admin = require("../firebase"); // Firebase Admin SDK
const db = admin.database();
require("dotenv").config();

const SMS_SERVER_URL = process.env.SMS_SERVER_URL;
const SMS_KEY = process.env.SMS_KEY;

// ===============================
// HELPER: Build Message String
// ===============================
const buildMessage = (title, what, where, when, recipientName) => {
  return `📢 ${title}\n\n👋 Hello ${recipientName},\n\n📝 WHAT: ${what}\n📍 WHERE: ${where}\n⏰ WHEN: ${when}`;
};

// ===============================
// HELPER: Send SMS
// ===============================
const sendSms = async (phone, message, fullName) => {
  try {
    const cleanSms = message.replace(/[^\w\s.,:!?-]/gi, "");
    const encoded = encodeURIComponent(cleanSms);
    const url = `${SMS_SERVER_URL}/?phone=${phone}&message=${encoded}&key=${SMS_KEY}`;
    await axios.get(url, { timeout: 5000 });
    return true;
  } catch (err) {
    console.warn(`SMS failed for ${fullName}:`, err.message);
    return false;
  }
};

// ===============================
// 📢 CREATE ANNOUNCEMENT + SEND
// ===============================
router.post("/", async (req, res) => {
  const { title, what, where, when } = req.body;
  if (!title || !what || !where || !when) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    // Save announcement to Firebase
    const announcementsRef = db.ref("announcements");
    const newAnnouncementRef = announcementsRef.push();
    const newAnnouncement = {
      id: newAnnouncementRef.key,
      title,
      what,
      where,
      when,
      createdAt: new Date().toISOString(),
    };
    await newAnnouncementRef.set(newAnnouncement);

    // Fetch residents
    const usersSnapshot = await db.ref("users").once("value");
    const usersData = usersSnapshot.val() || {};
    const residents = Object.values(usersData);

    let smsSent = 0;
    let fcmSent = 0;

    // Send notifications
    for (const user of residents) {
      const fullName = user.fullName || `${user.firstName || "Resident"} ${user.lastName || ""}`.trim();
      const fullMessage = buildMessage(title, what, where, when, fullName);
      const phone = user.phone || user.phoneNumber || user.contact;

      if (phone) {
        const sent = await sendSms(phone, fullMessage, fullName);
        if (sent) smsSent++;
      }

      if (user.deviceToken) {
        try {
          await admin.messaging().send({
            token: user.deviceToken,
            notification: {
              title: `📢 ${title}`,
              body: `WHAT: ${what} | WHEN: ${when}`,
            },
            android: { priority: "high" },
            data: {
              type: "announcement",
              full_message: fullMessage,
              announcementId: newAnnouncementRef.key,
            },
          });
          fcmSent++;
        } catch (err) {
          console.warn(`FCM failed for ${fullName}:`, err.message);
        }
      }
    }

    res.json({ success: true, smsSent, fcmSent, announcement: newAnnouncement });
  } catch (err) {
    console.error("❌ ANNOUNCEMENT ERROR:", err);
    res.status(500).json({ message: err.message });
  }
});

// ===============================
// 📄 GET ALL ANNOUNCEMENTS
// ===============================
router.get("/", async (req, res) => {
  try {
    const snapshot = await db.ref("announcements").once("value");
    const data = snapshot.val() || {};
    const announcementsArray = Object.keys(data)
      .map((key) => ({ id: key, ...data[key] }))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(announcementsArray);
  } catch (err) {
    console.error("Fetch announcements error:", err);
    res.status(500).json({ message: err.message });
  }
});

// ===============================
// 🔁 RESEND ANNOUNCEMENT
// ===============================
router.post("/resend/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const snapshot = await db.ref(`announcements/${id}`).once("value");
    if (!snapshot.exists()) return res.status(404).json({ message: "Announcement not found" });

    const announcement = snapshot.val();
    const { title, what, where, when } = announcement;

    const usersSnapshot = await db.ref("users").once("value");
    const usersData = usersSnapshot.val() || {};
    const residents = Object.values(usersData);

    let smsSent = 0;
    let fcmSent = 0;

    for (const user of residents) {
      const fullName = user.fullName || `${user.firstName || "Resident"} ${user.lastName || ""}`.trim();
      const fullMessage = buildMessage(title, what, where, when, fullName);
      const phone = user.phone || user.phoneNumber || user.contact;

      if (phone) {
        const sent = await sendSms(phone, fullMessage, fullName);
        if (sent) smsSent++;
      }

      if (user.deviceToken) {
        try {
          await admin.messaging().send({
            token: user.deviceToken,
            notification: {
              title: `📢 ${title}`,
              body: `WHAT: ${what} | WHEN: ${when}`,
            },
            android: { priority: "high" },
            data: {
              type: "announcement",
              full_message: fullMessage,
              announcementId: id,
            },
          });
          fcmSent++;
        } catch (err) {
          console.warn(`FCM failed for ${fullName}:`, err.message);
        }
      }
    }

    res.json({ success: true, smsSent, fcmSent, message: "Announcement resent successfully" });
  } catch (err) {
    console.error("❌ RESEND ERROR:", err);
    res.status(500).json({ message: err.message });
  }
});

// ===============================
// 🗑️ DELETE ANNOUNCEMENT
// ===============================
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await db.ref(`announcements/${id}`).remove();
    res.json({ success: true, message: "Announcement deleted" });
  } catch (err) {
    console.error("Delete announcement error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;