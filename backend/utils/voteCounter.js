/**
 * voteCounter.js
 * --------------
 * Batched, in-process accumulator for `nominees.vote_count`.
 *
 * WHY THIS EXISTS
 * `votes.nominee_id` is a foreign key to `nominees.id`, so every vote INSERT
 * makes InnoDB take a shared lock on that nominee row and hold it until the
 * transaction commits. A per-vote `UPDATE nominees SET vote_count = ...`
 * therefore queues behind every in-flight insert for the same nominee. Moving
 * that update after the commit removed the S->X upgrade deadlock but NOT the
 * wait: measured 1,044 row-lock waits per ~11,000 votes, and throughput sat at
 * ~560 votes/s because the row was still contended.
 *
 * The fix is to stop writing that row per vote. Votes are counted here in
 * memory and flushed once per FLUSH_INTERVAL_MS as one UPDATE per nominee.
 * That turns N row writes per second into (nominees x flushes) - about 50 a
 * second no matter how fast people vote - which removes the contention and
 * lets voting scale with instances rather than against a single row.
 *
 * ACCURACY
 * `votes` remains the source of truth. If the process dies between a commit
 * and a flush, that batch is lost from the cache only. Run
 *   node scripts/recount-votes.js --apply
 * to rebuild every counter from the votes table. That is the trade-off for
 * removing the contention, and it is a deliberate one.
 */

const FLUSH_INTERVAL_MS = 1000;

// nomineeId -> number of votes recorded since the last flush
const pending = new Map();
let flushing = false;

function record(nomineeId) {
  const id = Number(nomineeId);
  if (!Number.isFinite(id)) return;
  pending.set(id, (pending.get(id) || 0) + 1);
}

/**
 * Apply everything queued so far.
 * Returns { flushed, nominees, failed } for logging/metrics.
 */
async function flush(pool) {
  if (flushing || pending.size === 0) return { flushed: 0, nominees: 0, failed: 0 };
  flushing = true;

  const batch = Array.from(pending.entries());
  pending.clear();

  let flushed = 0;
  let failed = 0;

  try {
    for (const [nomineeId, delta] of batch) {
      try {
        await pool.query(
          'UPDATE nominees SET vote_count = vote_count + ? WHERE id = ?',
          [delta, nomineeId]
        );
        flushed += delta;
      } catch (err) {
        // Put it back so the next tick retries. Counts converge instead of
        // silently disappearing.
        pending.set(nomineeId, (pending.get(nomineeId) || 0) + delta);
        failed += delta;
        console.error(`voteCounter: flush failed for nominee ${nomineeId}: ${err.message}`);
      }
    }
  } finally {
    flushing = false;
  }

  return { flushed, nominees: batch.length, failed };
}

function startAutoFlush(pool, intervalMs = FLUSH_INTERVAL_MS) {
  const timer = setInterval(() => {
    flush(pool).catch((err) => console.error('voteCounter flush error:', err.message));
  }, intervalMs);
  timer.unref();
  return timer;
}

const pendingVotes = () => Array.from(pending.entries());

module.exports = { record, flush, startAutoFlush, pendingVotes, FLUSH_INTERVAL_MS };