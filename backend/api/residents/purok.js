// GET /api/residents/puroks
router.get('/puroks', async (req, res) => {
  let conn;
  try {
    conn = await oracledb.getConnection(dbConfig);
    const result = await conn.execute(`SELECT PUROK_NAME FROM PUROKS`, [], {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
    });

    const puroks = result.rows.map(row => row.PUROK_NAME);
    res.json(puroks);
  } catch (err) {
    console.error('Error fetching puroks:', err);
    res.status(500).json({ message: 'Failed to fetch puroks.' });
  } finally {
    if (conn) {
      try {
        await conn.close();
      } catch (err) {
        console.error('Error closing DB connection:', err);
      }
    }
  }
});
