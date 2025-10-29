// src/config/database.ts
import knex, { Knex } from "knex";
import dotenv from "dotenv";

dotenv.config();

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
    min: 2,
    max: 10,
  },
};

const db = knex(config);

export default db;
export { config };
