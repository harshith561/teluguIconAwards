-- =====================================================================
-- 2026-10-19 Sponsor Management Migration
-- Adds category_id, link, logo, and updated_at to sponsors table
-- =====================================================================

ALTER TABLE `sponsors` ADD COLUMN IF NOT EXISTS `category_id` INT UNSIGNED NULL DEFAULT NULL AFTER `image_id`;
ALTER TABLE `sponsors` ADD COLUMN IF NOT EXISTS `logo` VARCHAR(500) NULL DEFAULT NULL AFTER `image_id`;
ALTER TABLE `sponsors` ADD COLUMN IF NOT EXISTS `link` VARCHAR(500) NULL DEFAULT NULL AFTER `website_url`;
ALTER TABLE `sponsors` ADD COLUMN IF NOT EXISTS `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER `created_at`;

-- Foreign key and index for category_id
-- (Wrapped in IF check so re-running is 100% idempotent)
SET @dbname = DATABASE();
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'sponsors' AND CONSTRAINT_NAME = 'fk_sponsors_category'
  ) > 0,
  'SELECT 1',
  'ALTER TABLE `sponsors` ADD KEY `idx_sponsors_category_id` (`category_id`), ADD CONSTRAINT `fk_sponsors_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL ON UPDATE CASCADE'
));
PREPARE alterFkStmt FROM @preparedStatement;
EXECUTE alterFkStmt;
DEALLOCATE PREPARE alterFkStmt;
