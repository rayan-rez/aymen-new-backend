/**
 * Typesense Service
 * Handles all Typesense operations for indexing and searching
 * 
 * @module services/typesense
 */

import typesenseClient from '@/config/typesense';
import { _schemas } from '@/config/typesense/schemas';
import db from '@/config/database';

export class TypesenseService {
  /**
   * Initialize all collections
   */
  static async initializeCollections(): Promise<void> {
    try {
      const collections = await typesenseClient.collections().retrieve();
      const existingCollections = collections.map((c: any) => c.name);

      for (const [name, schema] of Object.entries(_schemas)) {
        if (existingCollections.includes(name)) {
          console.log(`✓ Collection "${name}" already exists`);
          continue;
        }

        await typesenseClient.collections().create(schema);
        console.log(`✅ Created collection: ${name}`);
      }
    } catch (error: any) {
      console.error('Error initializing collections:', error.message);
      throw error;
    }
  }

  /**
   * Delete and recreate a collection (useful for schema changes)
   */
  static async recreateCollection(collectionName: string): Promise<void> {
    try {
      await typesenseClient.collections(collectionName).delete();
      console.log(`🗑️  Deleted collection: ${collectionName}`);
    } catch (error: any) {
      if (!error.message.includes('Not Found')) {
        throw error;
      }
    }

    const schema = _schemas[collectionName as keyof typeof _schemas];
    if (!schema) {
      throw new Error(`No schema found for collection: ${collectionName}`);
    }

    await typesenseClient.collections().create(schema);
    console.log(`✅ Created collection: ${collectionName}`);
  }

  /**
   * Index all projects
   */
  static async indexProjects(): Promise<number> {
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

    // Get location names
    const projectsWithLocations = await Promise.all(
      projects.map(async (project) => {
        let location_name = null;
        if (project.location_id) {
          const location = await db('locations')
            .select('name')
            .where('id', project.location_id)
            .first();
          location_name = location?.name || null;
        }

        return {
          ...project,
          location_name,
          created_at: new Date(project.created_at).getTime(),
          updated_at: new Date(project.updated_at).getTime(),
        };
      })
    );

    if (projectsWithLocations.length === 0) {
      console.log('No projects to index');
      return 0;
    }

    const result = await typesenseClient
      .collections('projects')
      .documents()
      .import(projectsWithLocations, { action: 'upsert' });

    console.log(`✅ Indexed ${projectsWithLocations.length} projects`);
    return projectsWithLocations.length;
  }

  /**
   * Index single project
   */
  static async indexProject(projectId: number): Promise<void> {
    const project = await db('projects')
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
      .where('id', projectId)
      .whereNull('deleted_at')
      .first();

    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    let location_name = null;
    if (project.location_id) {
      const location = await db('locations')
        .select('name')
        .where('id', project.location_id)
        .first();
      location_name = location?.name || null;
    }

    const document = {
      ...project,
      location_name,
      created_at: new Date(project.created_at).getTime(),
      updated_at: new Date(project.updated_at).getTime(),
    };

    await typesenseClient
      .collections('projects')
      .documents()
      .upsert(document);

    console.log(`✅ Indexed project: ${project.name}`);
  }

  /**
   * Remove project from index
   */
  static async removeProject(projectId: number): Promise<void> {
    try {
      await typesenseClient
        .collections('projects')
        .documents(projectId.toString())
        .delete();
      console.log(`🗑️  Removed project ${projectId} from index`);
    } catch (error: any) {
      if (!error.message.includes('Not Found')) {
        throw error;
      }
    }
  }

