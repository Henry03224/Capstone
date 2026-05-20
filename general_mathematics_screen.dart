lsnrctl start


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

    // 4️⃣ Generate secure password
    const tempPassword = generatePassword(10);

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
        // Construct absolute path to the image
        // Assuming PROFILE_IMAGE in DB is like "/uploads/filename.jpg"
        // We need path.join(__dirname, '../uploads/filename.jpg')
        
        // Remove leading slash if present to avoid path issues with join
        const relativePath = resident.PROFILE_IMAGE.startsWith('/') 
          ? resident.PROFILE_IMAGE.substring(1) 
          : resident.PROFILE_IMAGE;

        const imagePath = path.join(__dirname, '..', relativePath);

        if (fs.existsSync(imagePath)) {
          // Determine extension
          const ext = path.extname(imagePath).toLowerCase();
          let mimeType = 'image/jpeg'; // default
          if (ext === '.png') mimeType = 'image/png';
          if (ext === '.gif') mimeType = 'image/gif';

          // Read file and convert to base64
          const fileBuffer = fs.readFileSync(imagePath);
          profileImageBase64 = `data:${mimeType};base64,${fileBuffer.toString('base64')}`;
        } else {
          console.warn(`⚠️ Image file not found at path: ${imagePath}`);
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
      profile_image: resident.PROFILE_IMAGE || "", // Keep the path
      profile_image_base64: profileImageBase64, // ADDED: The actual base64 string
      barangay: "Abongan",
      phone: resident.PHONE_NUMBER || "",
      deviceToken: "",
      lastLogin: new Date().toISOString(),
      updatedAt: Date.now(),
    };

    // 7️⃣ Save to Firebase Realtime Database
    await admin.database().ref(`users/${userRecord.uid}`).set(userData);

    // 8️⃣ Send SMS notification (optional)
    let smsStatus = "Skipped (no phone)";
    if (resident.PHONE_NUMBER) {
      let sms = `Good day ${resident.FIRST_NAME}. Your Brgy Abongan account is ready. Email: ${resident.EMAIL} Password: ${tempPassword}. Please change your password after login.`;
      sms = sms.replace(/[!₱.]/g, ""); // sanitize
      const smsEncoded = encodeURIComponent(sms);
      const gatewayUrl = `http://192.168.248.177:8080/?phone=${resident.PHONE_NUMBER}&message=${smsEncoded}&key=MY_SECRET_KEY`;

      try {
        console.log("Sending SMS:", gatewayUrl);
        const response = await axios.get(gatewayUrl, { timeout: 5000 });
        smsStatus = response.data?.status === "sent" ? "Sent" : "Failed";
      } catch (err) {
        console.warn("SMS failed:", err.message);
        smsStatus = "Failed / Logged";
      }
    }

    // 9️⃣ Respond to client
    res.json({
      message: "Firebase user created and all info saved to Realtime Database",
      uid: userRecord.uid,
      smsStatus,
      userData, // include all saved info in response
    });

  } catch (err) {
    console.error("❌ Firebase registration error:", err);
    res.status(500).json({ message: "Failed to register resident", error: err.message });
  } finally {
    if (connection) try { await connection.close(); } catch {}
  }
});
