import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  // View: Project Performance Metrics
  await knex.raw(`
    CREATE VIEW v_project_metrics AS
    SELECT 
      p.id,
      p.name,
      p.status,
      COUNT(DISTINCT a.id) as total_apartments,
      COUNT(DISTINCT CASE WHEN a.status = 'available' THEN a.id END) as available_apartments,
      COUNT(DISTINCT CASE WHEN a.status = 'sold' THEN a.id END) as sold_apartments,
      COUNT(DISTINCT pi.visitor_id) as unique_visitors,
      COUNT(DISTINCT pi.id) as total_interactions,
      COUNT(DISTINCT CASE WHEN pi.action = 'inquiry' THEN pi.id END) as inquiries,
      MIN(a.price) as min_price,
      MAX(a.price) as max_price,
      AVG(a.price) as avg_price
    FROM projects p
    LEFT JOIN apartments a ON p.id = a.project_id
    LEFT JOIN property_interactions pi ON p.id = pi.property_id
    GROUP BY p.id, p.name, p.status
  `);

  // View: Lead Conversion Funnel
  await knex.raw(`
    CREATE VIEW v_lead_funnel AS
    SELECT 
      DATE(fs.submitted_at) as date,
      fs.form_type,
      COUNT(DISTINCT fs.id) as submissions,
      COUNT(DISTINCT lm.id) as leads_created,
      COUNT(DISTINCT CASE WHEN lm.sync_status = 'synced' THEN lm.id END) as synced_to_odoo,
      ROUND(COUNT(DISTINCT lm.id) * 100.0 / COUNT(DISTINCT fs.id), 2) as conversion_rate
    FROM form_submissions fs
    LEFT JOIN lead_mirrors lm ON fs.id = lm.form_submission_id
    GROUP BY DATE(fs.submitted_at), fs.form_type
  `);

  // View: Top Performing Properties
  await knex.raw(`
    CREATE VIEW v_top_properties AS
    SELECT 
      p.id,
      p.name,
      p.project_type,
      COUNT(DISTINCT pi.visitor_id) as unique_visitors,
      COUNT(DISTINCT CASE WHEN pi.action = 'view' THEN pi.id END) as views,
      COUNT(DISTINCT CASE WHEN pi.action = 'favorite' THEN pi.id END) as favorites,
      COUNT(DISTINCT CASE WHEN pi.action = 'inquiry' THEN pi.id END) as inquiries,
      ROUND(
        COUNT(DISTINCT CASE WHEN pi.action = 'inquiry' THEN pi.id END) * 100.0 / 
        NULLIF(COUNT(DISTINCT CASE WHEN pi.action = 'view' THEN pi.id END), 0),
        2
      ) as inquiry_rate
    FROM projects p
    LEFT JOIN property_interactions pi ON p.id = pi.property_id
    WHERE p.is_published = true
    GROUP BY p.id, p.name, p.project_type
  `);

  // View: Session Attribution Summary
  await knex.raw(`
    CREATE VIEW v_session_attribution AS
    SELECT 
      DATE(start_time) as date,
      utm_source,
      utm_medium,
      utm_campaign,
      device,
      location_region,
      COUNT(DISTINCT session_id) as sessions,
      SUM(pages_viewed) as total_page_views,
      AVG(duration_seconds) as avg_duration,
      COUNT(DISTINCT lead_mirror_id) as conversions
    FROM user_sessions
    GROUP BY 
      DATE(start_time),
      utm_source,
      utm_medium,
      utm_campaign,
      device,
      location_region
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw("DROP VIEW IF EXISTS v_session_attribution");
  await knex.raw("DROP VIEW IF EXISTS v_top_properties");
  await knex.raw("DROP VIEW IF EXISTS v_lead_funnel");
  await knex.raw("DROP VIEW IF EXISTS v_project_metrics");
}
