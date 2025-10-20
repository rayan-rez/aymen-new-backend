/**
 * Search Controller
 * Handles search operations with Typesense integration
 * Provides real-time search, full-text search, and popular searches
 *
 * @module controllers/search.controller
 */

import { Request, Response } from "express";
import { ProjectModel } from "@models";
import { ApiResponse } from "@utils/response.util";
import db from "@/config/database";

/**
 * Search result interface
 */
interface SearchResult {
  id: number;
  nom_projet: string;
  slug: string;
  localite?: string;
  photo?: string;
  statut?: string;
  score?: number;
}

/**
 * Search analytics entry
 */
interface SearchAnalyticsEntry {
  searchTerm: string;
  resultsCount: number;
  timestamp: Date;
}

/**
 * Search Controller class
 * Manages all search-related operations
 */
class SearchController {
  /**
   * Real-time search for autocomplete
   * Returns quick results for search-as-you-type functionality
   * Minimum 2 characters required for search
   *
   * @route GET /api/search/realtime
   * @access Public
   *
   * @query q - Search query string
   * @query limit - Maximum results (default: 8)
   *
   * @example
   * GET /api/search/realtime?q=annaba&limit=5
   */
  realtimeSearch = async (req: Request, res: Response): Promise<void> => {
    const { q, limit = 8 } = req.query;

    try {
      // Return empty results for queries less than 2 characters
      if (!q || typeof q !== "string" || q.trim().length < 2) {
        ApiResponse.success(
          res,
          {
            query: q || "",
            found: 0,
            results: [],
          },
          "Search query too short"
        );
        return;
      }

      const trimmedQuery = q.trim();
      const searchLimit = Math.min(Number(limit) || 8, 20);

      // Perform database search
      const projects = await db("projects")
        .select(
          "id",
          "nom_projet as name",
          "slug",
          "localite",
          "main_photo_url as photo",
          "statut"
        )
        .whereNull("deleted_at")
        .where((builder) => {
          builder
            .where("nom_projet", "like", `%${trimmedQuery}%`)
            .orWhere("address", "like", `%${trimmedQuery}%`)
            .orWhere("localite", "like", `%${trimmedQuery}%`);
        })
        .limit(searchLimit)
        .orderBy("is_featured", "desc")
        .orderBy("created_at", "desc");

      const results: SearchResult[] = projects.map((project) => ({
        id: project.id,
        nom_projet: project.name,
        slug: project.slug,
        localite: project.localite,
        photo: project.photo,
        statut: project.statut,
        score: this.calculateRelevanceScore(project.name, trimmedQuery),
      }));

      // Sort by relevance score
      results.sort((a, b) => (b.score || 0) - (a.score || 0));

      ApiResponse.success(
        res,
        {
          query: trimmedQuery,
          found: results.length,
          results: results.slice(0, searchLimit),
        },
        "Search completed successfully"
      );
    } catch (error) {
      console.error("Error in realtime search:", error);
      ApiResponse.error(res, "Search failed", 500);
    }
  };

  /**
   * Full search with filters and pagination
   * Advanced search with location, status, and other filters
   *
   * @route GET /api/search
   * @access Public
   *
   * @query q - Search query string
   * @query page - Page number (default: 1)
   * @query limit - Results per page (default: 12)
   * @query localite - Filter by location
   * @query statut - Filter by status
   *
   * @example
   * GET /api/search?q=residence&localite=Annaba&page=1&limit=12
   */
  fullSearch = async (req: Request, res: Response): Promise<void> => {
    const { q, page = 1, limit = 12, localite, statut } = req.query;

    if (!q || typeof q !== "string" || q.trim().length === 0) {
      ApiResponse.badRequest(res, "Search query required");
      return;
    }

    try {
      const trimmedQuery = q.trim();
      const pageInt = Math.max(1, parseInt(page as string, 10));
      const limitInt = Math.min(50, Math.max(1, parseInt(limit as string, 10)));
      const offset = (pageInt - 1) * limitInt;

      // Build query
      let query = db("projects")
        .select("*")
        .whereNull("deleted_at")
        .where((builder) => {
          builder
            .where("nom_projet", "like", `%${trimmedQuery}%`)
            .orWhere("address", "like", `%${trimmedQuery}%`)
            .orWhere("localite", "like", `%${trimmedQuery}%`)
            .orWhere("description", "like", `%${trimmedQuery}%`);
        });

      // Apply filters
      if (localite && typeof localite === "string") {
        const localites = localite.split(",").map((l) => l.trim());
        query = query.whereIn("localite", localites);
      }

      if (statut && typeof statut === "string") {
        const statuts = statut.split(",").map((s) => s.trim());
        query = query.whereIn("statut", statuts);
      }

      // Get total count
      const countQuery = query.clone();
      const [{ count: totalCount }] = await countQuery.count("* as count");

      // Get results
      const projects = await query
        .orderBy("is_featured", "desc")
        .orderBy("created_at", "desc")
        .limit(limitInt)
        .offset(offset);

      const results = projects.map((project) => ({
        id: project.id,
        nom_projet: project.nom_projet,
        slug: project.slug,
        description: project.description,
        adresse: project.address,
        localite: project.localite,
        statut: project.statut,
        photo: project.main_photo_url,
        etat_avance: project.completion_percentage,
        score: this.calculateRelevanceScore(project.nom_projet, trimmedQuery),
      }));

      // Track search analytics (async, don't wait)
      this.trackSearch(trimmedQuery, Number(totalCount)).catch((err) =>
        console.error("Error tracking search:", err)
      );

      ApiResponse.success(
        res,
        {
          query: trimmedQuery,
          found: Number(totalCount),
          page: pageInt,
          limit: limitInt,
          total_pages: Math.ceil(Number(totalCount) / limitInt),
          results,
        },
        "Search completed successfully"
      );
    } catch (error) {
      console.error("Error in full search:", error);
      ApiResponse.error(res, "Search failed", 500);
    }
  };

