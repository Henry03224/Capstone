const admin = require('firebase-admin');
const serviceAccount = require('./firebase-service-account.json'); // exact path

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://abongan---online-request-default-rtdb.firebaseio.com"
  });
}

module.exports = admin;
