/**
 * Social Media Controller (Fixed)
 * Handles social media integrations with proper TypeScript types
 * 
 * @module controllers/social-media.controller
 */

import { Request, Response } from "express";
import { ApiResponse } from "@utils/response.util";
import axios, { AxiosResponse } from "axios";
import fs from "fs";
import path from "path";
import { YOUTUBE_CONFIG } from "@constants/app.constants";

/**
 * YouTube API Response Types
 */
interface YouTubeSearchResponse {
  items: Array<{
    id: {
      videoId: string;
    };
    snippet: {
      title: string;
      thumbnails: {
        high: {
          url: string;
        };
      };
      publishedAt: string;
    };
  }>;
}

interface YouTubeVideoDetails {
  items: Array<{
    id: string;
    contentDetails: {
      duration: string;
    };
    snippet: {
      title: string;
      thumbnails: {
        high: {
          url: string;
        };
      };
      publishedAt: string;
    };
  }>;
}

interface YouTubeVideo {
  videoId: string;
  title: string;
  thumbnail: string;
  url: string;
  publishedAt: string;
  duration?: string;
}

interface CachedData {
  expiration: number;
  data: YouTubeVideo[];
}

/**
 * Cache file location
 */
const CACHE_DIR = path.join(__dirname, "../../cache");
const CACHE_FILE = path.join(CACHE_DIR, "youtube_cache.json");

/**
 * Social Media Controller
 */
