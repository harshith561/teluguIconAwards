-- =====================================================================
-- 2026-10-19 Unique Sponsor Type Migration
-- Enforces one sponsor per sponsor type across the platform
-- =====================================================================

-- 1. Add sponsor_type column if not exists
ALTER TABLE `sponsors` ADD COLUMN IF NOT EXISTS `sponsor_type` VARCHAR(100) NULL DEFAULT NULL AFTER `name`;

-- 2. Safely resolve any duplicate sponsor types before applying the unique index
UPDATE sponsors s1
JOIN sponsors s2 ON s1.sponsor_type = s2.sponsor_type AND s1.id > s2.id
SET s1.sponsor_type = NULL
WHERE s1.sponsor_type IS NOT NULL;

-- 3. Add unique index if not exists
SET @dbname = DATABASE();
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'sponsors' AND INDEX_NAME = 'uq_sponsors_sponsor_type'
  ) > 0,
  'SELECT 1',
  'ALTER TABLE `sponsors` ADD UNIQUE KEY `uq_sponsors_sponsor_type` (`sponsor_type`)'
));
PREPARE alterUniqueStmt FROM @preparedStatement;
EXECUTE alterUniqueStmt;
DEALLOCATE PREPARE alterUniqueStmt;
