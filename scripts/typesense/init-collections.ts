#!/usr/bin/env ts-node
/**
 * Initialize Typesense Collections
 * Creates all required collections if they don't exist
 * 
 * Usage: npm run typesense:init
 */

import TypesenseService from '../../src/services/typesense.service';
import db from '../../src/config/database';

async function main() {
    console.log('🔧 Initializing Typesense Collections\n');

    try {
        // Test connection first
        const isConnected = await TypesenseService.testConnection();

        if (!isConnected) {
            console.error('❌ Cannot connect to Typesense');
            console.error('   Make sure Typesense is running:');
            console.error('   - Local: systemctl status typesense');
            console.error('   - Or check TYPESENSE_HOST and TYPESENSE_PORT in .env');
            process.exit(1);
        }

        // Initialize collections
        await TypesenseService.initializeCollections();

        console.log('\n✅ Collections initialized successfully!');
        console.log('\n📝 Next steps:');
        console.log('   1. Index data: npm run typesense:reindex');
        console.log('   2. Check status: npm run typesense:status');

    } catch (error: any) {
        console.error('\n❌ Failed to initialize collections:', error.message);
        process.exit(1);
    } finally {
        await db.destroy();
        process.exit(0);
    }
}

main();