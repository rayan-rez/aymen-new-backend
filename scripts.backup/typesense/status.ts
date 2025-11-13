#!/usr/bin/env ts-node
/**
 * Check Typesense Status
 * Shows collection statistics and health
 * 
 * Usage: npm run typesense:status
 */

import TypesenseService from '../../src/services/typesense.service';
import typesenseClient from '../../src/config/typesense';
import db from '../../src/config/database';
import { table } from 'table';

async function main() {
    console.log('');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║             🔍 Typesense Status Report                     ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');

    try {
        // Test connection
        console.log('📡 Testing connection...');
        const health = await typesenseClient.health.retrieve();

        if (health.ok) {
            console.log('✅ Typesense is healthy\n');
        } else {
            console.log('⚠️  Typesense health check returned:', health);
        }

        // Get statistics
        console.log('📊 Collection Statistics:\n');
        const stats = await TypesenseService.getStatistics();

        if (Object.keys(stats).length === 0) {
            console.log('⚠️  No collections found');
            console.log('   Run: npm run typesense:init');
            return;
        }

        // Format as table
        const data = [
            ['Collection', 'Documents', 'Created At'],
            ...Object.values(stats).map((s: any) => [
                s.name,
                s.num_documents.toString(),
                new Date(s.created_at * 1000).toLocaleString(),
            ]),
        ];

        console.log(table(data, {
            header: {
                alignment: 'center',
                content: 'Typesense Collections',
            },
        }));

        // Compare with database
        console.log('\n📈 Database vs Typesense:\n');

        const dbProjects = await db('projects')
            .whereNull('deleted_at')
            .where('is_published', true)
            .count('* as count')
            .first();

        const dbApartments = await db('apartments')
            .whereNull('deleted_at')
            .where('is_published', true)
            .count('* as count')
            .first();

        const comparisonData = [
            ['Collection', 'Database', 'Typesense', 'Status'],
            [
                'projects',
                dbProjects?.count.toString() || '0',
                stats.projects?.num_documents.toString() || '0',
                dbProjects?.count === stats.projects?.num_documents ? '✅' : '⚠️',
            ],
            [
                'apartments',
                dbApartments?.count.toString() || '0',
                stats.apartments?.num_documents.toString() || '0',
                dbApartments?.count === stats.apartments?.num_documents ? '✅' : '⚠️',
            ],
        ];

        console.log(table(comparisonData));

        // Show warnings if data is out of sync
        if (dbProjects?.count !== stats.projects?.num_documents ||
            dbApartments?.count !== stats.apartments?.num_documents) {
            console.log('⚠️  Data is out of sync!');
            console.log('   Run: npm run typesense:reindex');
        }

        console.log('\n✅ Status check complete!');

    } catch (error: any) {
        console.error('\n❌ Status check failed:', error.message);
        process.exit(1);
    } finally {
        await db.destroy();
        process.exit(0);
    }
}

main();