// src/database/seeds/floor_plans.ts

import { Knex } from "knex";
import {
  fetchLegacyRecords,
  cleanUrl,
  sanitizeString,
  processBatch,
  printMigrationStats,
  clearTable,
  TransformResult,
} from "../helpers";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface LegacyFloorPlan {
  id: number;
  projet_id?: number;
  appartement_id?: number;
  nom_plan: string;
  image_url: string;
  pdf_url?: string;
  created_at: string;
  updated_at: string;
}

interface NewFloorPlan {
  plannable_type: "project" | "apartment";
  plannable_id: number;
  name: string;
  image_url: string;
  pdf_url: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// TRANSFORM FUNCTION
// ============================================================================

async function transformFloorPlan(
  legacy: LegacyFloorPlan,
  displayOrder: number
): Promise<TransformResult<NewFloorPlan>> {
  try {
    const name = sanitizeString(legacy.nom_plan);
    if (!name) {
      return { data: null, skip: true, error: "Empty floor plan name" };
    }

    const imageUrl = cleanUrl(legacy.image_url);
    if (!imageUrl) {
      return { data: null, skip: true, error: "Empty image URL" };
    }

    const plannableType = legacy.appartement_id ? "apartment" : "project";
    const plannableId = legacy.appartement_id || legacy.projet_id;

    if (!plannableId) {
      return {
        data: null,
        skip: true,
        error: "No project_id or apartment_id found",
      };
    }

    const pdfUrl = cleanUrl(legacy.pdf_url);

    return {
      data: {
        plannable_type: plannableType,
        plannable_id: plannableId,
        name,
        image_url: imageUrl,
        pdf_url: pdfUrl,
        display_order: displayOrder,
        created_at: legacy.created_at,
        updated_at: legacy.updated_at,
      },
      skip: false,
    };
  } catch (error: any) {
    return {
      data: null,
      skip: false,
      error: `Transform failed: ${error.message}`,
    };
  }
}

// ============================================================================
// SEED FUNCTION
// ============================================================================

export async function seed(knex: Knex): Promise<void> {
  console.log("\n📐 Starting Floor Plans Migration...\n");

  await clearTable(knex, "floor_plans");
  console.log("✓ Cleared floor_plans table");

  // CRITICAL FIX: Check if table exists in legacy database
  let legacyTableExists = false;
  try {
    await fetchLegacyRecords<LegacyFloorPlan>("plans_etage", { limit: 1 });
    legacyTableExists = true;
  } catch (error: any) {
    if (error.message.includes("doesn't exist")) {
      console.log("⚠️  Legacy table 'plans_etage' does not exist");
      console.log("ℹ️  Checking for alternative table names...\n");
    } else {
      throw error;
    }
  }

  // Try alternative table names if main table doesn't exist
  const possibleTables = ["plans_etage", "plan", "plans"];
  let legacyFloorPlans: LegacyFloorPlan[] = [];
  let foundTable: string | null = null;

  for (const tableName of possibleTables) {
    try {
      legacyFloorPlans = await fetchLegacyRecords<LegacyFloorPlan>(tableName);
      foundTable = tableName;
      console.log(`✓ Found floor plans in table: ${tableName}`);
      break;
    } catch (error: any) {
      // Continue to next table
      continue;
    }
  }

  if (!foundTable || legacyFloorPlans.length === 0) {
    console.log("⊗ No legacy floor plans found in any table");
    console.log("✓ Skipping floor plans migration (no data to migrate)\n");
    return;
  }

  console.log(`✓ Fetched ${legacyFloorPlans.length} legacy floor plans from ${foundTable}`);

  // Get valid project and apartment IDs
  const validProjectIds = new Set(await knex("projects").pluck("id"));
  const validApartmentIds = new Set(await knex("apartments").pluck("id"));

  console.log(`✓ Found ${validProjectIds.size} valid projects`);
  console.log(`✓ Found ${validApartmentIds.size} valid apartments\n`);

  // Filter out invalid floor plans
  const validFloorPlans = legacyFloorPlans.filter(plan => {
    const plannableId = plan.appartement_id || plan.projet_id;
    if (!plannableId) return false;
    
    if (plan.appartement_id) {
      return validApartmentIds.has(plan.appartement_id);
    } else if (plan.projet_id) {
      return validProjectIds.has(plan.projet_id);
    }
    return false;
  });

  console.log(`✓ Filtered to ${validFloorPlans.length} valid floor plans\n`);

  if (validFloorPlans.length === 0) {
    console.log("⊗ No valid floor plans to migrate (all reference non-existent entities)\n");
    return;
  }

  // Group by entity to assign display_order
  const plansByEntity = new Map<string, LegacyFloorPlan[]>();
  validFloorPlans.forEach((plan) => {
    const key = plan.appartement_id
      ? `apartment-${plan.appartement_id}`
      : `project-${plan.projet_id}`;
    if (!plansByEntity.has(key)) {
      plansByEntity.set(key, []);
    }
    plansByEntity.get(key)!.push(plan);
  });

  // Flatten with display_order
  const plansWithOrder: Array<{ plan: LegacyFloorPlan; order: number }> = [];
  plansByEntity.forEach((plans) => {
    plans.forEach((plan, index) => {
      plansWithOrder.push({ plan, order: index });
    });
  });

  // Process and insert
  const stats = await processBatch(
    plansWithOrder,
    ({ plan, order }) => transformFloorPlan(plan, order),
    async (batch) => {
      if (batch.length > 0) {
        await knex("floor_plans").insert(batch);
      }
    },
    { batchSize: 100, tableName: "floor_plans" }
  );

  printMigrationStats(stats);

  // Verify migration
  const totalPlans = await knex("floor_plans").count("* as count").first();
  const plansByType = await knex("floor_plans")
    .select("plannable_type")
    .count("* as count")
    .groupBy("plannable_type");

  console.log("\n" + "=".repeat(60));
  console.log("Floor Plans Migration Complete");
  console.log("=".repeat(60));
  console.log(`Total floor plans: ${totalPlans?.count || 0}`);
  
  if (plansByType.length > 0) {
    console.log("\nBreakdown by type:");
    plansByType.forEach((row: any) => {
      console.log(`  ${row.plannable_type}: ${row.count}`);
    });
  }
  console.log("=".repeat(60) + "\n");
}