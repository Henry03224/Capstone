const oracledb = require('oracledb');

async function runPLSQL() {
  let connection;

  try {
    connection = await oracledb.getConnection({
      user: 'henry',
      password: 'admin',
      connectString: '127.0.0.1:1521/orcl',
    });

    await connection.execute(`BEGIN DBMS_OUTPUT.ENABLE(NULL); END;`);

    await connection.execute(`
      BEGIN
        DBMS_OUTPUT.PUT_LINE('Hello from PL/SQL!');
        DBMS_OUTPUT.PUT_LINE('More lines from the DB.');
      END;
    `);

    const outputLines = [];
    let hasMoreLines = true;

    while (hasMoreLines) {
      const result = await connection.execute(
        `BEGIN DBMS_OUTPUT.GET_LINE(:line, :status); END;`,
        {
          line: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 32767 },
          status: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
        }
      );

      if (result.outBinds.status === 0) {
        outputLines.push(result.outBinds.line);
      } else {
        hasMoreLines = false;
      }
    }

    console.log('📤 Output from PL/SQL:\n' + outputLines.join('\n'));
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    if (connection) {
      try {
        await connection.close();
        console.log('🔌 Connection closed.');
      } catch (closeErr) {
        console.error('⚠️ Closing connection failed:', closeErr.message);
      }
    }
  }
}

runPLSQL();
