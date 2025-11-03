import type { Knex } from "knex";

/**
 * Migration: Table Partitioning for High-Volume Analytics Tables
 * 
 * Implements date-based partitioning for tables that will grow rapidly:
 * - page_views: Partitioned by month (most active table)
 * - user_events: Partitioned by month
 * - property_interactions: Partitioned by quarter
 * - event_analytics: Partitioned by month
 * 
 * BENEFITS:
 * - Faster queries with partition pruning
 * - Easier data archival (drop old partitions)
 * - Better index performance
 * - Simplified backup/restore operations
 * 
 * NOTES:
 * - MySQL 5.7+ required
 * - Partitioning key must be part of PRIMARY KEY or UNIQUE keys
 * - This migration recreates tables, so run BEFORE production data
 */

export async function up(knex: Knex): Promise<void> {
  console.log("🚀 Starting table partitioning migration...");

  // =================================================================
  // 1. PAGE_VIEWS - Monthly Partitioning
  // =================================================================
  console.log("📊 Partitioning page_views table...");
  
  // Check if table exists and has data
  const pageViewsExists = await knex.schema.hasTable("page_views");
  
  if (pageViewsExists) {
    // Backup existing data
    await knex.raw(`CREATE TABLE page_views_backup AS SELECT * FROM page_views`);
    
    // Drop original table
    await knex.schema.dropTable("page_views");
  }

  // Recreate with partitioning
  await knex.raw(`
    CREATE TABLE page_views (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      session_id INT UNSIGNED NULL,
      visitor_id VARCHAR(36) NOT NULL,
      lead_mirror_id INT UNSIGNED NULL,
      page_url VARCHAR(500) NOT NULL,
      page_path VARCHAR(255) NOT NULL,
      page_title VARCHAR(255) NULL,
      page_type VARCHAR(100) NULL,
      referrer_url VARCHAR(500) NULL,
      referrer_domain VARCHAR(255) NULL,
      time_on_page_seconds INT UNSIGNED NULL,
      scroll_depth_percent INT UNSIGNED NULL,
      bounced BOOLEAN DEFAULT FALSE,
      previous_page_path VARCHAR(255) NULL,
      next_page_path VARCHAR(255) NULL,
      viewed_at TIMESTAMP NOT NULL,
      device VARCHAR(50) NULL,
      browser VARCHAR(100) NULL,
      location_city VARCHAR(100) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id, viewed_at),
      INDEX idx_session_id (session_id),
      INDEX idx_visitor_id (visitor_id),
      INDEX idx_page_path (page_path),
      INDEX idx_viewed_at (viewed_at),
      INDEX idx_path_time (page_path, viewed_at),
      INDEX idx_type_time (page_type, viewed_at),
      INDEX idx_visitor_time (visitor_id, viewed_at),
      INDEX idx_referrer_time (referrer_domain, viewed_at),
      FOREIGN KEY (session_id) REFERENCES user_sessions(id) ON DELETE SET NULL,
      FOREIGN KEY (lead_mirror_id) REFERENCES lead_mirrors(id) ON DELETE SET NULL
    ) ENGINE=InnoDB
    PARTITION BY RANGE (YEAR(viewed_at) * 100 + MONTH(viewed_at)) (
      PARTITION p202410 VALUES LESS THAN (202411),
      PARTITION p202411 VALUES LESS THAN (202412),
      PARTITION p202412 VALUES LESS THAN (202501),
      PARTITION p202501 VALUES LESS THAN (202502),
      PARTITION p202502 VALUES LESS THAN (202503),
      PARTITION p202503 VALUES LESS THAN (202504),
      PARTITION p202504 VALUES LESS THAN (202505),
      PARTITION p202505 VALUES LESS THAN (202506),
      PARTITION p202506 VALUES LESS THAN (202507),
      PARTITION p_future VALUES LESS THAN MAXVALUE
    )
  `);

  // Restore data if backup exists
  if (pageViewsExists) {
    await knex.raw(`INSERT INTO page_views SELECT * FROM page_views_backup`);
    await knex.raw(`DROP TABLE page_views_backup`);
  }

  // =================================================================
  // 2. USER_EVENTS - Monthly Partitioning
  // =================================================================
  console.log("📊 Partitioning user_events table...");
  
  const userEventsExists = await knex.schema.hasTable("user_events");
  
  if (userEventsExists) {
    await knex.raw(`CREATE TABLE user_events_backup AS SELECT * FROM user_events`);
    await knex.schema.dropTable("user_events");
  }

  await knex.raw(`
    CREATE TABLE user_events (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      session_id INT UNSIGNED NULL,
      visitor_id VARCHAR(36) NOT NULL,
      lead_mirror_id INT UNSIGNED NULL,
      event_type ENUM(
        'page_view','button_click','form_start','form_submit',
        'property_view','property_favorite','search','filter',
        'video_play','download','call_click','whatsapp_click',
        'email_click','share','scroll_depth'
      ) NOT NULL,
      event_category ENUM('navigation','engagement','conversion') NULL,
      page_url VARCHAR(500) NULL,
      page_path VARCHAR(255) NULL,
      page_title VARCHAR(255) NULL,
      element_selector VARCHAR(255) NULL,
      element_text VARCHAR(255) NULL,
      value JSON NULL,
      event_ts TIMESTAMP NOT NULL,
      user_agent VARCHAR(500) NULL,
      ip_address VARCHAR(45) NULL,
      device VARCHAR(50) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id, event_ts),
      INDEX idx_session_id (session_id),
      INDEX idx_visitor_id (visitor_id),
      INDEX idx_event_type (event_type),
      INDEX idx_event_category (event_category),
      INDEX idx_page_path (page_path),
      INDEX idx_event_ts (event_ts),
      INDEX idx_type_time (event_type, event_ts),
      INDEX idx_page_type (page_path, event_type),
      INDEX idx_visitor_time (visitor_id, event_ts),
      INDEX idx_category_time (event_category, event_ts),
      FOREIGN KEY (session_id) REFERENCES user_sessions(id) ON DELETE SET NULL,
      FOREIGN KEY (lead_mirror_id) REFERENCES lead_mirrors(id) ON DELETE SET NULL
    ) ENGINE=InnoDB
    PARTITION BY RANGE (YEAR(event_ts) * 100 + MONTH(event_ts)) (
      PARTITION p202410 VALUES LESS THAN (202411),
      PARTITION p202411 VALUES LESS THAN (202412),
      PARTITION p202412 VALUES LESS THAN (202501),
      PARTITION p202501 VALUES LESS THAN (202502),
      PARTITION p202502 VALUES LESS THAN (202503),
      PARTITION p202503 VALUES LESS THAN (202504),
      PARTITION p202504 VALUES LESS THAN (202505),
      PARTITION p202505 VALUES LESS THAN (202506),
      PARTITION p202506 VALUES LESS THAN (202507),
      PARTITION p_future VALUES LESS THAN MAXVALUE
    )
  `);

  if (userEventsExists) {
    await knex.raw(`INSERT INTO user_events SELECT * FROM user_events_backup`);
    await knex.raw(`DROP TABLE user_events_backup`);
  }

  // =================================================================
  // 3. PROPERTY_INTERACTIONS - Quarterly Partitioning
  // =================================================================
  console.log("📊 Partitioning property_interactions table...");
  
  const propertyInteractionsExists = await knex.schema.hasTable("property_interactions");
  
  if (propertyInteractionsExists) {
    await knex.raw(`CREATE TABLE property_interactions_backup AS SELECT * FROM property_interactions`);
    await knex.schema.dropTable("property_interactions");
  }

  await knex.raw(`
    CREATE TABLE property_interactions (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      visitor_id VARCHAR(36) NOT NULL,
      lead_mirror_id INT UNSIGNED NULL,
      session_id INT UNSIGNED NULL,
      property_id INT UNSIGNED NOT NULL,
      action VARCHAR(100) NOT NULL,
      action_category VARCHAR(50) NULL,
      value JSON NULL,
      apartment_id INT UNSIGNED NULL,
      interaction_ts TIMESTAMP NOT NULL,
      page_url VARCHAR(500) NULL,
      referrer_url VARCHAR(500) NULL,
      device VARCHAR(50) NULL,
      ip_address VARCHAR(45) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id, interaction_ts),
      INDEX idx_visitor_id (visitor_id),
      INDEX idx_session_id (session_id),
      INDEX idx_property_id (property_id),
      INDEX idx_apartment_id (apartment_id),
      INDEX idx_action (action),
      INDEX idx_interaction_ts (interaction_ts),
      INDEX idx_property_action (property_id, action),
      INDEX idx_property_time (property_id, interaction_ts),
      INDEX idx_action_time (action, interaction_ts),
      INDEX idx_visitor_property (visitor_id, property_id),
      INDEX idx_lead_property (lead_mirror_id, property_id),
      INDEX idx_category_time (action_category, interaction_ts),
      FOREIGN KEY (lead_mirror_id) REFERENCES lead_mirrors(id) ON DELETE SET NULL,
      FOREIGN KEY (session_id) REFERENCES user_sessions(id) ON DELETE SET NULL,
      FOREIGN KEY (property_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (apartment_id) REFERENCES apartments(id) ON DELETE SET NULL
    ) ENGINE=InnoDB
    PARTITION BY RANGE (YEAR(interaction_ts) * 10 + QUARTER(interaction_ts)) (
      PARTITION p2024q4 VALUES LESS THAN (20251),
      PARTITION p2025q1 VALUES LESS THAN (20252),
      PARTITION p2025q2 VALUES LESS THAN (20253),
      PARTITION p2025q3 VALUES LESS THAN (20254),
      PARTITION p2025q4 VALUES LESS THAN (20261),
      PARTITION p_future VALUES LESS THAN MAXVALUE
    )
  `);

  if (propertyInteractionsExists) {
    await knex.raw(`INSERT INTO property_interactions SELECT * FROM property_interactions_backup`);
    await knex.raw(`DROP TABLE property_interactions_backup`);
  }

  // =================================================================
  // 4. EVENT_ANALYTICS - Monthly Partitioning
  // =================================================================
  console.log("📊 Partitioning event_analytics table...");
  
  const eventAnalyticsExists = await knex.schema.hasTable("event_analytics");
  
  if (eventAnalyticsExists) {
    await knex.raw(`CREATE TABLE event_analytics_backup AS SELECT * FROM event_analytics`);
    await knex.schema.dropTable("event_analytics");
  }

  await knex.raw(`
    CREATE TABLE event_analytics (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      related_event_id INT UNSIGNED NULL,
      event_type VARCHAR(100) NOT NULL,
      visitor_id VARCHAR(36) NOT NULL,
      session_id VARCHAR(36) NULL,
      page_path VARCHAR(255) NULL,
      event_ts TIMESTAMP NOT NULL,
      sync_status ENUM('pending','sent','failed') NOT NULL DEFAULT 'pending',
      synced_at TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id, event_ts),
      INDEX idx_related_event_id (related_event_id),
      INDEX idx_event_type (event_type),
      INDEX idx_visitor_id (visitor_id),
      INDEX idx_session_id (session_id),
      INDEX idx_page_path (page_path),
      INDEX idx_event_ts (event_ts),
      INDEX idx_sync_status (sync_status),
      INDEX idx_visitor_time (visitor_id, event_ts),
      INDEX idx_session_time (session_id, event_ts),
      INDEX idx_type_time (event_type, event_ts),
      INDEX idx_sync_created (sync_status, created_at),
      FOREIGN KEY (related_event_id) REFERENCES events(id) ON DELETE SET NULL
    ) ENGINE=InnoDB
    PARTITION BY RANGE (YEAR(event_ts) * 100 + MONTH(event_ts)) (
      PARTITION p202410 VALUES LESS THAN (202411),
      PARTITION p202411 VALUES LESS THAN (202412),
      PARTITION p202412 VALUES LESS THAN (202501),
      PARTITION p202501 VALUES LESS THAN (202502),
      PARTITION p202502 VALUES LESS THAN (202503),
      PARTITION p202503 VALUES LESS THAN (202504),
      PARTITION p202504 VALUES LESS THAN (202505),
      PARTITION p202505 VALUES LESS THAN (202506),
      PARTITION p202506 VALUES LESS THAN (202507),
      PARTITION p_future VALUES LESS THAN MAXVALUE
    )
  `);

  if (eventAnalyticsExists) {
    await knex.raw(`INSERT INTO event_analytics SELECT * FROM event_analytics_backup`);
    await knex.raw(`DROP TABLE event_analytics_backup`);
  }

  console.log("✅ Table partitioning completed successfully!");
}

export async function down(knex: Knex): Promise<void> {
  console.log("⏪ Rolling back partitioning...");

  // Remove partitioning but keep data
  const tables = ['page_views', 'user_events', 'property_interactions', 'event_analytics'];
  
  for (const table of tables) {
    const exists = await knex.schema.hasTable(table);
    if (exists) {
      await knex.raw(`ALTER TABLE ${table} REMOVE PARTITIONING`);
    }
  }

  console.log("✅ Partitioning rollback completed!");
}