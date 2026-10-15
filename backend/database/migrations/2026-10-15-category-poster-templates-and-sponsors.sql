-- =====================================================================
-- 2026-10-15 Category Poster Templates & Category Sponsors Migration
-- =====================================================================

-- 1. Category Sponsors Junction Table
CREATE TABLE IF NOT EXISTS `category_sponsors` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `category_id` INT UNSIGNED NOT NULL,
  `sponsor_id` INT UNSIGNED NOT NULL,
  `role` VARCHAR(100) NOT NULL DEFAULT 'Category Partner',
  `sort_order` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_category_sponsor` (`category_id`, `sponsor_id`),
  KEY `idx_cat_sponsors_category` (`category_id`),
  KEY `idx_cat_sponsors_sponsor` (`sponsor_id`),
  CONSTRAINT `fk_cat_sponsors_category` FOREIGN KEY (`category_id`)
    REFERENCES `categories` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_cat_sponsors_sponsor` FOREIGN KEY (`sponsor_id`)
    REFERENCES `sponsors` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
