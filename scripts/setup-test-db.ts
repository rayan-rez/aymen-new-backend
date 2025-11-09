#!/usr/bin/env ts-node
/**
 * Test Database Setup Script
 * Creates test database and verifies connection
 * Run with: ts-node scripts/setup-test-db.ts
 */

import knex from "knex";
import dotenv from "dotenv";
import path from "path";

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, "../.env.test") });
dotenv.config({ path: path.resolve(__dirname, "../.env") });

async function setupTestDatabase() {
    console.log("\n🔧 Test Database Setup\n");
    console.log("=".repeat(50));

    // Configuration
    const host = process.env.DB_HOST || "127.0.0.1";
    const port = Number(process.env.DB_PORT) || 3306;
    const user = process.env.DB_USER || "root";
    const password = process.env.DB_PASSWORD || "";
    const database = process.env.DB_NAME || "aymen_db_test";

    console.log("\n📋 Configuration:");
    console.log(`   Host:     ${host}`);
    console.log(`   Port:     ${port}`);
    console.log(`   User:     ${user}`);
    console.log(`   Database: ${database}`);
    console.log(`   Password: ${password ? "***" : "(empty)"}`);

    // Connect to MySQL without selecting a database
    console.log("\n🔌 Connecting to MySQL...");
    const connection = knex({
        client: "mysql2",
        connection: {
            host,
            port,
            user,
            password,
        },
    });

    try {
        // Test connection
        await connection.raw("SELECT 1");
        console.log("✅ MySQL connection successful");

        // Create test database if it doesn't exist
        console.log(`\n🗄️  Creating database '${database}' if not exists...`);
        await connection.raw(`CREATE DATABASE IF NOT EXISTS \`${database}\``);
        console.log(`✅ Database '${database}' ready`);

        // Test database connection
        console.log("\n🔌 Testing database connection...");
        const dbConnection = knex({
            client: "mysql2",
            connection: {
                host,
                port,
                user,
                password,
                database,
            },
        });

        await dbConnection.raw("SELECT 1");
        console.log("✅ Database connection successful");

        // Show database info
        const [dbInfo] = await dbConnection.raw("SELECT DATABASE() as db");
        console.log(`\n📊 Connected to database: ${dbInfo[0].db}`);

        await dbConnection.destroy();

        console.log("\n" + "=".repeat(50));
        console.log("✅ Setup complete! You can now run tests.");
        console.log("\nRun tests with:");
        console.log("  npm test");
        console.log("=".repeat(50) + "\n");

    } catch (error: any) {
        console.error("\n❌ Setup failed:", error.message);
        console.error("\n💡 Troubleshooting:");
        console.error("   1. Ensure MySQL/MariaDB is running");
        console.error("   2. Check credentials in .env.test");
        console.error("   3. Verify user has CREATE DATABASE permission");
        console.error("   4. Try connecting manually:");
        console.error(`      mysql -h ${host} -P ${port} -u ${user} -p`);
        process.exit(1);
    } finally {
        await connection.destroy();
    }
}

setupTestDatabase();