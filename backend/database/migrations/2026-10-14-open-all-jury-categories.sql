-- ---------------------------------------------------------------------------
-- 2026-10-14  Open every award category to public voting
--
-- WHY: the 10 categories seeded as jury awards (type = 'jury',
-- voting_open = 0) could never receive a vote. Three separate gates rejected
-- them, and the admin dashboard showed no reason why:
--
--   1. voteRoutes.js:184   voting_open = 0        -> "Voting is currently closed"
--   2. voteRoutes.js:187   type = 'jury'          -> "handled through the jury process"
--   3. VotePage.jsx:30     filtered out of the category dropdown entirely
--
-- Gate 2 made gate 1 unreachable, and the status write in
-- adminRoutes.js committed before the nominee page was created, so a
-- "Shortlisted" nomination could sit there with no nominee behind it.
--
-- All three are fixed in code. This migration only brings the data in line:
-- every category is now a publicly voted People's Choice category.
--
-- The slugs are intentionally left as 'jury-*' so existing category URLs,
-- nominee links and QR codes do not break. Renaming them is a separate
-- decision that needs redirects.
--
-- Idempotent: safe to run more than once.
-- ---------------------------------------------------------------------------

UPDATE `categories`
   SET `type` = 'self_nomination',
       `voting_open` = 1
 WHERE `type` = 'jury'
    OR `voting_open` = 0;

-- Verify:
--   SELECT type, voting_open, COUNT(*) FROM categories GROUP BY type, voting_open;
--   -> expect a single row: self_nomination / 1 / 51