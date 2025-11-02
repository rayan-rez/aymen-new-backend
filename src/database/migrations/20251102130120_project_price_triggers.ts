import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    CREATE TRIGGER trg_update_project_price_range
    AFTER INSERT ON apartments
    FOR EACH ROW
    BEGIN
      UPDATE projects 
      SET 
        price_min = (
          SELECT MIN(price) FROM apartments 
          WHERE project_id = NEW.project_id AND price IS NOT NULL
        ),
        price_max = (
          SELECT MAX(price) FROM apartments 
          WHERE project_id = NEW.project_id AND price IS NOT NULL
        )
      WHERE id = NEW.project_id;
    END;
  `);

  await knex.raw(`
    CREATE TRIGGER trg_update_project_price_range_update
    AFTER UPDATE ON apartments
    FOR EACH ROW
    BEGIN
      IF OLD.price <> NEW.price OR OLD.project_id <> NEW.project_id THEN
        UPDATE projects 
        SET 
          price_min = (
            SELECT MIN(price) FROM apartments 
            WHERE project_id = NEW.project_id AND price IS NOT NULL
          ),
          price_max = (
            SELECT MAX(price) FROM apartments 
            WHERE project_id = NEW.project_id AND price IS NOT NULL
          )
        WHERE id = NEW.project_id;
        
        IF OLD.project_id <> NEW.project_id THEN
          UPDATE projects 
          SET 
            price_min = (
              SELECT MIN(price) FROM apartments 
              WHERE project_id = OLD.project_id AND price IS NOT NULL
            ),
            price_max = (
              SELECT MAX(price) FROM apartments 
              WHERE project_id = OLD.project_id AND price IS NOT NULL
            )
          WHERE id = OLD.project_id;
        END IF;
      END IF;
    END;
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw("DROP TRIGGER IF EXISTS trg_update_project_price_range_update");
  await knex.raw("DROP TRIGGER IF EXISTS trg_update_project_price_range");
}