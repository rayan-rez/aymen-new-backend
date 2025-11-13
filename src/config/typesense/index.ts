/**
 * Typesense Configuration
 * Configures Typesense search engine client
 * 
 * @module config/typesense
 */

import Typesense from 'typesense';
import { loadEnv } from '@/config/load-env';

// Load environment variables
loadEnv();

/**
 * Typesense client configuration
 */
const typesenseConfig = {
    nodes: [
        {
            host: process.env.TYPESENSE_HOST || 'localhost',
            port: Number(process.env.TYPESENSE_PORT) || 8108,
            protocol: process.env.TYPESENSE_PROTOCOL || 'http',
        },
    ],
    apiKey: process.env.TYPESENSE_API_KEY || '',
    connectionTimeoutSeconds: 2,
};

/**
 * Typesense client instance
 */
const typesenseClient = new Typesense.Client(typesenseConfig);

/**
 * Test Typesense connection
 */
export const testTypesenseConnection = async (): Promise<boolean> => {
    try {
        const health = await typesenseClient.health.retrieve();
        console.log('✅ Typesense connection successful:', health);
        return true;
    } catch (error) {
        console.error('❌ Typesense connection failed:', error);
        return false;
    }
};

/**
 * Initialize Typesense collections
 */
export const initializeCollections = async (): Promise<void> => {
    try {
        // Get existing collections
        const collections = await typesenseClient.collections().retrieve();
        const existingCollections = collections.map((c: any) => c.name);

        console.log('📚 Existing collections:', existingCollections);

        // Define collections to create
        const collectionsToCreate = [
            'projects',
            'apartments',
            'locations',
            'blog_posts',
        ];

        for (const collectionName of collectionsToCreate) {
            if (!existingCollections.includes(collectionName)) {
                console.log(`Creating collection: ${collectionName}`);
                // Collection schemas will be defined in schema files
            }
        }
    } catch (error) {
        console.error('Error initializing collections:', error);
    }
};

export default typesenseClient;