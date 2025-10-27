// 20251027133345_commercial_properties.ts
import type { Knex } from "knex";
import {
  addAuditFields,
  addForeignKey,
  addCheckConstraint,
} from "../migration-helpers";

/**
 * REFACTORED: Commercial Properties
 *
 * CHANGES:
 * 1. Removed map_embed_code (use separate media table)
 * 2. Added is_published flag
 * 3. Normalized contact form handling
 * 4. Improved property type enum
 *
 * BENEFITS:
 * - Publishing workflow
 * - Better property categorization
 * - Cleaner media separation
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("commercial_properties", (table) => {
    table.increments("id").primary();

    // Basic info
    table.string("title", 255).notNullable();
    table.string("slug", 255).notNullable().unique();
    table.string("subtitle", 255).nullable();
    table.text("description").notNullable();
    table.text("card_description").nullable();

    // Location
    table.string("address", 255).notNullable();
    table.decimal("latitude", 10, 8).nullable();
    table.decimal("longitude", 11, 8).nullable();
    addForeignKey(table, "location_id", "locations", "id", "SET NULL");

    // Property details
    table
      .enum("property_type", [
        "office",
        "shop",
        "warehouse",
        "showroom",
        "restaurant", // ADDED
        "mixed_use",
      ])
      .notNullable()
      .index();

    table.decimal("area_sqm", 10, 2).nullable();
    table.decimal("price", 15, 2).nullable();

    table
      .enum("status", ["available", "rented", "sold"])
      .defaultTo("available")
      .index();

    // Marketing
    table.string("main_image_url", 500).nullable();
    // REMOVED: contact_form_id (use separate forms table)
    table.boolean("is_featured").defaultTo(false).index();
    table.boolean("is_published").defaultTo(false).index(); // NEW

    // SEO
    table.string("meta_title", 255).nullable();
    table.text("meta_description").nullable();

    addAuditFields(table);

    // Composite indexes
    table.index(
      ["property_type", "status", "is_published"],
      "idx_type_status_pub"
    );
    table.index(["location_id", "property_type"], "idx_location_type");
  });

  // CHECK constraints
  await addCheckConstraint(
    knex,
    "commercial_properties",
    "comm_prop_area_check",
    "area_sqm IS NULL OR area_sqm > 0"
  );
  await addCheckConstraint(
    knex,
    "commercial_properties",
    "comm_prop_price_check",
    "price IS NULL OR price > 0"
  );
  await addCheckConstraint(
    knex,
    "commercial_properties",
    "comm_prop_lat_check",
    "latitude IS NULL OR (latitude >= -90 AND latitude <= 90)"
  );
  await addCheckConstraint(
    knex,
    "commercial_properties",
    "comm_prop_lng_check",
    "longitude IS NULL OR (longitude >= -180 AND longitude <= 180)"
  );
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("commercial_properties");
}
