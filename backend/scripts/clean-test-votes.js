const { pool } = require('../config/database');

async function clean() {
  await pool.query("DELETE FROM votes WHERE voter_name LIKE 'Smoke Test%'");
  await pool.query("UPDATE nominees SET vote_count = 0 WHERE id = 3");
  console.log('✓ Smoke test votes cleaned successfully. Database vote count reset to 0.');
  await pool.end();
  process.exit(0);
}

clean();
