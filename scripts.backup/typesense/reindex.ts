#!/usr/bin/env ts-node
/**
 * Reindex Typesense Collections
 * Indexes all data from database into Typesense
 * 
 * Usage: 
 *   npm run typesense:reindex              # Reindex all
 *   npm run typesense:reindex:projects     # Projects only
 *   npm run typesense:reindex:apartments   # Apartments only
 */

import TypesenseService from '../../src/services/typesense.service';
import db from '../../src/config/database';

const collection = process.argv[2];

async function main() {
    console.log('🔄 Reindexing Typesense Data\n');

    try {
        // Test connection
        const isConnected = await TypesenseService.testConnection();
        if (!isConnected) {
            throw new Error('Cannot connect to Typesense');
        }

        const results: Record<string, number> = {};

        // Reindex based on argument
        if (!collection || collection === 'projects') {
            console.log('📚 Indexing projects...');
            results.projects = await TypesenseService.indexProjects();
        }

        if (!collection || collection === 'apartments') {
            console.log('🏠 Indexing apartments...');
            results.apartments = await TypesenseService.indexApartments();
        }

        // Show summary
        console.log('\n╔════════════════════════════════════════╗');
        console.log('║     ✅ Reindexing Complete!            ║');
        console.log('╚════════════════════════════════════════╝\n');

        Object.entries(results).forEach(([key, count]) => {
            console.log(`  ${key}: ${count} documents indexed`);
        });

        console.log('\n📊 Check status: npm run typesense:status');

    } catch (error: any) {
        console.error('\n❌ Reindexing failed:', error.message);
        process.exit(1);
    } finally {
        await db.destroy();
        process.exit(0);
    }
}

main();