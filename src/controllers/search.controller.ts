/**
 * Search Controller
 * Handles all search-related requests using Typesense
 * 
 * @module controllers/search.controller
 */

import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '@/utils/response.util';
import TypesenseService from '@/services/typesense.service';
import { AppError } from '@/middlewares/error-handler.middleware';

export class SearchController {
    /**
     * Global search across all entities
     * GET /api/search?q=query
     */
    async globalSearch(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { q, type } = req.query;

            if (!q || typeof q !== 'string') {
                throw new AppError('Search query is required', 400);
            }

            if (q.length < 2) {
                throw new AppError('Search query must be at least 2 characters', 400);
            }

            let results: any = {};

            // Search specific type or all types
            if (type === 'projects' || !type) {
                try {
                    const projectResults = await TypesenseService.searchProjects(q);
                    results.projects = {
                        total: projectResults.found,
                        hits: projectResults.hits?.map((hit: any) => hit.document) || [],
                    };
                } catch (error) {
                    console.error('Error searching projects:', error);
                    results.projects = { total: 0, hits: [] };
                }
            }

            if (type === 'apartments' || !type) {
                try {
                    const apartmentResults = await TypesenseService.searchApartments(q);
                    results.apartments = {
                        total: apartmentResults.found,
                        hits: apartmentResults.hits?.map((hit: any) => hit.document) || [],
                    };
                } catch (error) {
                    console.error('Error searching apartments:', error);
                    results.apartments = { total: 0, hits: [] };
                }
            }

            ApiResponse.success(res, results, 'Search completed successfully');
        } catch (error) {
            next(error);
        }
    }

    /**
     * Search projects only
     * GET /api/search/projects?q=query
     */
    async searchProjects(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { q, project_type, status, location_id, min_price, max_price, is_featured } = req.query;

            if (!q || typeof q !== 'string') {
                throw new AppError('Search query is required', 400);
            }

            const filters: any = {};
            if (project_type) filters.project_type = project_type;
            if (status) filters.status = status;
            if (location_id) filters.location_id = Number(location_id);
            if (min_price) filters.min_price = Number(min_price);
            if (max_price) filters.max_price = Number(max_price);
            if (is_featured !== undefined) filters.is_featured = is_featured === 'true';

            const results = await TypesenseService.searchProjects(q, filters);

            ApiResponse.success(res, {
                total: results.found,
                hits: results.hits?.map((hit: any) => hit.document) || [],
                facets: results.facet_counts || [],
            }, 'Projects search completed');
        } catch (error) {
            next(error);
        }
    }

    /**
     * Search apartments only
     * GET /api/search/apartments?q=query
     */
    async searchApartments(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { q, project_id, status, bedrooms, min_price, max_price, floor_number } = req.query;

            if (!q || typeof q !== 'string') {
                throw new AppError('Search query is required', 400);
            }

            const filters: any = {};
            if (project_id) filters.project_id = Number(project_id);
            if (status) filters.status = status;
            if (bedrooms) filters.bedrooms = Number(bedrooms);
            if (min_price) filters.min_price = Number(min_price);
            if (max_price) filters.max_price = Number(max_price);
            if (floor_number) filters.floor_number = Number(floor_number);

            const results = await TypesenseService.searchApartments(q, filters);

            ApiResponse.success(res, {
                total: results.found,
                hits: results.hits?.map((hit: any) => hit.document) || [],
                facets: results.facet_counts || [],
            }, 'Apartments search completed');
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get autocomplete suggestions
     * GET /api/search/suggestions?q=query&type=projects
     */
    async getSuggestions(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { q, type = 'projects' } = req.query;

            if (!q || typeof q !== 'string') {
                throw new AppError('Query is required', 400);
            }

            if (q.length < 2) {
                ApiResponse.success(res, [], 'Query too short');
                return;
            }

            const suggestions = await TypesenseService.getSuggestions(q, type as string);

            ApiResponse.success(res, suggestions, 'Suggestions retrieved');
        } catch (error) {
            next(error);
        }
    }

    /**
     * Reindex all collections (Admin only)
     * POST /api/search/reindex
     */
    async reindexAll(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const results: any = {};

            // Index projects
            results.projects = await TypesenseService.indexProjects();

            // Index apartments
            results.apartments = await TypesenseService.indexApartments();

            ApiResponse.success(res, results, 'Reindexing completed');
        } catch (error) {
            next(error);
        }
    }

    /**
     * Reindex specific collection (Admin only)
     * POST /api/search/reindex/:collection
     */
    async reindexCollection(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { collection } = req.params;

            let count = 0;

            switch (collection) {
                case 'projects':
                    count = await TypesenseService.indexProjects();
                    break;
                case 'apartments':
                    count = await TypesenseService.indexApartments();
                    break;
                default:
                    throw new AppError(`Unknown collection: ${collection}`, 400);
            }

            ApiResponse.success(res, { indexed: count }, `${collection} reindexed successfully`);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Initialize collections (Admin only)
     * POST /api/search/init
     */
    async initCollections(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            await TypesenseService.initializeCollections();

            ApiResponse.success(res, null, 'Collections initialized');
        } catch (error) {
            next(error);
        }
    }
}

export default new SearchController();