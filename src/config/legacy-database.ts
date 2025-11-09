// src/config/legacy-database.ts
import knex, { Knex } from "knex";
import { loadEnv } from "@/config/load-env"


// Load environment variables
loadEnv();
const config: Knex.Config = {
  client: "mysql2",
  connection: {
    host: process.env.OLD_DB_HOST || "127.0.0.1",
    port: Number(process.env.OLD_DB_PORT) || 3306,
    user: process.env.OLD_DB_USER || "root",
    password: process.env.OLD_DB_PASSWORD || "",
    database: process.env.OLD_DB_NAME || "aymen-database",
  },
  pool: {
    min: 1,
    max: 3,
    acquireTimeoutMillis: 30000,
    idleTimeoutMillis: 30000,
  },
  debug: false,
};

let legacyDb: Knex;

try {
  legacyDb = knex(config);
} catch (error) {
  console.warn("Legacy database connection not available");
  // Create a dummy connection
  legacyDb = knex({
    client: "mysql2",
    connection: {
      host: "127.0.0.1",
      port: 3306,
      user: "root",
      password: "",
      database: "aymen-database",
    },
  });
}

export default legacyDb;
export { config };