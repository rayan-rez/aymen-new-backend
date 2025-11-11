// src/database/seeds/helpers/validation.ts
import { Knex } from "knex";

/**
 * Validates that all parent IDs in legacy data exist in new database
 */
export async function validateParentIds(
    knex: Knex,
    legacyData: any[],
    legacyIdField: string,
    newTableName: string,
    newIdField: string = "id"
): Promise<{
    valid: any[];
    invalid: any[];
    validIds: Set<number>;
}> {
    const legacyIds = [...new Set(legacyData.map(row => row[legacyIdField]))];
    const validIds = await knex(newTableName)
        .whereIn(newIdField, legacyIds)
        .pluck(newIdField);

    const validIdSet = new Set(validIds);

    return {
        valid: legacyData.filter(row => validIdSet.has(row[legacyIdField])),
        invalid: legacyData.filter(row => !validIdSet.has(row[legacyIdField])),
        validIds: validIdSet,
    };
}