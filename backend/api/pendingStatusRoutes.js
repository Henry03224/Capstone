const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ message: 'Get pending statuses' });
});

router.post('/', (req, res) => {
  res.json({ message: 'Add pending status' });
});

module.exports = router;
