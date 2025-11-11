// scripts/verify-legacy-db.ts
// Run with: npx ts-node -r tsconfig-paths/register scripts/verify-legacy-db.ts

import legacyDb from "../src/config/legacy-database";
import db from "../src/config/database";

async function verifyLegacyDatabase() {
    console.log("\n" + "=".repeat(70));
    console.log("🔍 LEGACY DATABASE VERIFICATION");
    console.log("=".repeat(70) + "\n");

    try {
        // Test legacy connection
        await legacyDb.raw("SELECT 1");
        console.log("✓ Legacy database connection successful\n");

        // Check tables exist
        const tables = [
            "projets",
            "projet_filtre",
            "photos_projets",
            "appartements",
            "photos_appartements",
            "caracteristiques_projets",
            "projets_caracteristiques",
            "localites",
        ];

        console.log("📋 Checking Legacy Tables:\n");

        for (const table of tables) {
            try {
                const exists = await legacyDb.schema.hasTable(table);
                if (exists) {
                    const count = await legacyDb(table).count("* as count").first();
                    console.log(`  ✓ ${table.padEnd(35)} ${count?.count} records`);

                    // Show sample for photo tables
                    if (table === "photos_projets") {
                        const sample = await legacyDb(table).select("*").limit(3);
                        console.log(`    Sample fields: ${Object.keys(sample[0] || {}).join(", ")}`);
                    }
                    if (table === "photos_appartements") {
                        const sample = await legacyDb(table).select("*").limit(3);
                        console.log(`    Sample fields: ${Object.keys(sample[0] || {}).join(", ")}`);
                    }
                } else {
                    console.log(`  ✗ ${table.padEnd(35)} TABLE NOT FOUND`);
                }
            } catch (error: any) {
                console.log(`  ✗ ${table.padEnd(35)} ERROR: ${error.message}`);
            }
        }

        // Check project IDs mapping
        console.log("\n📊 Project ID Mapping Analysis:\n");

        const legacyProjects = await legacyDb("projet_filtre")
            .select("projet_id", "nom_projet")
            .limit(10);

        const newProjects = await db("projects")
            .select("id", "name")
            .limit(10);

        console.log("  Legacy projects (sample):");
        legacyProjects.forEach((p: any) => {
            console.log(`    ID ${p.projet_id}: ${p.nom_projet}`);
        });

        console.log("\n  New projects (sample):");
        newProjects.forEach((p: any) => {
            console.log(`    ID ${p.id}: ${p.name}`);
        });

        // Check photo-project relationships
        console.log("\n🖼️  Photo-Project Relationship Check:\n");

        const photoProjectCheck = await legacyDb.raw(`
      SELECT 
        pp.projet_id,
        COUNT(*) as photo_count,
        p.nom_projet
      FROM photos_projets pp
      LEFT JOIN projet_filtre p ON p.projet_id = pp.projet_id
      GROUP BY pp.projet_id, p.nom_projet
      ORDER BY photo_count DESC
      LIMIT 10
    `);

        console.log("  Projects with most photos:");
        photoProjectCheck[0].forEach((row: any) => {
            const projectName = row.nom_projet || "UNKNOWN";
            console.log(`    Project ${row.projet_id}: ${row.photo_count} photos - ${projectName}`);
        });

        // Check for orphan photos
        const orphanPhotos = await legacyDb.raw(`
      SELECT COUNT(*) as count
      FROM photos_projets pp
      LEFT JOIN projet_filtre p ON p.projet_id = pp.projet_id
      WHERE p.projet_id IS NULL
    `);

        if (orphanPhotos[0][0].count > 0) {
            console.log(`\n  ⚠️  Found ${orphanPhotos[0][0].count} orphan photos (no matching project)`);
        }

        console.log("\n✅ Verification complete!\n");

    } catch (error: any) {
        console.error("\n❌ Verification failed:", error.message);
        console.error(error.stack);
    } finally {
        await legacyDb.destroy();
        await db.destroy();
    }
}

verifyLegacyDatabase().catch(console.error);