/**
 * Typesense Service - Enhanced Version
 * Handles all search indexing and querying operations
 * 
 * @module services/typesense.service
 */

import typesenseClient from '@/config/typesense';
import { _schemas } from '@/config/typesense/schemas';
import db from '@/config/database';

class TypesenseService {
  /**
   * Test Typesense connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const health = await typesenseClient.health.retrieve();
      console.log('✅ Typesense connection successful:', health);
      return health.ok;
    } catch (error) {
      console.error('❌ Typesense connection failed:', error);
      return false;
    }
  }

  /**
   * Initialize all collections
   * Creates collections if they don't exist
   */
  async initializeCollections(): Promise<void> {
    try {
      console.log('🔧 Initializing Typesense collections...');

      const existingCollections = await typesenseClient
        .collections()
        .retrieve();
      const existingNames = existingCollections.map((c: any) => c.name);

      for (const [collectionName, schema] of Object.entries(_schemas)) {
        if (existingNames.includes(collectionName)) {
          console.log(`  ✓ Collection '${collectionName}' already exists`);
        } else {
          await typesenseClient.collections().create(schema);
          console.log(`  ✓ Created collection '${collectionName}'`);
        }
      }

      console.log('✅ All collections initialized');
    } catch (error: any) {
      console.error('❌ Failed to initialize collections:', error.message);
      throw error;
    }
  }

  /**
   * Recreate a specific collection
   * WARNING: This deletes all documents in the collection
   */
  async recreateCollection(collectionName: string): Promise<void> {
    try {
      console.log(`♻️  Recreating collection: ${collectionName}`);

      // Delete if exists
      try {
        await typesenseClient.collections(collectionName).delete();
        console.log(`  ✓ Deleted old collection '${collectionName}'`);
      } catch (error: any) {
        if (error.httpStatus !== 404) {
          throw error;
        }
      }

      // Create new
      const schema = _schemas[collectionName];
      if (!schema) {
        throw new Error(`Schema not found for collection: ${collectionName}`);
      }

      await typesenseClient.collections().create(schema);
      console.log(`  ✓ Created new collection '${collectionName}'`);
    } catch (error: any) {
      console.error(`❌ Failed to recreate collection:`, error.message);
      throw error;
    }
  }

  /**
   * Index all projects
   */
  async indexProjects(): Promise<number> {
    try {
      console.log('📚 Indexing projects...');

      const projects = await db('projects')
        .select(
          'id',
          'name',
          'slug',
          'description',
          'address',
          'project_type',
          'status',
          'location_id',
          'price_min',
          'price_max',
          'total_units',
          'completion_percentage',
          'is_featured',
          'is_published',
          'main_photo_url',
          'created_at',
          'updated_at'
        )
        .whereNull('deleted_at')
        .where('is_published', true);

      if (projects.length === 0) {
        console.log('  ⚠️  No published projects to index');
        return 0;
      }

      // Get location names
      const locationIds = projects
        .map((p) => p.location_id)
        .filter((id) => id != null);

      const locations = await db('locations')
        .select('id', 'name')
        .whereIn('id', locationIds);

      const locationMap = new Map(locations.map((l) => [l.id, l.name]));

      // Transform for Typesense
      const documents = projects.map((project) => ({
        id: project.id,
        name: project.name,
        slug: project.slug,
        description: project.description || '',
        address: project.address,
        project_type: project.project_type,
        status: project.status,
        location_id: project.location_id,
        location_name: project.location_id
          ? locationMap.get(project.location_id)
          : null,
        price_min: project.price_min,
        price_max: project.price_max,
        total_units: project.total_units,
        completion_percentage: project.completion_percentage,
        is_featured: project.is_featured,
        is_published: project.is_published,
        main_photo_url: project.main_photo_url,
        created_at: new Date(project.created_at).getTime() / 1000,
        updated_at: new Date(project.updated_at).getTime() / 1000,
      }));

      // Import in batches
      const BATCH_SIZE = 100;
      let indexed = 0;

      for (let i = 0; i < documents.length; i += BATCH_SIZE) {
        const batch = documents.slice(i, i + BATCH_SIZE);
        const result = await typesenseClient
          .collections('projects')
          .documents()
          .import(batch, { action: 'upsert' });

        indexed += batch.length;
        console.log(`  ✓ Indexed ${indexed}/${documents.length} projects`);
      }

      console.log(`✅ Indexed ${indexed} projects`);
      return indexed;
    } catch (error: any) {
      console.error('❌ Failed to index projects:', error.message);
      throw error;
    }
  }

  /**
   * Index all apartments
   */
  async indexApartments(): Promise<number> {
    try {
      console.log('🏠 Indexing apartments...');

      const apartments = await db('apartments')
        .select(
          'apartments.id',
          'apartments.project_id',
          'apartments.name',
          'apartments.unit_number',
          'apartments.title',
          'apartments.description',
          'apartments.floor_number',
          'apartments.area_sqm',
          'apartments.bedrooms',
          'apartments.bathrooms',
          'apartments.price',
          'apartments.status',
          'apartments.is_model_unit',
          'apartments.is_published',
          'apartments.created_at',
          'projects.name as project_name'
        )
        .join('projects', 'apartments.project_id', 'projects.id')
        .whereNull('apartments.deleted_at')
        .where('apartments.is_published', true);

      if (apartments.length === 0) {
        console.log('  ⚠️  No published apartments to index');
        return 0;
      }

      // Transform for Typesense
      const documents = apartments.map((apt) => ({
        id: apt.id,
        project_id: apt.project_id,
        project_name: apt.project_name,
        name: apt.name,
        unit_number: apt.unit_number,
        title: apt.title || '',
        description: apt.description || '',
        floor_number: apt.floor_number,
        area_sqm: apt.area_sqm,
        bedrooms: apt.bedrooms,
        bathrooms: apt.bathrooms,
        price: apt.price,
        status: apt.status,
        is_model_unit: apt.is_model_unit,
        is_published: apt.is_published,
        created_at: new Date(apt.created_at).getTime() / 1000,
      }));

      // Import in batches
      const BATCH_SIZE = 100;
      let indexed = 0;

      for (let i = 0; i < documents.length; i += BATCH_SIZE) {
        const batch = documents.slice(i, i + BATCH_SIZE);
        const result = await typesenseClient
          .collections('apartments')
          .documents()
          .import(batch, { action: 'upsert' });

        indexed += batch.length;
        console.log(`  ✓ Indexed ${indexed}/${documents.length} apartments`);
      }

      console.log(`✅ Indexed ${indexed} apartments`);
      return indexed;
    } catch (error: any) {
      console.error('❌ Failed to index apartments:', error.message);
      throw error;
    }
  }