  /**
   * Index all apartments
   */
  static async indexApartments(): Promise<number> {
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
      .leftJoin('projects', 'apartments.project_id', 'projects.id')
      .whereNull('apartments.deleted_at')
      .where('apartments.is_published', true);

    const documentsToIndex = apartments.map((apt) => ({
      id: apt.id,
      project_id: apt.project_id,
      project_name: apt.project_name || '',
      name: apt.name,
      unit_number: apt.unit_number || '',
      title: apt.title || '',
      description: apt.description || '',
      floor_number: apt.floor_number || 0,
      area_sqm: apt.area_sqm,
      bedrooms: apt.bedrooms || 0,
      bathrooms: apt.bathrooms || 0,
      price: apt.price,
      status: apt.status,
      is_model_unit: apt.is_model_unit,
      is_published: apt.is_published,
      created_at: new Date(apt.created_at).getTime(),
    }));

    if (documentsToIndex.length === 0) {
      console.log('No apartments to index');
      return 0;
    }

    await typesenseClient
      .collections('apartments')
      .documents()
      .import(documentsToIndex, { action: 'upsert' });

    console.log(`✅ Indexed ${documentsToIndex.length} apartments`);
    return documentsToIndex.length;
  }

  /**
   * Search projects
   */
  static async searchProjects(query: string, filters?: any) {
    const searchParams: any = {
      q: query,
      query_by: 'name,description,address,location_name',
      sort_by: '_text_match:desc,created_at:desc',
      per_page: 20,
    };

    if (filters) {
      const filterQueries: string[] = [];

      if (filters.project_type) {
        filterQueries.push(`project_type:=${filters.project_type}`);
      }
      if (filters.status) {
        filterQueries.push(`status:=${filters.status}`);
      }
      if (filters.is_featured !== undefined) {
        filterQueries.push(`is_featured:=${filters.is_featured}`);
      }
      if (filters.location_id) {
        filterQueries.push(`location_id:=${filters.location_id}`);
      }
      if (filters.min_price) {
        filterQueries.push(`price_min:>=${filters.min_price}`);
      }
      if (filters.max_price) {
        filterQueries.push(`price_max:<=${filters.max_price}`);
      }

      // Always filter published
      filterQueries.push('is_published:=true');

      if (filterQueries.length > 0) {
        searchParams.filter_by = filterQueries.join(' && ');
      }
    }

    const result = await typesenseClient
      .collections('projects')
      .documents()
      .search(searchParams);

    return result;
  }

  /**
   * Search apartments
   */
  static async searchApartments(query: string, filters?: any) {
    const searchParams: any = {
      q: query,
      query_by: 'name,title,description,unit_number,project_name',
      sort_by: '_text_match:desc,created_at:desc',
      per_page: 20,
    };

    if (filters) {
      const filterQueries: string[] = [];

      if (filters.project_id) {
        filterQueries.push(`project_id:=${filters.project_id}`);
      }
      if (filters.status) {
        filterQueries.push(`status:=${filters.status}`);
      }
      if (filters.bedrooms) {
        filterQueries.push(`bedrooms:=${filters.bedrooms}`);
      }
      if (filters.min_price) {
        filterQueries.push(`price:>=${filters.min_price}`);
      }
      if (filters.max_price) {
        filterQueries.push(`price:<=${filters.max_price}`);
      }
      if (filters.floor_number) {
        filterQueries.push(`floor_number:=${filters.floor_number}`);
      }

      // Always filter published
      filterQueries.push('is_published:=true');

      if (filterQueries.length > 0) {
        searchParams.filter_by = filterQueries.join(' && ');
      }
    }

    const result = await typesenseClient
      .collections('apartments')
      .documents()
      .search(searchParams);

    return result;
  }

  /**
   * Get search suggestions (autocomplete)
   */
  static async getSuggestions(query: string, collection: string) {
    const searchParams: any = {
      q: query,
      query_by: collection === 'projects' 
        ? 'name,address' 
        : 'name,title,unit_number',
      per_page: 5,
      prefix: true,
    };

    const result = await typesenseClient
      .collections(collection)
      .documents()
      .search(searchParams);

    return result.hits?.map((hit: any) => ({
      id: hit.document.id,
      name: hit.document.name || hit.document.title,
      type: collection,
    })) || [];
  }
}

export default TypesenseService;