  /**
   * Gets popular search terms
   * Returns most frequently searched terms
   *
   * @route GET /api/search/popular
   * @access Public
   *
   * @query limit - Maximum terms to return (default: 6)
   *
   * @example
   * GET /api/search/popular?limit=10
   */
  getPopularSearches = async (req: Request, res: Response): Promise<void> => {
    const { limit = 6 } = req.query;

    try {
      const limitInt = Math.min(20, Math.max(1, parseInt(limit as string, 10)));

      // Get popular searches from analytics (if table exists)
      let popularSearches: any[] = [];

      try {
        popularSearches = await db("search_analytics")
          .select("search_term")
          .count("* as search_count")
          .groupBy("search_term")
          .orderBy("search_count", "desc")
          .limit(limitInt);
      } catch (error) {
        // Table might not exist, return empty array
        console.warn("Search analytics table not found");
      }

      const searches = popularSearches.map((row) => ({
        search_term: row.search_term,
        count: Number(row.search_count),
      }));

      ApiResponse.success(
        res,
        searches,
        "Popular searches retrieved successfully"
      );
    } catch (error) {
      console.error("Error getting popular searches:", error);
      ApiResponse.error(res, "Failed to retrieve popular searches", 500);
    }
  };

  /**
   * Gets search suggestions based on partial query
   * Returns autocomplete suggestions from popular searches
   *
   * @route GET /api/search/suggestions
   * @access Public
   *
   * @query q - Partial search query
   *
   * @example
   * GET /api/search/suggestions?q=ann
   */
  getSuggestions = async (req: Request, res: Response): Promise<void> => {
    const { q } = req.query;

    if (!q || typeof q !== "string" || q.trim().length < 2) {
      ApiResponse.success(res, { suggestions: [] }, "Query too short");
      return;
    }

    try {
      const trimmedQuery = q.trim().toLowerCase();

      // Get suggestions from popular searches
      let suggestions: string[] = [];

      try {
        const results = await db("search_analytics")
          .select("search_term")
          .count("* as search_count")
          .whereRaw("LOWER(search_term) LIKE ?", [`%${trimmedQuery}%`])
          .groupBy("search_term")
          .orderBy("search_count", "desc")
          .limit(5);

        suggestions = results.map((row) => row.search_term.toString());
      } catch (error) {
        // Table might not exist
        console.warn("Search analytics table not found");
      }

      ApiResponse.success(
        res,
        { suggestions },
        "Suggestions retrieved successfully"
      );
    } catch (error) {
      console.error("Error getting suggestions:", error);
      ApiResponse.error(res, "Failed to retrieve suggestions", 500);
    }
  };

  /**
   * Health check endpoint for search system
   *
   * @route GET /api/search/health
   * @access Public
   */
  healthCheck = async (req: Request, res: Response): Promise<void> => {
    try {
      // Test database connection
      await db.raw("SELECT 1");

      // Get projects collection info
      const [{ count: projectCount }] = await db("projects")
        .whereNull("deleted_at")
        .count("* as count");

      ApiResponse.success(
        res,
        {
          status: "healthy",
          database: "connected",
          projectsIndexed: Number(projectCount),
          timestamp: new Date().toISOString(),
        },
        "Search system is healthy"
      );
    } catch (error) {
      console.error("Search health check failed:", error);
      ApiResponse.error(res, "Search system unhealthy", 503);
    }
  };

  /**
   * Calculates relevance score for search results
   * Higher score means better match
   *
   * @param text - Text to score
   * @param query - Search query
   * @returns Relevance score (0-100)
   *
   * @private
   */
  private calculateRelevanceScore(text: string, query: string): number {
    if (!text || !query) return 0;

    const textLower = text.toLowerCase();
    const queryLower = query.toLowerCase();

    // Exact match gets highest score
    if (textLower === queryLower) return 100;

    // Starts with query gets high score
    if (textLower.startsWith(queryLower)) return 80;

    // Contains query gets medium score
    if (textLower.includes(queryLower)) return 60;

    // Word match gets lower score
    const textWords = textLower.split(/\s+/);
    const queryWords = queryLower.split(/\s+/);

    let matchedWords = 0;
    for (const queryWord of queryWords) {
      if (textWords.some((textWord) => textWord.includes(queryWord))) {
        matchedWords++;
      }
    }

    if (matchedWords > 0) {
      return Math.round((matchedWords / queryWords.length) * 40);
    }

    return 0;
  }

  /**
   * Tracks search analytics
   * Records search queries for analytics and popular searches
   *
   * @param searchTerm - Search query
   * @param resultsCount - Number of results found
   *
   * @private
   */
  private async trackSearch(
    searchTerm: string,
    resultsCount: number
  ): Promise<void> {
    try {
      await db("search_analytics").insert({
        search_term: searchTerm,
        results_count: resultsCount,
        created_at: db.fn.now(),
      });
    } catch (error) {
      // Table might not exist, ignore error
      console.warn("Could not track search:", error);
    }
  }
}

export default new SearchController();
