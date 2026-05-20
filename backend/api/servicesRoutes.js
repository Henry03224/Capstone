const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ message: 'Get all services' });
});

router.post('/', (req, res) => {
  res.json({ message: 'Add new service' });
});

module.exports = router;
