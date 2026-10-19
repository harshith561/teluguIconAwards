-- =====================================================================
-- 2026-10-17 Database-Driven Image Storage Migration
-- =====================================================================

-- 1. Create IMAGES table to store binary image data and metadata in MySQL
CREATE TABLE IF NOT EXISTS `images` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `original_filename` VARCHAR(255) NOT NULL,
  `mime_type` VARCHAR(100) NOT NULL,
  `file_size` INT UNSIGNED NOT NULL,
  `image_data` LONGBLOB NOT NULL,
  `section` VARCHAR(100) NULL DEFAULT 'general',
  `entity_type` VARCHAR(100) NULL DEFAULT NULL,
  `entity_id` INT UNSIGNED NULL DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_images_entity` (`entity_type`, `entity_id`),
  KEY `idx_images_section` (`section`),
  KEY `idx_images_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Add image_id to sponsors if not exists
SET @dbname = DATABASE();
SET @tablename = 'sponsors';
SET @columnname = 'image_id';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND COLUMN_NAME = @columnname
  ) > 0,
  'SELECT 1',
  'ALTER TABLE `sponsors` ADD COLUMN `image_id` INT UNSIGNED NULL DEFAULT NULL AFTER `tier`, ADD KEY `idx_sponsors_image_id` (`image_id`), ADD CONSTRAINT `fk_sponsors_image` FOREIGN KEY (`image_id`) REFERENCES `images` (`id`) ON DELETE SET NULL ON UPDATE CASCADE'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;
