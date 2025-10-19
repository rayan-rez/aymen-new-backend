import type { Knex } from "knex";

/**
 * Migration: System users (admins, sales team, etc.)
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("users", (table) => {
    table.increments("id").primary();

    // Basic info
    table.string("email", 255).notNullable().unique();
    table.string("password_hash", 255).notNullable();
    table.string("first_name", 100).notNullable();
    table.string("last_name", 100).notNullable();
    table.string("phone", 20).nullable();

    // Role and permissions
    table
      .enum("role", [
        "super_admin",
        "admin",
        "sales_manager",
        "sales_agent",
        "marketing",
        "content_manager",
        "viewer",
      ])
      .notNullable()
      .defaultTo("viewer");

    // Status
    table.boolean("is_active").defaultTo(true);
    table.timestamp("last_login_at").nullable();

    // Password reset
    table.string("reset_token", 255).nullable();
    table.timestamp("reset_token_expires_at").nullable();

    // Profile
    table.string("avatar_url", 500).nullable();
    table.json("preferences").nullable();

    table.timestamps(true, true);

    table.index("email");
    table.index(["role", "is_active"]);
  });

  // User activity log
  await knex.schema.createTable("user_activity_logs", (table) => {
    table.bigIncrements("id").primary();
    table
      .integer("user_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("CASCADE");

    table
      .enum("action_type", [
        "login",
        "logout",
        "create",
        "update",
        "delete",
        "view",
        "export",
      ])
      .notNullable();

    table.string("entity_type", 100).nullable(); // e.g., 'project', 'lead'
    table.integer("entity_id").unsigned().nullable();
    table.text("description").nullable();
    table.json("metadata").nullable();
    table.string("ip_address", 45).nullable();

    table.timestamp("created_at").defaultTo(knex.fn.now());

    table.index("user_id");
    table.index(["entity_type", "entity_id"]);
    table.index("created_at");
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("user_activity_logs");
  await knex.schema.dropTableIfExists("users");
}
