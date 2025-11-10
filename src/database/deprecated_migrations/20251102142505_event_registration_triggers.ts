import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    CREATE TRIGGER trg_increment_event_registration
    AFTER INSERT ON event_registrations
    FOR EACH ROW
    BEGIN
      IF NEW.status = 'confirmed' THEN
        UPDATE events 
        SET registered_count = registered_count + 1
        WHERE id = NEW.event_id;
      END IF;
    END;
  `);

  await knex.raw(`
    CREATE TRIGGER trg_decrement_event_registration
    AFTER UPDATE ON event_registrations
    FOR EACH ROW
    BEGIN
      IF OLD.status = 'confirmed' AND NEW.status = 'cancelled' THEN
        UPDATE events 
        SET registered_count = registered_count - 1
        WHERE id = OLD.event_id;
      ELSEIF OLD.status = 'cancelled' AND NEW.status = 'confirmed' THEN
        UPDATE events 
        SET registered_count = registered_count + 1
        WHERE id = NEW.event_id;
      END IF;
    END;
  `);
}


export async function down(knex: Knex): Promise<void> {
  await knex.raw("DROP VIEW IF EXISTS trg_increment_event_registration");
  await knex.raw("DROP VIEW IF EXISTS trg_decrement_event_registration");
}