  /**
   * Search projects
   */
  async searchProjects(
    query: string,
    filters?: Record<string, any>
  ): Promise<any> {
    try {
      const searchParameters: any = {
        q: query,
        query_by: 'name,description,address',
        sort_by: '_text_match:desc,created_at:desc',
        per_page: 20,
      };

      // Build filter string
      const filterParts: string[] = ['is_published:true'];

      if (filters?.project_type) {
        filterParts.push(`project_type:=${filters.project_type}`);
      }
      if (filters?.status) {
        filterParts.push(`status:=${filters.status}`);
      }
      if (filters?.location_id) {
        filterParts.push(`location_id:=${filters.location_id}`);
      }
      if (filters?.is_featured !== undefined) {
        filterParts.push(`is_featured:=${filters.is_featured}`);
      }
      if (filters?.min_price !== undefined) {
        filterParts.push(`price_min:>=${filters.min_price}`);
      }
      if (filters?.max_price !== undefined) {
        filterParts.push(`price_max:<=${filters.max_price}`);
      }

      if (filterParts.length > 0) {
        searchParameters.filter_by = filterParts.join(' && ');
      }

      return await typesenseClient
        .collections('projects')
        .documents()
        .search(searchParameters);
    } catch (error: any) {
      console.error('Search error:', error.message);
      throw error;
    }
  }

  /**
   * Search apartments
   */
  async searchApartments(
    query: string,
    filters?: Record<string, any>
  ): Promise<any> {
    try {
      const searchParameters: any = {
        q: query,
        query_by: 'name,unit_number,title,description,project_name',
        sort_by: '_text_match:desc,created_at:desc',
        per_page: 20,
      };

      // Build filter string
      const filterParts: string[] = ['is_published:true'];

      if (filters?.project_id) {
        filterParts.push(`project_id:=${filters.project_id}`);
      }
      if (filters?.status) {
        filterParts.push(`status:=${filters.status}`);
      }
      if (filters?.bedrooms !== undefined) {
        filterParts.push(`bedrooms:=${filters.bedrooms}`);
      }
      if (filters?.floor_number !== undefined) {
        filterParts.push(`floor_number:=${filters.floor_number}`);
      }
      if (filters?.min_price !== undefined) {
        filterParts.push(`price:>=${filters.min_price}`);
      }
      if (filters?.max_price !== undefined) {
        filterParts.push(`price:<=${filters.max_price}`);
      }

      if (filterParts.length > 0) {
        searchParameters.filter_by = filterParts.join(' && ');
      }

      return await typesenseClient
        .collections('apartments')
        .documents()
        .search(searchParameters);
    } catch (error: any) {
      console.error('Search error:', error.message);
      throw error;
    }
  }

  /**
   * Get autocomplete suggestions
   */
  async getSuggestions(query: string, type: string): Promise<string[]> {
    try {
      const collection = type === 'apartments' ? 'apartments' : 'projects';
      const queryBy = type === 'apartments' ? 'name,unit_number' : 'name';

      const result = await typesenseClient
        .collections(collection)
        .documents()
        .search({
          q: query,
          query_by: queryBy,
          per_page: 5,
          prefix: true,
        });

      return result.hits?.map((hit: any) => hit.document.name) || [];
    } catch (error: any) {
      console.error('Suggestions error:', error.message);
      return [];
    }
  }

  /**
   * Get collection statistics
   */
  async getStatistics(): Promise<Record<string, any>> {
    try {
      const collections = await typesenseClient.collections().retrieve();

      const stats: Record<string, any> = {};

      for (const collection of collections) {
        const col = await typesenseClient
          .collections(collection.name)
          .retrieve();
        stats[collection.name] = {
          name: col.name,
          num_documents: col.num_documents,
          created_at: col.created_at,
        };
      }

      return stats;
    } catch (error: any) {
      console.error('Statistics error:', error.message);
      throw error;
    }
  }

  /**
   * Index a single document
   */
  async indexDocument(
    collection: string,
    document: Record<string, any>
  ): Promise<void> {
    try {
      await typesenseClient
        .collections(collection)
        .documents()
        .upsert(document);
    } catch (error: any) {
      console.error(`Failed to index document in ${collection}:`, error.message);
      throw error;
    }
  }

  /**
   * Delete a document from index
   */
  async deleteDocument(collection: string, documentId: number): Promise<void> {
    try {
      await typesenseClient
        .collections(collection)
        .documents(String(documentId))
        .delete();
    } catch (error: any) {
      if (error.httpStatus !== 404) {
        console.error(`Failed to delete document from ${collection}:`, error.message);
        throw error;
      }
    }
  }
}

export default new TypesenseService();