class SocialMediaController {
  /**
   * Ensures cache directory exists
   * @private
   */
  private ensureCacheDir(): void {
    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
    }
  }

  /**
   * Parses ISO 8601 duration to seconds
   * @param duration - ISO 8601 duration (e.g., "PT1M30S")
   * @returns Duration in seconds
   * @private
   */
  private parseDuration(duration: string): number {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;

    const hours = match[1] ? parseInt(match[1]) : 0;
    const minutes = match[2] ? parseInt(match[2]) : 0;
    const seconds = match[3] ? parseInt(match[3]) : 0;

    return hours * 3600 + minutes * 60 + seconds;
  }

  /**
   * Reads cache file
   * @private
   */
  private readCache(): CachedData | null {
    try {
      if (fs.existsSync(CACHE_FILE)) {
        const content = fs.readFileSync(CACHE_FILE, "utf-8");
        return JSON.parse(content) as CachedData;
      }
    } catch (error) {
      console.error("Error reading cache:", error);
    }
    return null;
  }

  /**
   * Writes cache file
   * @private
   */
  private writeCache(data: YouTubeVideo[]): void {
    try {
      this.ensureCacheDir();
      const cacheContent: CachedData = {
        expiration: Date.now() + YOUTUBE_CONFIG.CACHE_DURATION_MS,
        data,
      };
      fs.writeFileSync(CACHE_FILE, JSON.stringify(cacheContent));
    } catch (error) {
      console.error("Error writing cache:", error);
    }
  }

  /**
   * Gets YouTube Shorts from configured channel
   * Caches results for 10 minutes to avoid API quota issues
   *
   * @route GET /api/social-media/youtube-shorts
   * @access Public
   *
   * @query maxResults - Maximum number of shorts to return (default: 3)
   *
   * @example
   * GET /api/social-media/youtube-shorts?maxResults=5
   */
  getYouTubeShorts = async (req: Request, res: Response): Promise<void> => {
    const { maxResults = 3 } = req.query;
    const API_KEY = process.env.YOUTUBE_API_KEY;
    const CHANNEL_ID = process.env.YOUTUBE_CHANNEL_ID;

    try {
      // Validate configuration
      if (!API_KEY || !CHANNEL_ID) {
        ApiResponse.error(
          res,
          "YouTube API key or channel ID not configured",
          500
        );
        return;
      }

      // Ensure cache directory exists
      this.ensureCacheDir();

      // Check cache first
      if (fs.existsSync(CACHE_FILE)) {
        const cacheContent = JSON.parse(fs.readFileSync(CACHE_FILE, "utf-8"));

        if (Date.now() < cacheContent.expiration) {
          console.log("✅ Returning cached YouTube Shorts");
          ApiResponse.success(
            res,
            cacheContent.data,
            "YouTube Shorts retrieved from cache"
          );
          return;
        }
      }

      console.log("🔄 Fetching fresh YouTube Shorts data...");

      // Step 1: Get recent videos from channel
      const searchResponse = await axios.get(
        "https://www.googleapis.com/youtube/v3/search",
        {
          params: {
            part: "snippet",
            channelId: CHANNEL_ID,
            maxResults: parseInt(maxResults as string, 10) * 2, // Fetch more to filter
            order: "date",
            type: "video",
            key: API_KEY,
          },
        }
      );

      const videos = searchResponse.data?.items;

      if (!videos || videos.length === 0) {
        ApiResponse.notFound(res, "No videos found on this channel");
        return;
      }

      // Step 2: Get video details (including duration)
      const videoIds = videos.map((video: any) => video.id.videoId).join(",");

      const videosResponse = await axios.get(
        "https://www.googleapis.com/youtube/v3/videos",
        {
          params: {
            part: "contentDetails,snippet",
            id: videoIds,
            key: API_KEY,
          },
        }
      );

      const videosDetails = videosResponse.data?.items;

      // Step 3: Filter videos with duration <= 60 seconds (Shorts)
      const shorts = videosDetails
        .filter((video: any) => {
          const duration = video.contentDetails?.duration;
          if (!duration) return false;
          const seconds = this.parseDuration(duration);
          return seconds <= 60;
        })
        .slice(0, parseInt(maxResults as string, 10)); // Limit to requested count

      if (shorts.length === 0) {
        ApiResponse.notFound(
          res,
          "No YouTube Shorts found (videos under 60 seconds)"
        );
        return;
      }

      // Step 4: Format the data
      const shortsData: YouTubeVideo[] = shorts.map((video: any) => ({
        videoId: video.id,
        title: video.snippet.title,
        thumbnail: video.snippet.thumbnails.high.url,
        url: `https://www.youtube.com/shorts/${video.id}`,
        publishedAt: video.snippet.publishedAt,
        duration: video.contentDetails.duration,
      }));

      // Step 5: Cache the results
      fs.writeFileSync(
        CACHE_FILE,
        JSON.stringify({
          expiration: Date.now() + CACHE_DURATION,
          data: shortsData,
        })
      );

      console.log(`✅ Fetched ${shortsData.length} YouTube Shorts`);

      ApiResponse.success(
        res,
        shortsData,
        "YouTube Shorts retrieved successfully"
      );
    } catch (error: any) {
      console.error("❌ Error fetching YouTube Shorts:", error.message);

      if (error.response?.status === 403) {
        ApiResponse.error(
          res,
          "YouTube API quota exceeded or invalid API key",
          403
        );
      } else if (error.response?.status === 404) {
        ApiResponse.notFound(res, "YouTube channel not found");
      } else {
        ApiResponse.error(
          res,
          "Failed to fetch YouTube Shorts",
          500,
          process.env.NODE_ENV === "development"
            ? { error: error.message }
            : undefined
        );
      }
    }
  };

  /**
   * Gets all videos from YouTube channel (not just Shorts)
   *
   * @route GET /api/social-media/youtube-videos
   * @access Public
   *
   * @query maxResults - Maximum videos to return (default: 10)
   *
   * @example
   * GET /api/social-media/youtube-videos?maxResults=20
   */
  getAllYouTubeVideos = async (req: Request, res: Response): Promise<void> => {
    const { maxResults = 10 } = req.query;
    const API_KEY = process.env.YOUTUBE_API_KEY;
    const CHANNEL_ID = process.env.YOUTUBE_CHANNEL_ID;

    try {
      if (!API_KEY || !CHANNEL_ID) {
        ApiResponse.error(
          res,
          "YouTube API key or channel ID not configured",
          500
        );
        return;
      }

      const searchResponse = await axios.get(
        "https://www.googleapis.com/youtube/v3/search",
        {
          params: {
            part: "snippet",
            channelId: CHANNEL_ID,
            maxResults: parseInt(maxResults as string, 10),
            order: "date",
            type: "video",
            key: API_KEY,
          },
        }
      );

      const videos = searchResponse.data?.items.map((video: any) => ({
        videoId: video.id.videoId,
        title: video.snippet.title,
        thumbnail: video.snippet.thumbnails.high.url,
        url: `https://www.youtube.com/watch?v=${video.id.videoId}`,
        publishedAt: video.snippet.publishedAt,
      }));

      ApiResponse.success(res, videos, "YouTube videos retrieved successfully");
    } catch (error: any) {
      console.error("Error fetching YouTube videos:", error.message);
      ApiResponse.error(res, "Failed to fetch YouTube videos", 500);
    }
  };

  /**
   * Clears the YouTube Shorts cache
   * Forces fresh data on next request
   *
   * @route DELETE /api/social-media/youtube-shorts/cache
   * @access Private (Admin)
   *
   * @example
   * DELETE /api/social-media/youtube-shorts/cache
   */
  clearYouTubeCache = async (req: Request, res: Response): Promise<void> => {
    try {
      if (fs.existsSync(CACHE_FILE)) {
        fs.unlinkSync(CACHE_FILE);
        ApiResponse.success(res, null, "YouTube cache cleared successfully");
      } else {
        ApiResponse.notFound(res, "No cache file found");
      }
    } catch (error) {
      console.error("Error clearing cache:", error);
      ApiResponse.error(res, "Failed to clear cache", 500);
    }
  };

  /**
   * Gets cache status and information
   *
   * @route GET /api/social-media/youtube-shorts/cache-status
   * @access Private (Admin)
   *
   * @example
   * GET /api/social-media/youtube-shorts/cache-status
   */
  getCacheStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!fs.existsSync(CACHE_FILE)) {
        ApiResponse.success(
          res,
          {
            cached: false,
            message: "No cache exists",
          },
          "Cache status"
        );
        return;
      }

      const cacheContent = JSON.parse(fs.readFileSync(CACHE_FILE, "utf-8"));
      const isExpired = Date.now() >= cacheContent.expiration;
      const expiresIn = Math.max(
        0,
        Math.floor((cacheContent.expiration - Date.now()) / 1000)
      );

      ApiResponse.success(
        res,
        {
          cached: true,
          expired: isExpired,
          expiresIn: `${expiresIn} seconds`,
          itemsCount: cacheContent.data?.length || 0,
        },
        "Cache status"
      );
    } catch (error) {
      console.error("Error getting cache status:", error);
      ApiResponse.error(res, "Failed to get cache status", 500);
    }
  };
}

export default new SocialMediaController();
