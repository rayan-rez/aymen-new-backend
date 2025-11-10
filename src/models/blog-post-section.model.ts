/**
 * Blog Post Section, Commercial Property, and Feedback Models
 * Combined file for related content management models
 *
 * @module models/content-management
 */

import {
  BaseModel,
  AdvancedQueryOptions,
  PaginatedResult,
  DatabaseRecord,
} from "./base";
import { generateSlug } from "@/database/helpers";
import PhotoModel, { PhotoableType, Photo } from "./photo.model";
import { Knex } from "knex";

// ============================================================================
// BLOG POST SECTION MODEL
// ============================================================================

export interface BlogPostSection {
  id: number;
  blogPostId: number;
  sectionTitle: string | null;
  sectionContent: string;
  sectionImageUrl: string | null;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSectionDto {
  blogPostId: number;
  sectionTitle?: string;
  sectionContent: string;
  sectionImageUrl?: string;
  displayOrder?: number;
}

export interface UpdateSectionDto extends Partial<CreateSectionDto> {}

export class BlogPostSectionModel extends BaseModel<
  BlogPostSection,
  CreateSectionDto,
  UpdateSectionDto
> {
  protected tableName = "blog_post_sections";
  protected primaryKey = "id";

  protected config = {
    softDelete: false,
    timestamps: true,
    defaultSortColumn: "display_order",
    defaultSortOrder: "asc" as const,
    searchableColumns: ["section_title", "section_content"],
    fillable: [
      "blogPostId",
      "sectionTitle",
      "sectionContent",
      "sectionImageUrl",
      "displayOrder",
    ],
    guarded: ["id", "createdAt", "updatedAt"],
  };

  async findByBlogPost(
    blogPostId: number,
    trx?: Knex.Transaction
  ): Promise<BlogPostSection[]> {
    const connection = trx || this.db;

    const records = await connection(this.tableName)
      .where({ blog_post_id: blogPostId })
      .orderBy("display_order", "asc");

    return records.map((r: DatabaseRecord) => this.mapToEntity(r));
  }

  async reorderSections(
    blogPostId: number,
    sectionIds: number[],
    trx?: Knex.Transaction
  ): Promise<boolean> {
    const connection = trx || this.db;

    await connection.transaction(async (localTrx) => {
      const useTrx = trx || localTrx;

      for (let i = 0; i < sectionIds.length; i++) {
        await useTrx(this.tableName)
          .where({ id: sectionIds[i], blog_post_id: blogPostId })
          .update({ display_order: i });
      }
    });

    return true;
  }

  protected mapToEntity(record: DatabaseRecord): BlogPostSection {
    return {
      id: record.id,
      blogPostId: record.blog_post_id,
      sectionTitle: record.section_title,
      sectionContent: record.section_content,
      sectionImageUrl: record.section_image_url,
      displayOrder: record.display_order || 0,
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at),
    };
  }
}



// Export all model instances
export const blogPostSectionModel = new BlogPostSectionModel();
