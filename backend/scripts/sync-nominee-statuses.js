require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { pool } = require('../config/database');
const { invalidate } = require('../utils/cache');

async function syncNominees() {
  console.log('Synchronizing nominee statuses with nominations...');

  // 1. For any nominee linked to a nomination, align the nominee status
  const [linked] = await pool.query(`
    SELECT n.id AS nominee_id, n.full_name, n.status AS nominee_status, nom.id AS nomination_id, nom.status AS nomination_status
    FROM nominees n
    JOIN nominations nom ON n.nomination_id = nom.id
  `);

  for (const row of linked) {
    let expectedStatus = 'archived';
    if (row.nomination_status === 'shortlisted') {
      expectedStatus = 'approved';
    } else if (row.nomination_status === 'rejected') {
      expectedStatus = 'rejected';
    } else if (row.nomination_status === 'deleted') {
      expectedStatus = 'deleted';
    }

    if (row.nominee_status !== expectedStatus) {
      console.log(`Updating Nominee #${row.nominee_id} (${row.full_name}): ${row.nominee_status} -> ${expectedStatus} (nomination #${row.nomination_id} is ${row.nomination_status})`);
      await pool.query('UPDATE nominees SET status = ? WHERE id = ?', [expectedStatus, row.nominee_id]);
    }
  }

  // 2. For orphaned nominees (nomination_id IS NULL) whose nomination was deleted
  // (e.g. test nominees 'creater' and 't' created from deleted nominations)
  const [orphans] = await pool.query(`
    SELECT id, full_name, status, nominee_code FROM nominees WHERE nomination_id IS NULL
  `);

  for (const orphan of orphans) {
    if (orphan.full_name === 'creater' || (orphan.full_name === 't' && orphan.nominee_code === 'TIC26-00002')) {
      console.log(`Setting orphaned deleted nominee #${orphan.id} (${orphan.full_name}) to status='deleted'`);
      await pool.query("UPDATE nominees SET status = 'deleted' WHERE id = ?", [orphan.id]);
    }
  }

  invalidate('nominees');
  invalidate('nominee:');
  console.log('Sync complete and cache invalidated.');
  process.exit(0);
}

syncNominees().catch((err) => {
  console.error('Sync failed:', err);
  process.exit(1);
});
