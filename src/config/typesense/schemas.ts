/**
 * Typesense Collection Schemas
 * Defines the structure for searchable collections
 * 
 * @module config/typesense/schemas
 */

import { CollectionCreateSchema } from 'typesense/lib/Typesense/Collections';

/**
 * Projects Collection Schema
 */
export const projectsSchema: CollectionCreateSchema = {
  name: 'projects',
  fields: [
    { name: 'id', type: 'int32', facet: false },
    { name: 'name', type: 'string', facet: false },
    { name: 'slug', type: 'string', facet: false },
    { name: 'description', type: 'string', facet: false },
    { name: 'address', type: 'string', facet: false },
    { name: 'project_type', type: 'string', facet: true },
    { name: 'status', type: 'string', facet: true },
    { name: 'location_id', type: 'int32', facet: true, optional: true },
    { name: 'location_name', type: 'string', facet: true, optional: true },
    { name: 'price_min', type: 'float', facet: true, optional: true },
    { name: 'price_max', type: 'float', facet: true, optional: true },
    { name: 'total_units', type: 'int32', facet: false, optional: true },
    { name: 'completion_percentage', type: 'int32', facet: false, optional: true },
    { name: 'is_featured', type: 'bool', facet: true },
    { name: 'is_published', type: 'bool', facet: true },
    { name: 'main_photo_url', type: 'string', facet: false, optional: true },
    { name: 'created_at', type: 'int64', facet: false },
    { name: 'updated_at', type: 'int64', facet: false },
  ],
  default_sorting_field: 'created_at',
};

/**
 * Apartments Collection Schema
 */
export const apartmentsSchema: CollectionCreateSchema = {
  name: 'apartments',
  fields: [
    { name: 'id', type: 'int32', facet: false },
    { name: 'project_id', type: 'int32', facet: true },
    { name: 'project_name', type: 'string', facet: false },
    { name: 'name', type: 'string', facet: false },
    { name: 'unit_number', type: 'string', facet: false },
    { name: 'title', type: 'string', facet: false, optional: true },
    { name: 'description', type: 'string', facet: false, optional: true },
    { name: 'floor_number', type: 'int32', facet: true, optional: true },
    { name: 'area_sqm', type: 'float', facet: true },
    { name: 'bedrooms', type: 'int32', facet: true, optional: true },
    { name: 'bathrooms', type: 'int32', facet: true, optional: true },
    { name: 'price', type: 'float', facet: true },
    { name: 'status', type: 'string', facet: true },
    { name: 'is_model_unit', type: 'bool', facet: true },
    { name: 'is_published', type: 'bool', facet: true },
    { name: 'created_at', type: 'int64', facet: false },
  ],
  default_sorting_field: 'created_at',
};

/**
 * Locations Collection Schema
 */
export const locationsSchema: CollectionCreateSchema = {
  name: 'locations',
  fields: [
    { name: 'id', type: 'int32', facet: false },
    { name: 'name', type: 'string', facet: false },
    { name: 'slug', type: 'string', facet: false },
    { name: 'type', type: 'string', facet: true },
    { name: 'parent_id', type: 'int32', facet: true, optional: true },
    { name: 'depth', type: 'int32', facet: true },
    { name: 'is_active', type: 'bool', facet: true },
    { name: 'display_order', type: 'int32', facet: false },
  ],
  default_sorting_field: 'display_order',
};

/**
 * Blog Posts Collection Schema
 */
export const blogPostsSchema: CollectionCreateSchema = {
  name: 'blog_posts',
  fields: [
    { name: 'id', type: 'int32', facet: false },
    { name: 'title', type: 'string', facet: false },
    { name: 'slug', type: 'string', facet: false },
    { name: 'excerpt', type: 'string', facet: false, optional: true },
    { name: 'content', type: 'string', facet: false },
    { name: 'author_name', type: 'string', facet: true },
    { name: 'category', type: 'string', facet: true, optional: true },
    { name: 'is_published', type: 'bool', facet: true },
    { name: 'is_featured', type: 'bool', facet: true },
    { name: 'published_at', type: 'int64', facet: false, optional: true },
    { name: 'created_at', type: 'int64', facet: false },
  ],
  default_sorting_field: 'created_at',
};

/**
 * All collection schemas
 */
export const _schemas: Record<string,CollectionCreateSchema> = {
  projects: projectsSchema,
  apartments: apartmentsSchema,
  locations: locationsSchema,
  blog_posts: blogPostsSchema,
};