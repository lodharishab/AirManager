-- 2026-09-16 review fixes: room inventory capacity guard + property name uniqueness.
BEGIN;
SET LOCAL lock_timeout = '10s';

-- A partial unique index lets a property be re-created with the same name+address
-- after a soft delete, while still preventing two live properties from colliding.
ALTER TABLE properties DROP CONSTRAINT IF EXISTS properties_name_address_unique;
CREATE UNIQUE INDEX IF NOT EXISTS properties_name_address_unique
  ON properties (name, address) WHERE deleted_at IS NULL;

-- The booking guard trigger enforces nightly capacity when BOOKINGS change, but room
-- inventory changes (shrinking room_count, deleting room types) bypassed it entirely
-- and could silently oversell existing reservations. These statement-level guards
-- re-check every active booking against the post-change inventory.
CREATE OR REPLACE FUNCTION airmanager_assert_property_capacity(p_property_id integer) RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  total_cap integer;
  peak_total integer;
  peak_room integer;
  r record;
BEGIN
  SELECT coalesce(sum(room_count), 0) INTO total_cap FROM rooms WHERE property_id = p_property_id;
  SELECT coalesce(max(units), 0) INTO peak_total FROM (
    SELECT d.day, sum(coalesce(b.room_count, 1)) AS units
    FROM bookings b,
         generate_series(b.check_in::date, b.check_out::date - 1, interval '1 day') AS d(day)
    WHERE b.property_id = p_property_id
      AND b.deleted_at IS NULL
      AND b.status <> 'cancelled'
    GROUP BY d.day
  ) s;
  IF peak_total > total_cap THEN
    RAISE EXCEPTION 'ROOM_CAPACITY_VIOLATION: % booked units would exceed total capacity %', peak_total, total_cap USING ERRCODE = '23514';
  END IF;
  FOR r IN
    SELECT rm.id, rm.room_type, rm.room_count
    FROM rooms rm
    WHERE rm.property_id = p_property_id
  LOOP
    SELECT coalesce(max(units), 0) INTO peak_room FROM (
      SELECT d.day, sum(coalesce(b.room_count, 1)) AS units
      FROM bookings b,
           generate_series(b.check_in::date, b.check_out::date - 1, interval '1 day') AS d(day)
      WHERE b.property_id = p_property_id
        AND b.room_id = r.id
        AND b.deleted_at IS NULL
        AND b.status <> 'cancelled'
      GROUP BY d.day
    ) s;
    IF peak_room > r.room_count THEN
      RAISE EXCEPTION 'ROOM_CAPACITY_VIOLATION: room type % would be oversold (% booked units against capacity %)', r.room_type, peak_room, r.room_count USING ERRCODE = '23514';
    END IF;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION airmanager_room_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  prop_id integer;
BEGIN
  IF TG_OP = 'DELETE' THEN
    FOR prop_id IN SELECT DISTINCT property_id FROM old_rooms LOOP
      PERFORM airmanager_assert_property_capacity(prop_id);
    END LOOP;
  ELSE
    FOR prop_id IN SELECT DISTINCT property_id FROM (
      SELECT property_id FROM new_rooms
      UNION
      SELECT property_id FROM old_rooms
    ) s LOOP
      PERFORM airmanager_assert_property_capacity(prop_id);
    END LOOP;
  END IF;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS airmanager_room_guard_update ON rooms;
-- NOTE: Postgres does not allow transition tables on `UPDATE OF <column>` triggers,
-- so this fires on any rooms update; the capacity re-check is cheap and idempotent.
CREATE TRIGGER airmanager_room_guard_update
AFTER UPDATE ON rooms
REFERENCING NEW TABLE AS new_rooms OLD TABLE AS old_rooms
FOR EACH STATEMENT EXECUTE FUNCTION airmanager_room_guard();

DROP TRIGGER IF EXISTS airmanager_room_guard_delete ON rooms;
CREATE TRIGGER airmanager_room_guard_delete
AFTER DELETE ON rooms
REFERENCING OLD TABLE AS old_rooms
FOR EACH STATEMENT EXECUTE FUNCTION airmanager_room_guard();

COMMIT;
