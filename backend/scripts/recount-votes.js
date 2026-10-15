/**
 * recount-votes.js
 * ---------------
 * Rebuilds `nominees.vote_count` from the `votes` table.
 *
 * `votes` is the source of truth. `vote_count` is a cache that keeps the
 * nominee list and leaderboard fast, and it is updated AFTER the vote commits
 * (see routes/voteRoutes.js) so that recording a vote never has to lock the
 * nominee row. The trade-off is that the cache can drift - for example if the
 * API is killed between the commit and the counter update.
 *
 * Run this any time you suspect the displayed counts are off:
 *   node scripts/recount-votes.js            # dry run: report differences only
 *   node scripts/recount-votes.js --apply    # write the corrected counts
 */

require('dotenv').config();
const { pool } = require('../config/database');

const APPLY = process.argv.includes('--apply');

async function main() {
  const [tallies] = await pool.query(
    `SELECT nominee_id, CAST(COUNT(*) AS SIGNED) AS actual
       FROM votes
      GROUP BY nominee_id`
  );
  const actualByNominee = new Map(tallies.map((r) => [Number(r.nominee_id), Number(r.actual)]));

  const [nominees] = await pool.query('SELECT id, full_name, vote_count FROM nominees ORDER BY id');

  const rows = nominees.map((n) => ({
    id: n.id,
    name: n.full_name,
    cached: Number(n.vote_count),
    actual: actualByNominee.get(n.id) || 0,
  }));
  const drifted = rows.filter((r) => r.cached !== r.actual);

  const totalCached = rows.reduce((s, r) => s + r.cached, 0);
  const totalActual = rows.reduce((s, r) => s + r.actual, 0);

  console.log(`Nominees            : ${rows.length}`);
  console.log(`Votes in votes table: ${totalActual}`);
  console.log(`Sum of vote_count   : ${totalCached}`);
  console.log(`Nominees with drift : ${drifted.length}`);

  if (drifted.length === 0) {
    console.log('\nNothing to fix - all counters match.');
    await pool.end();
    return;
  }

  console.log('\n  id  cached  actual  nominee');
  console.log(`  ${'-'.repeat(58)}`);
  for (const r of drifted) {
    console.log(`  ${String(r.id).padStart(3)}  ${String(r.cached).padStart(6)}  ${String(r.actual).padStart(6)}  ${r.name}`);
  }

  if (!APPLY) {
    console.log('\nDry run only. Re-run with --apply to write the corrected counts.');
    await pool.end();
    return;
  }

  console.log('\nApplying corrections...');
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    for (const r of drifted) {
      await conn.query('UPDATE nominees SET vote_count = ? WHERE id = ?', [r.actual, r.id]);
    }
    await conn.commit();
    console.log(`Corrected ${drifted.length} nominee counter(s).`);
  } catch (err) {
    await conn.rollback();
    console.error('Recount failed, nothing was written:', err.message);
    process.exitCode = 1;
  } finally {
    conn.release();
  }

  // Nominees with zero votes but a non-zero cache, and vice versa.
  const [after] = await pool.query(
    `SELECT COUNT(*) AS mismatches
       FROM nominees n
       LEFT JOIN (SELECT nominee_id, COUNT(*) AS c FROM votes GROUP BY nominee_id) v
              ON v.nominee_id = n.id
      WHERE n.vote_count <> COALESCE(v.c, 0)`
  );
  console.log(`Remaining mismatches : ${after[0].mismatches}`);

  await pool.end();
}

main().catch((err) => {
  console.error('Recount failed:', err.message);
  process.exit(1);
});