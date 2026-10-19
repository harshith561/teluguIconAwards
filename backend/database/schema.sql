-- =====================================================================
-- Telugu Icon Awards 2026 — MySQL / MariaDB schema (XAMPP)
-- ---------------------------------------------------------------------
-- Single, idempotent, complete schema. Running it repeatedly is safe:
--   tables use CREATE TABLE IF NOT EXISTS and every INSERT is guarded with
--   ON DUPLICATE KEY UPDATE.
--
-- It contains every table the API touches, so no extra migration files are
-- needed:
--   users, categories, nominations, nominees, otp_sessions, votes, sponsors,
--   settings, contact_messages, sms_senders, sms_templates, tickets,
--   ticket_orders, past_events, awardees, gallery_items, media_items,
--   video_items, sponsor_leads, audit_logs, nominee_campaign_events,
--   sponsor_slots, code_counters
--
-- Apply with:  npm run db:setup      (from backend/)
-- =====================================================================

CREATE DATABASE IF NOT EXISTS `telugu_icon_awards`
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `telugu_icon_awards`;

-- =============================================
-- USERS (Admins)
-- =============================================
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(120) NOT NULL,
  `email` VARCHAR(150) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` VARCHAR(20) NOT NULL DEFAULT 'admin',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- CATEGORIES (10 Jury & Special Recognition + 40 Self-Nomination)
-- =============================================
CREATE TABLE IF NOT EXISTS `categories` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(190) NOT NULL,
  `slug` VARCHAR(200) NOT NULL,
  `type` ENUM('jury','self_nomination') NOT NULL DEFAULT 'self_nomination',
  `description` TEXT NULL,
  `icon` VARCHAR(50) NULL,
  `sort_order` INT NOT NULL DEFAULT 0,
  `voting_open` TINYINT(1) NOT NULL DEFAULT 1,
  `poster_template` VARCHAR(50) NOT NULL DEFAULT 'gold_prestige',
  `poster_theme_color` VARCHAR(30) NULL DEFAULT '#D4AF37',
  `poster_badge_text` VARCHAR(100) NULL DEFAULT 'OFFICIAL NOMINEE',
  `poster_tagline` VARCHAR(255) NULL DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_categories_slug` (`slug`),
  KEY `idx_categories_type` (`type`),
  KEY `idx_categories_sort` (`sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- NOMINATIONS (SELF-NOMINATION ONLY)
-- Created before `nominees` because nominees.nomination_id references it.
-- =============================================
CREATE TABLE IF NOT EXISTS `nominations` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `category_id` INT UNSIGNED NOT NULL,
  `nomination_code` VARCHAR(20) NULL,
  `full_name` VARCHAR(190) NOT NULL,
  `creator_name` VARCHAR(190) NULL,
  `email` VARCHAR(150) NULL,
  `phone` VARCHAR(30) NULL,
  `city` VARCHAR(120) NULL,
  `state` VARCHAR(120) NULL,
  `primary_platform` VARCHAR(60) NULL,
  `youtube_url` VARCHAR(500) NULL,
  `instagram_url` VARCHAR(500) NULL,
  `facebook_url` VARCHAR(500) NULL,
  `other_profile_url` VARCHAR(500) NULL,
  `website_url` VARCHAR(500) NULL,
  `photo_url` VARCHAR(500) NULL,
  `journey` TEXT NULL,
  `achievements` TEXT NULL,
  `support_links` TEXT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'pending',
  `admin_notes` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_nominations_code` (`nomination_code`),
  KEY `idx_nominations_status` (`status`),
  KEY `idx_nominations_category` (`category_id`),
  KEY `idx_nominations_phone` (`phone`),
  CONSTRAINT `fk_nominations_category` FOREIGN KEY (`category_id`)
    REFERENCES `categories` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- NOMINEES (Approved creators / finalists)
-- =============================================
CREATE TABLE IF NOT EXISTS `nominees` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `category_id` INT UNSIGNED NOT NULL,
  `nomination_id` INT UNSIGNED NULL,
  `full_name` VARCHAR(190) NOT NULL,
  `slug` VARCHAR(210) NOT NULL,
  `bio` TEXT NULL,
  `achievements` TEXT NULL,
  `photo_url` VARCHAR(500) NULL,
  `social_handle` VARCHAR(190) NULL,
  `youtube_url` VARCHAR(500) NULL,
  `instagram_url` VARCHAR(500) NULL,
  `facebook_url` VARCHAR(500) NULL,
  `website_url` VARCHAR(500) NULL,
  `other_profile_url` VARCHAR(500) NULL,
  `followers_count` BIGINT NULL DEFAULT 0,
  `featured` TINYINT(1) NOT NULL DEFAULT 0,
  `status` VARCHAR(20) NOT NULL DEFAULT 'pending',
  `nominee_code` VARCHAR(20) NULL,
  `vote_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_nominees_slug` (`slug`),
  UNIQUE KEY `uq_nominees_code` (`nominee_code`),
  UNIQUE KEY `uq_nominees_nomination` (`nomination_id`),
  KEY `idx_nominees_category` (`category_id`),
  KEY `idx_nominees_status` (`status`),
  KEY `idx_nominees_featured` (`featured`),
  CONSTRAINT `fk_nominees_category` FOREIGN KEY (`category_id`)
    REFERENCES `categories` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_nominees_nomination` FOREIGN KEY (`nomination_id`)
    REFERENCES `nominations` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- OTP SESSIONS (Mobile verification for voting / status lookup)
-- =============================================
CREATE TABLE IF NOT EXISTS `otp_sessions` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `mobile` VARCHAR(20) NOT NULL,
  `token_hash` VARCHAR(64) NOT NULL,
  `purpose` VARCHAR(30) NOT NULL DEFAULT 'vote',
  `expires_at` DATETIME NOT NULL,
  `used_at` DATETIME NULL DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_otp_mobile` (`mobile`),
  KEY `idx_otp_token` (`token_hash`),
  KEY `idx_otp_expires` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- VOTES (OTP-verified, one per category per mobile/email/device)
-- =============================================
CREATE TABLE IF NOT EXISTS `votes` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `nominee_id` INT UNSIGNED NOT NULL,
  `category_id` INT UNSIGNED NOT NULL,
  `voter_name` VARCHAR(120) NULL,
  `voter_email` VARCHAR(150) NULL,
  `voter_phone` VARCHAR(30) NULL,
  `ip_address` VARCHAR(60) NULL,
  `user_agent` VARCHAR(300) NULL,
  `otp_verified` TINYINT(1) NOT NULL DEFAULT 0,
  `verification_token` VARCHAR(64) NULL,
  `device_fingerprint` VARCHAR(64) NULL,
  `is_flagged` TINYINT(1) NOT NULL DEFAULT 0,
  `flag_reason` VARCHAR(255) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_votes_category_phone` (`category_id`, `voter_phone`),
  UNIQUE KEY `uq_votes_category_email` (`category_id`, `voter_email`),
  UNIQUE KEY `uq_votes_category_device` (`category_id`, `device_fingerprint`),
  KEY `idx_votes_nominee` (`nominee_id`),
  KEY `idx_votes_category` (`category_id`),
  KEY `idx_votes_flagged` (`is_flagged`),
  KEY `idx_votes_created` (`created_at`),
  KEY `idx_votes_fingerprint` (`device_fingerprint`),
  KEY `idx_votes_ip` (`ip_address`),
  KEY `idx_votes_category_ip` (`category_id`, `ip_address`, `user_agent`),
  CONSTRAINT `fk_votes_nominee` FOREIGN KEY (`nominee_id`)
    REFERENCES `nominees` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_votes_category` FOREIGN KEY (`category_id`)
    REFERENCES `categories` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- IMAGES (Database-driven Binary Image Storage)
-- =============================================
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

-- =============================================
-- SPONSORS
-- =============================================
CREATE TABLE IF NOT EXISTS `sponsors` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(190) NOT NULL,
  `sponsor_type` VARCHAR(100) NULL DEFAULT NULL,
  `tier` ENUM('title_partner','powered_by','co_powered_by','gold','silver','category_partner','media_partner','digital_partner','travel_partner') NOT NULL DEFAULT 'gold',
  `image_id` INT UNSIGNED NULL DEFAULT NULL,
  `logo` VARCHAR(500) NULL,
  `logo_url` VARCHAR(500) NULL,
  `website_url` VARCHAR(300) NULL,
  `link` VARCHAR(500) NULL,
  `category_id` INT UNSIGNED NULL DEFAULT NULL,
  `tagline` VARCHAR(255) NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `sort_order` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_sponsors_sponsor_type` (`sponsor_type`),
  KEY `idx_sponsors_tier` (`tier`),
  KEY `idx_sponsors_active` (`is_active`),
  KEY `idx_sponsors_image_id` (`image_id`),
  KEY `idx_sponsors_category_id` (`category_id`),
  CONSTRAINT `fk_sponsors_image` FOREIGN KEY (`image_id`)
    REFERENCES `images` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_sponsors_category` FOREIGN KEY (`category_id`)
    REFERENCES `categories` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =============================================
-- CATEGORY SPONSORS (Category-specific sponsor associations)
-- =============================================
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

-- =============================================
-- SITE SETTINGS / ANNOUNCEMENTS
-- =============================================
CREATE TABLE IF NOT EXISTS `settings` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `setting_key` VARCHAR(120) NOT NULL,
  `setting_value` TEXT NULL,
  `group_name` VARCHAR(80) NOT NULL DEFAULT 'general',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_settings_key` (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- CONTACT MESSAGES
-- =============================================
CREATE TABLE IF NOT EXISTS `contact_messages` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(120) NOT NULL,
  `email` VARCHAR(150) NOT NULL,
  `phone` VARCHAR(30) NULL,
  `subject` VARCHAR(190) NULL,
  `message` TEXT NOT NULL,
  `is_read` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_contact_read` (`is_read`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- SMS SENDER IDS (Registered on the SMS provider / DLT platform)
-- =============================================
CREATE TABLE IF NOT EXISTS `sms_senders` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `sender_id` VARCHAR(20) NOT NULL,
  `name` VARCHAR(120) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_sms_sender_id` (`sender_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- SMS TEMPLATES (Approved DLT templates for OTP / transactional SMS)
-- =============================================
CREATE TABLE IF NOT EXISTS `sms_templates` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(120) NOT NULL,
  `sender_id` VARCHAR(20) NOT NULL,
  `dlt_template_id` VARCHAR(120) NOT NULL,
  `content` TEXT NULL,
  `template_type` ENUM('otp','transactional') NOT NULL DEFAULT 'otp',
  `is_active` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_sms_templates_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- TICKETS (Configuration per session & tier)
-- =============================================
CREATE TABLE IF NOT EXISTS `tickets` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `session` SMALLINT NOT NULL COMMENT '1 = 10AM-2PM, 2 = 3PM-7PM',
  `tier` VARCHAR(10) NOT NULL COMMENT 'vvip | mip',
  `price_paisa` INT NOT NULL COMMENT 'price in paise (50000 = Rs.500)',
  `inventory` INT NOT NULL DEFAULT 0 COMMENT 'admin-only, never exposed publicly',
  `sold` INT NOT NULL DEFAULT 0,
  `availability` VARCHAR(20) NOT NULL DEFAULT 'available' COMMENT 'available|filling_fast|almost_sold_out|sold_out',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_tickets_session_tier` (`session`, `tier`),
  CONSTRAINT `chk_tickets_session` CHECK (`session` IN (1, 2)),
  CONSTRAINT `chk_tickets_tier` CHECK (`tier` IN ('vvip', 'mip'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- TICKET ORDERS
-- =============================================
CREATE TABLE IF NOT EXISTS `ticket_orders` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `order_code` VARCHAR(30) NOT NULL,
  `ticket_id` INT UNSIGNED NOT NULL,
  `session` SMALLINT NOT NULL,
  `tier` VARCHAR(10) NOT NULL,
  `quantity` SMALLINT NOT NULL DEFAULT 1,
  `price_paisa` INT NOT NULL,
  `buyer_name` VARCHAR(190) NOT NULL,
  `buyer_email` VARCHAR(150) NOT NULL,
  `buyer_phone` VARCHAR(30) NOT NULL,
  `payment_status` VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT 'pending|paid|failed|refunded',
  `payment_reference` VARCHAR(120) NULL,
  `qr_token` VARCHAR(64) NOT NULL,
  `is_checked_in` TINYINT(1) NOT NULL DEFAULT 0,
  `checked_in_at` DATETIME NULL,
  `food_entitlement` VARCHAR(20) NOT NULL DEFAULT 'lunch' COMMENT 'lunch | dinner',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_ticket_orders_code` (`order_code`),
  UNIQUE KEY `uq_ticket_orders_qr` (`qr_token`),
  KEY `idx_ticket_orders_phone` (`buyer_phone`),
  KEY `idx_ticket_orders_status` (`payment_status`),
  KEY `idx_ticket_orders_ticket` (`ticket_id`),
  CONSTRAINT `fk_ticket_orders_ticket` FOREIGN KEY (`ticket_id`)
    REFERENCES `tickets` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- PAST EVENTS
-- =============================================
CREATE TABLE IF NOT EXISTS `past_events` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `slug` VARCHAR(200) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `event_date` DATE NULL,
  `year` SMALLINT NOT NULL,
  `venue` VARCHAR(255) NULL,
  `description` TEXT NULL,
  `poster_url` VARCHAR(500) NULL,
  `is_published` TINYINT(1) NOT NULL DEFAULT 1,
  `sort_order` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_past_events_slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- AWARDEES (winners from past events)
-- =============================================
CREATE TABLE IF NOT EXISTS `awardees` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `past_event_id` INT UNSIGNED NOT NULL,
  `name` VARCHAR(190) NOT NULL,
  `category` VARCHAR(255) NOT NULL,
  `award_type` VARCHAR(80) NULL,
  `photo_url` VARCHAR(500) NULL,
  `bio` TEXT NULL,
  `social_handle` VARCHAR(190) NULL,
  `year` SMALLINT NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_awardees_event` (`past_event_id`),
  KEY `idx_awardees_year` (`year`),
  CONSTRAINT `fk_awardees_event` FOREIGN KEY (`past_event_id`)
    REFERENCES `past_events` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- GALLERY ITEMS
-- =============================================
CREATE TABLE IF NOT EXISTS `gallery_items` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `category` VARCHAR(80) NOT NULL DEFAULT 'general',
  `item_type` VARCHAR(20) NOT NULL DEFAULT 'image' COMMENT 'image|video|youtube|instagram',
  `url` VARCHAR(500) NOT NULL,
  `thumbnail_url` VARCHAR(500) NULL,
  `title` VARCHAR(255) NULL,
  `description` TEXT NULL,
  `sort_order` INT NOT NULL DEFAULT 0,
  `is_published` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_gallery_category` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- MEDIA / PRESS ROOM
-- =============================================
CREATE TABLE IF NOT EXISTS `media_items` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `item_type` VARCHAR(20) NOT NULL DEFAULT 'press_release' COMMENT 'press_release|news|announcement|poster|photo|download|logo',
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  `url` VARCHAR(500) NULL,
  `thumbnail_url` VARCHAR(500) NULL,
  `source` VARCHAR(120) NULL,
  `published_date` DATE NULL,
  `is_published` TINYINT(1) NOT NULL DEFAULT 1,
  `sort_order` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_media_type` (`item_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- VIDEO HUB
-- =============================================
CREATE TABLE IF NOT EXISTS `video_items` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `category` VARCHAR(80) NOT NULL DEFAULT 'event_highlights',
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  `youtube_id` VARCHAR(30) NULL,
  `thumbnail_url` VARCHAR(500) NULL,
  `duration` VARCHAR(20) NULL,
  `is_published` TINYINT(1) NOT NULL DEFAULT 1,
  `sort_order` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_video_category` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- SPONSOR LEADS
-- =============================================
CREATE TABLE IF NOT EXISTS `sponsor_leads` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `company` VARCHAR(190) NOT NULL,
  `contact_person` VARCHAR(190) NOT NULL,
  `mobile` VARCHAR(30) NOT NULL,
  `email` VARCHAR(150) NOT NULL,
  `industry` VARCHAR(120) NULL,
  `package_interest` VARCHAR(80) NULL,
  `message` TEXT NULL,
  `is_read` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_sponsor_leads_read` (`is_read`),
  KEY `idx_sponsor_leads_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- AUDIT LOGS
-- =============================================
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `admin_id` INT UNSIGNED NULL,
  `admin_email` VARCHAR(150) NULL,
  `action` VARCHAR(80) NOT NULL,
  `entity_type` VARCHAR(60) NULL,
  `entity_id` INT UNSIGNED NULL,
  `details` TEXT NULL,
  `ip_address` VARCHAR(60) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_audit_action` (`action`),
  KEY `idx_audit_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- NOMINEE CAMPAIGN ANALYTICS
-- page views, voting-page clicks, share clicks, QR scans.
-- Conversions are counted from the `votes` table so they can never disagree
-- with the real tally.
-- =============================================
CREATE TABLE IF NOT EXISTS `nominee_campaign_events` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `nominee_id` INT UNSIGNED NOT NULL,
  `event_type` VARCHAR(30) NOT NULL,
  `source` VARCHAR(60) NULL,
  `referrer` VARCHAR(300) NULL,
  `fingerprint` VARCHAR(64) NULL,
  `ip_address` VARCHAR(60) NULL,
  `user_agent` VARCHAR(300) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_campaign_events_nominee` (`nominee_id`),
  KEY `idx_campaign_events_type` (`event_type`),
  KEY `idx_campaign_events_created` (`created_at`),
  KEY `idx_campaign_events_dedupe` (`nominee_id`, `event_type`, `fingerprint`, `created_at`),
  CONSTRAINT `fk_campaign_events_nominee` FOREIGN KEY (`nominee_id`)
    REFERENCES `nominees` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Retention: campaign events are aggregate-only and hold no voter identity, so
-- old rows can be pruned freely:
--   DELETE FROM nominee_campaign_events WHERE created_at < NOW() - INTERVAL 18 MONTH;

-- =============================================
-- SPONSORSHIP SLOTS
-- Sponsor branding is addable later without rebuilding the nominee pages.
-- =============================================
CREATE TABLE IF NOT EXISTS `sponsor_slots` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `slot_key` VARCHAR(60) NOT NULL,
  `label` VARCHAR(120) NULL,
  `sponsor_id` INT UNSIGNED NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_sponsor_slots_key` (`slot_key`),
  CONSTRAINT `fk_sponsor_slots_sponsor` FOREIGN KEY (`sponsor_id`)
    REFERENCES `sponsors` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- CODE COUNTERS
-- MySQL has no sequences, so the TIC26-##### nominee codes are minted from a
-- one-row-per-name counter incremented with LAST_INSERT_ID() (see
-- utils/nomineeIdentity.js). Safe under concurrency, unlike MAX(id)+1.
-- =============================================
CREATE TABLE IF NOT EXISTS `code_counters` (
  `name` VARCHAR(40) NOT NULL,
  `value` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `code_counters` (`name`, `value`) VALUES ('nominee_code', 0)
  ON DUPLICATE KEY UPDATE `name` = `name`;

-- =====================================================================
-- SEED DATA
-- =====================================================================

-- Default Admin (password: Admin@tiaawards2026 - bcrypt hash)
INSERT INTO `users` (`name`, `email`, `password_hash`, `role`) VALUES
('Super Admin', 'admin@teluguiconawards.com', '$2a$10$ZKLD0mLVZzZG1rnpLR1gCeu1QI3EwMAy.M3ajYGIO4iJZ3yAbwyP.', 'super_admin')
ON DUPLICATE KEY UPDATE `password_hash` = VALUES(`password_hash`);

-- -------------------------------------------------
-- 10 SPECIAL RECOGNITION AWARDS
--
-- These were originally seeded as jury awards (type 'jury', voting_open 0),
-- which made them impossible to vote in - see
-- migrations/2026-10-14-open-all-jury-categories.sql for the full story. They
-- are now publicly voted People's Choice categories like every other award.
-- The 'jury-*' slugs are kept on purpose so existing category URLs, nominee
-- links and QR codes do not break; renaming them needs redirects.
-- -------------------------------------------------
INSERT INTO `categories` (`name`, `slug`, `type`, `description`, `icon`, `sort_order`, `voting_open`) VALUES
('Telugu Digital Creator of the Year', 'jury-digital-creator-year', 'self_nomination', 'The most outstanding digital creator of the year across the Telugu ecosystem.', 'crown', 1, 1),
('Telugu Digital Icon of the Year', 'jury-digital-icon-year', 'self_nomination', 'The defining digital icon of the Telugu creator ecosystem.', 'trophy', 2, 1),
('Telugu Influencer of the Year', 'jury-influencer-year', 'self_nomination', 'The most influential digital personality shaping Telugu culture.', 'star', 3, 1),
('Creator Excellence Award', 'jury-creator-excellence', 'self_nomination', 'Sustained excellence in content creation and community building.', 'medal', 4, 1),
('Most Popular Digital Creator', 'jury-most-popular', 'self_nomination', 'The digital creator with the widest public reach and love.', 'heart', 5, 1),
('Best Male Digital Creator', 'jury-best-male-creator', 'self_nomination', 'Outstanding male digital creator of the year.', 'male', 6, 1),
('Best Female Digital Creator', 'jury-best-female-creator', 'self_nomination', 'Outstanding female digital creator of the year.', 'female', 7, 1),
('Rising Digital Star of the Year', 'jury-rising-star', 'self_nomination', 'The breakout digital talent of the year.', 'rocket', 8, 1),
('Digital Entrepreneur of the Year', 'jury-digital-entrepreneur', 'self_nomination', 'The creator-entrepreneur building the most significant digital business.', 'briefcase', 9, 1),
('Lifetime Achievement Award - Digital Media', 'jury-lifetime-achievement', 'self_nomination', 'Honouring a lifetime of contribution to Telugu digital media.', 'award', 10, 1)
ON DUPLICATE KEY UPDATE `name` = `name`;

-- -------------------------------------------------
-- 40 SELF-NOMINATION CATEGORIES
-- (Creator self-nomination -> verification ->
--  shortlisting -> public voting -> winner)
-- -------------------------------------------------
INSERT INTO `categories` (`name`, `slug`, `type`, `description`, `icon`, `sort_order`, `voting_open`) VALUES
('Telugu YouTuber of the Year', 'sn-youtuber-year', 'self_nomination', 'The most outstanding Telugu YouTube creator of the year.', 'play', 11, 1),
('Best Entertainment Creator', 'sn-entertainment', 'self_nomination', 'Creator delivering top-tier entertainment content.', 'laugh', 12, 1),
('Best Comedy Creator', 'sn-comedy', 'self_nomination', 'Creator who makes Telugu audiences laugh the most.', 'joker', 13, 1),
('Best Family Creator', 'sn-family', 'self_nomination', 'Family-first content that resonates across generations.', 'family', 14, 1),
('Best Storytelling Creator', 'sn-storytelling', 'self_nomination', 'Masterful narrative and storytelling craft.', 'book', 15, 1),
('Best Viral Creator', 'sn-viral', 'self_nomination', 'Creator whose content consistently breaks the internet.', 'flame', 16, 1),
('Best Short-Form Creator', 'sn-short-form', 'self_nomination', 'Excellence in short-form digital content.', 'lightning', 17, 1),
('Best Lifestyle Creator', 'sn-lifestyle', 'self_nomination', 'Best lifestyle, wellness and everyday-living content.', 'sparkle', 18, 1),
('Best Content Creator', 'sn-content', 'self_nomination', 'Overall excellence in digital content creation.', 'star', 19, 1),
('Best Current Affairs Creator', 'sn-current-affairs', 'self_nomination', 'Sharp, credible current affairs and news analysis.', 'news', 20, 1),
('Best Knowledge Creator', 'sn-knowledge', 'self_nomination', 'Creator who makes learning and knowledge exciting.', 'book', 21, 1),
('Best Tech Creator', 'sn-tech', 'self_nomination', 'Best technology content creator.', 'chip', 22, 1),
('Best Food Creator', 'sn-food', 'self_nomination', 'Best food exploration and food content creator.', 'food', 23, 1),
('Best Travel Creator', 'sn-travel', 'self_nomination', 'Best travel, culture and adventure exploration.', 'plane', 24, 1),
('Best Educational Creator', 'sn-education', 'self_nomination', 'Best creator making education accessible and engaging.', 'graduation', 25, 1),
('Best Gaming Creator', 'sn-gaming', 'self_nomination', 'Best gaming, streaming and esports creator.', 'game', 26, 1),
('Best Podcast Creator', 'sn-podcast', 'self_nomination', 'Best Telugu podcast and audio creator.', 'podcast', 27, 1),
('Best Reels Creator', 'sn-reels', 'self_nomination', 'Best Instagram Reels / short-format visual creator.', 'reels', 28, 1),
('Best Comedy Shorts Creator', 'sn-comedy-shorts', 'self_nomination', 'Best comedy delivered through short-form video.', 'joker', 29, 1),
('Best Creator Collaboration', 'sn-collaboration', 'self_nomination', 'Best collaboration between creators.', 'handshake', 30, 1),
('Best Instagram Creator', 'sn-instagram', 'self_nomination', 'Best overall Instagram creator.', 'instagram', 31, 1),
('Best Digital Journalist', 'sn-digital-journalist', 'self_nomination', 'Best journalism and reporting on digital platforms.', 'mic', 32, 1),
('Best Facts Creator', 'sn-facts', 'self_nomination', 'Best facts, trivia and discovery content.', 'atom', 33, 1),
('Best Motivational Creator', 'sn-motivational', 'self_nomination', 'Creator who inspires and motivates audiences.', 'medal', 34, 1),
('Best AI Creator', 'sn-ai', 'self_nomination', 'Best creator exploring AI tools and innovation.', 'ai', 35, 1),
('Best Gadget Reviewer', 'sn-gadget-review', 'self_nomination', 'Best gadget reviews and unboxings.', 'camera', 36, 1),
('Best Mobile Tech Creator', 'sn-mobile-tech', 'self_nomination', 'Best smartphone and mobile technology content.', 'smartphone', 37, 1),
('Best Innovation Creator', 'sn-innovation', 'self_nomination', 'Creator pushing the boundaries of digital innovation.', 'rocket', 38, 1),
('Best Cooking Creator', 'sn-cooking', 'self_nomination', 'Best cooking and recipe content.', 'chef', 39, 1),
('Best Street Food Creator', 'sn-street-food', 'self_nomination', 'Best street food exploration content.', 'food', 40, 1),
('Best Restaurant Review Creator', 'sn-restaurant-review', 'self_nomination', 'Best restaurant reviews and food critique.', 'plate', 41, 1),
('Best Adventure Creator', 'sn-adventure', 'self_nomination', 'Best adventure and exploration content.', 'mountain', 42, 1),
('Best Fashion Creator', 'sn-fashion', 'self_nomination', 'Best fashion and style content.', 'hanger', 43, 1),
('Best Beauty Creator', 'sn-beauty', 'self_nomination', 'Best beauty, skincare and makeup content.', 'lipstick', 44, 1),
('Best Home Chef Creator', 'sn-home-chef', 'self_nomination', 'Best home cooking creator bringing Telugu kitchens online.', 'home', 45, 1),
('Best Career Guidance Creator', 'sn-career', 'self_nomination', 'Best career, skill and job guidance content.', 'briefcase', 46, 1),
('Best Startup Creator', 'sn-startup', 'self_nomination', 'Best startup and entrepreneurship content.', 'launch', 47, 1),
('Best Business Creator', 'sn-business', 'self_nomination', 'Best business and commerce content.', 'growth', 48, 1),
('Best Finance Creator', 'sn-finance', 'self_nomination', 'Best financial literacy and money-management content.', 'coins', 49, 1),
('Best Music & Dance Creator', 'sn-music-dance', 'self_nomination', 'Best music and dance content creator.', 'music', 50, 1)
ON DUPLICATE KEY UPDATE `name` = `name`;

-- Ticket configuration (inventory is admin-only, never exposed publicly)
INSERT INTO `tickets` (`session`, `tier`, `price_paisa`, `inventory`, `sold`, `availability`, `is_active`) VALUES
  (1, 'vvip', 50000, 200, 0, 'available', 1),
  (1, 'mip',  100000, 100, 0, 'available', 1),
  (2, 'vvip', 50000, 200, 0, 'available', 1),
  (2, 'mip',  100000, 100, 0, 'available', 1)
ON DUPLICATE KEY UPDATE `tier` = `tier`;

-- Past events
INSERT INTO `past_events` (`slug`, `name`, `event_date`, `year`, `venue`, `description`, `sort_order`) VALUES
  ('telugu-icon-awards-2026', 'Telugu Icon Awards 2026', '2026-08-30', 2026, 'Hyderabad',
   'The Telugu Icon Awards 2026, held on 30 August 2026 in Hyderabad, recognized outstanding talent across cinema, culture, and entertainment. A celebration of Telugu excellence.', 1),
  ('stree-shakti-pratibha-awards-2025', 'Stree Shakti Pratibha Awards 2025', NULL, 2025, 'Hyderabad',
   'The Stree Shakti Pratibha Awards 2025 celebrated remarkable women achievers across multiple fields, recognizing their courage, contribution, and leadership. Organized by Pracharam Media.', 2)
ON DUPLICATE KEY UPDATE `name` = `name`;

-- Sponsor branding slots used on the nominee pages
INSERT INTO `sponsor_slots` (`slot_key`, `label`, `is_active`) VALUES
  ('nominee_page_voting_powered_by', 'Voting Powered By', 1),
  ('nominee_page_category_partner', 'Category Sponsor', 0),
  ('nominee_page_title_partner', 'Title Sponsor', 0)
ON DUPLICATE KEY UPDATE `label` = `label`;

-- Site Settings
INSERT INTO `settings` (`setting_key`, `setting_value`, `group_name`) VALUES
('event_name', 'Telugu Icon Digital & Influencer Awards 2026', 'general'),
('event_tagline', 'Celebrating the Voices. Inspiring the Community. Shaping the Digital Future.', 'general'),
('event_logo_text', 'TELUGU ICON', 'general'),
('event_date', '2026-11-16 10:00:00', 'event'),
('event_venue', 'Shilpakala Vedika, Hyderabad', 'event'),
('event_phase', 'phase_2', 'event'),
('nominations_open', '1', 'voting'),
('voting_open', '1', 'voting'),
('vote_verification', 'otp', 'voting'),
('otp_delivery', 'onsite', 'voting'),
('contact_email', 'info@teluguiconawards.in', 'contact'),
('contact_phone', '+91 94944 57274', 'contact'),
('contact_address', 'Shilpakala Vedika, Hyderabad, Telangana', 'contact'),
('hero_headline', 'Celebrating the Icons of the Telugu Digital World', 'content'),
('hero_subheadline', 'Telugu Icon Digital & Influencer Awards 2026 - celebrating the voices shaping Telugu digital culture.', 'content'),
('announcement', 'Self-nominations are now open for the Telugu Icon Digital & Influencer Awards 2026!', 'content')
ON DUPLICATE KEY UPDATE
  `setting_value` = VALUES(`setting_value`),
  `group_name` = VALUES(`group_name`);

-- Sample Sponsor (remove/replace with confirmed partners)
INSERT INTO `sponsors` (`id`, `name`, `tier`, `website_url`, `tagline`, `sort_order`) VALUES
  (1, 'Major Sponsor', 'title_partner', 'https://example.com', 'Leading the celebration of Telugu digital excellence', 1)
ON DUPLICATE KEY UPDATE `name` = `name`;

-- Sample SMS Sender ID (replace with the sender IDs registered on the DLT platform)
INSERT INTO `sms_senders` (`sender_id`, `name`) VALUES
  ('PRAHRM', 'Pracharam Media')
ON DUPLICATE KEY UPDATE `name` = `name`;

-- =====================================================================
-- Done. The database is ready for the API.
-- =====================================================================