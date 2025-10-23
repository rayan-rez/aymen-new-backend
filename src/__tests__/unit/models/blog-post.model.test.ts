/**
 * File: src/__tests__/unit/models/blog-post.model.test.ts
 * Comprehensive tests for BlogPostModel
 * Covers CRUD operations, publishing workflow, search, and relations
 */

import BlogPostModel from "@models/blog-post.model";
import PhotoModel, { PhotoableType } from "@models/photo.model";
import db from "@/config/database";

// Helper to generate unique slug
const uniqueSlug = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).substring(7)}`;

describe("BlogPostModel", () => {
  beforeEach(async () => {
    // Clean up in correct order
    await db("photos").del();
    await db("blog_posts").del();

    // Small delay to ensure cleanup completes
    await new Promise((resolve) => setTimeout(resolve, 100));
  });

  afterAll(async () => {
    await db("photos").del();
    await db("blog_posts").del();
    await db.destroy();
  });

  describe("create", () => {
    it("should create a new blog post", async () => {
      const postData = {
        title: "Test Post",
        slug: uniqueSlug("test-post"),
        authorName: "John Doe",
        content: "This is a test post content.",
      };

      const post = await BlogPostModel.create(postData);

      expect(post).toBeDefined();
      expect(post.id).toBeDefined();
      expect(post.title).toBe(postData.title);
      expect(post.slug).toBe(postData.slug);
      expect(post.authorName).toBe(postData.authorName);
      expect(post.content).toBe(postData.content);
      expect(post.isPublished).toBe(false); // Default
    });

    it("should fail to create post with duplicate slug", async () => {
      const slug = uniqueSlug("duplicate-post");
      const postData = {
        title: "Test Post",
        slug,
        authorName: "John Doe",
        content: "Content",
      };

      await BlogPostModel.create(postData);
      await expect(BlogPostModel.create(postData)).rejects.toThrow();
    });
  });

  describe("findById", () => {
    it("should find blog post by id", async () => {
      const created = await BlogPostModel.create({
        title: "Find By ID Post",
        slug: uniqueSlug("find-by-id"),
        authorName: "John Doe",
        content: "Content",
      });

      const found = await BlogPostModel.findById(created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.title).toBe(created.title);
    });

    it("should return null for non-existent id", async () => {
      const found = await BlogPostModel.findById(999999);
      expect(found).toBeNull();
    });
  });

  describe("findBySlug", () => {
    it("should find blog post by slug", async () => {
      const slug = uniqueSlug("find-by-slug");
      const created = await BlogPostModel.create({
        title: "Find By Slug Post",
        slug,
        authorName: "John Doe",
        content: "Content",
      });

      const found = await BlogPostModel.findBySlug(slug);

      expect(found).toBeDefined();
      expect(found?.slug).toBe(slug);
      expect(found?.title).toBe(created.title);
    });

    it("should return null for non-existent slug", async () => {
      const found = await BlogPostModel.findBySlug("non-existent-slug");
      expect(found).toBeNull();
    });
  });

  describe("findAll", () => {
    beforeEach(async () => {
      // Create multiple posts for testing
      await BlogPostModel.create({
        title: "Post 1",
        slug: uniqueSlug("post-1"),
        authorName: "Doe",
        content: "C1",
      });
      await BlogPostModel.create({
        title: "Post 2",
        slug: uniqueSlug("post-2"),
        authorName: "Doe",
        content: "C2",
      });
      await BlogPostModel.create({
        title: "Post 3",
        slug: uniqueSlug("post-3"),
        authorName: "Doe",
        content: "C3",
      });
    });

    it("should return all posts with pagination", async () => {
      const results = await BlogPostModel.findAll({ page: 1, limit: 2 });
      expect(results).toHaveLength(2);
    });

    it("should return empty array for no matches", async () => {
      const results = await BlogPostModel.findAll({ page: 100, limit: 10 });
      expect(results).toHaveLength(0);
    });
  });

  describe("update", () => {
    it("should update blog post fields", async () => {
      const created = await BlogPostModel.create({
        title: "Original Post",
        slug: uniqueSlug("original-post"),
        authorName: "John Doe",
        content: "Original content",
      });

      const updateData = {
        title: "Updated Post",
        content: "Updated content",
        metaDescription: "New meta",
      };

      const updated = await BlogPostModel.update(created.id, updateData);

      expect(updated).toBeDefined();
      expect(updated?.title).toBe(updateData.title);
      expect(updated?.content).toBe(updateData.content);
      expect(updated?.metaDescription).toBe(updateData.metaDescription);
    });

    it("should return null when updating non-existent post", async () => {
      const updated = await BlogPostModel.update(999999, {
        title: "Non-existent",
      });
      expect(updated).toBeNull();
    });
  });

  describe("softDelete", () => {
    it("should soft delete a blog post", async () => {
      const created = await BlogPostModel.create({
        title: "To Delete Post",
        slug: uniqueSlug("to-delete"),
        authorName: "John Doe",
        content: "Content",
      });

      await BlogPostModel.softDelete(created.id);

      const found = await BlogPostModel.findById(created.id);
      expect(found).toBeNull(); // Should not find soft-deleted by default

      const withDeleted = await BlogPostModel.findById(created.id);
      expect(withDeleted?.deletedAt).not.toBeNull();
    });
  });

  describe("publish and unpublish", () => {
    it("should publish a post", async () => {
      const created = await BlogPostModel.create({
        title: "To Publish Post",
        slug: uniqueSlug("to-publish"),
        authorName: "John Doe",
        content: "Content",
      });

      const published = await BlogPostModel.publish(created.id);
      expect(published).toBe(true);

      const found = await BlogPostModel.findById(created.id);
      expect(found?.isPublished).toBe(true);
      expect(found?.publishedAt).not.toBeNull();
    });

    it("should unpublish a post", async () => {
      const created = await BlogPostModel.create({
        title: "To Unpublish Post",
        slug: uniqueSlug("to-unpublish"),
        authorName: "John Doe",
        content: "Content",
        isPublished: true,
        publishedAt: new Date(),
      });

      const unpublished = await BlogPostModel.unpublish(created.id);
      expect(unpublished).toBe(true);

      const found = await BlogPostModel.findById(created.id);
      expect(found?.isPublished).toBe(false);
      expect(found?.publishedAt).toBeNull();
    });

    it("should return false for non-existent post", async () => {
      const published = await BlogPostModel.publish(999999);
      expect(published).toBe(false);
    });
  });

  describe("incrementViewCount", () => {
    it("should increment view count", async () => {
      const created = await BlogPostModel.create({
        title: "View Count Post",
        slug: uniqueSlug("view-count"),
        authorName: "John Doe",
        content: "Content",
      });

      await BlogPostModel.incrementViewCount(created.id);

      const found = await BlogPostModel.findById(created.id);
      expect(found?.viewCount).toBe(1);
    });

    it("should return false for non-existent post", async () => {
      const incremented = await BlogPostModel.incrementViewCount(999999);
      expect(incremented).toBe(false);
    });
  });

  describe("getRecentPublished", () => {
    beforeEach(async () => {
      // Create published posts
      await BlogPostModel.create({
        title: "Recent 1",
        slug: uniqueSlug("recent-1"),
        authorName: "Doe",
        content: "C1",
        isPublished: true,
        publishedAt: new Date(),
      });
      await BlogPostModel.create({
        title: "Recent 2",
        slug: uniqueSlug("recent-2"),
        authorName: "Doe",
        content: "C2",
        isPublished: true,
        publishedAt: new Date(Date.now() - 86400000), // 1 day ago
      });
    });

    it("should return recent published posts", async () => {
      const recent = await BlogPostModel.getRecent(1);
      expect(recent).toHaveLength(1);
      expect(recent[0].isPublished).toBe(true);
    });
  });

  describe("search", () => {
    beforeEach(async () => {
      await BlogPostModel.create({
        title: "Search Title Match",
        slug: uniqueSlug("search-title"),
        authorName: "Doe",
        content: "Content with keyword",
        isPublished: true,
      });
      await BlogPostModel.create({
        title: "No Match",
        slug: uniqueSlug("no-match"),
        authorName: "Doe",
        content: "No keyword here",
        isPublished: true,
      });
    });

    it("should search posts by title or content", async () => {
      const results = await BlogPostModel.search("keyword");
      expect(results).toHaveLength(1);
      expect(results[0].content).toContain("keyword");
    });

    it("should return empty for no matches", async () => {
      const results = await BlogPostModel.search("nonexistent");
      expect(results).toHaveLength(0);
    });
  });

  describe("Polymorphic Relations", () => {
    let postId: number;

    beforeEach(async () => {
      const post = await BlogPostModel.create({
        title: "Relations Post",
        slug: uniqueSlug("relations-post"),
        authorName: "John Doe",
        content: "Content",
      });
      postId = post.id;
    });

    it("should add and retrieve gallery images (photos)", async () => {
      const photos = await PhotoModel.bulkCreate(
        PhotoableType.BLOG_POST,
        postId,
        [
          { url: "gallery1.jpg", caption: "Gallery 1" },
          { url: "gallery2.jpg", caption: "Gallery 2" },
        ]
      );

      expect(photos).toHaveLength(2);

      const retrieved = await PhotoModel.getForEntity(
        PhotoableType.BLOG_POST,
        postId
      );
      expect(retrieved).toHaveLength(2);
    });
  });
});
