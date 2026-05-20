// db.js
require('dotenv').config(); // Load .env

module.exports = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  connectString: process.env.DB_CONNECT,
};
