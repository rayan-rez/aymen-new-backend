#!/usr/bin/env ts-node
/**
 * Typesense CLI Management Tool
 * Run with: npx ts-node scripts/typesense-cli.ts [command]
 * 
 * Commands:
 *   init         - Initialize collections
 *   reindex-all  - Reindex all collections
 *   reindex projects - Reindex projects only
 *   reindex apartments - Reindex apartments only
 *   recreate [collection] - Recreate collection (drops and recreates)
 *   status       - Show Typesense status
 */

import TypesenseService from '../src/services/typesense.service';
import typesenseClient from '../src/config/typesense';
import db from '../src/config/database';

const command = process.argv[2];
const arg = process.argv[3];

async function main() {
    console.log('\n🔧 Typesense CLI Tool\n');

    try {
        switch (command) {
            case 'init':
                console.log('📚 Initializing collections...');
                await TypesenseService.initializeCollections();
                console.log('✅ Collections initialized successfully');
                break;

            case 'reindex-all':
                console.log('🔄 Reindexing all collections...');
                const projectCount = await TypesenseService.indexProjects();
                const apartmentCount = await TypesenseService.indexApartments();
                console.log(`✅ Reindexed ${projectCount} projects and ${apartmentCount} apartments`);
                break;

            case 'reindex':
                if (!arg) {
                    console.error('❌ Please specify collection: projects or apartments');
                    process.exit(1);
                }
                console.log(`🔄 Reindexing ${arg}...`);
                if (arg === 'projects') {
                    const count = await TypesenseService.indexProjects();
                    console.log(`✅ Indexed ${count} projects`);
                } else if (arg === 'apartments') {
                    const count = await TypesenseService.indexApartments();
                    console.log(`✅ Indexed ${count} apartments`);
                } else {
                    console.error('❌ Unknown collection:', arg);
                    process.exit(1);
                }
                break;

            case 'recreate':
                if (!arg) {
                    console.error('❌ Please specify collection name');
                    process.exit(1);
                }
                console.log(`♻️  Recreating collection: ${arg}...`);
                await TypesenseService.recreateCollection(arg);
                console.log(`✅ Collection ${arg} recreated`);
                break;

            case 'status':
                console.log('📊 Checking Typesense status...\n');
                const health = await typesenseClient.health.retrieve();
                console.log('Health:', health);

                const collections = await typesenseClient.collections().retrieve();
                console.log('\n📚 Collections:');
                for (const col of collections) {
                    console.log(`  - ${col.name}: ${col.num_documents} documents`);
                }
                break;

            case 'help':
            default:
                console.log('Available commands:');
                console.log('  init                    - Initialize collections');
                console.log('  reindex-all             - Reindex all collections');
                console.log('  reindex [collection]    - Reindex specific collection');
                console.log('  recreate [collection]   - Recreate collection');
                console.log('  status                  - Show Typesense status');
                console.log('  help                    - Show this help');
                break;
        }
    } catch (error: any) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    } finally {
        await db.destroy();
        process.exit(0);
    }
}

main();