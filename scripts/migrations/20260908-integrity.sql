BEGIN;
SET LOCAL lock_timeout = '10s';
CREATE TABLE IF NOT EXISTS booking_status_events (
 id bigserial PRIMARY KEY, booking_id integer NOT NULL,
 old_status text, new_status text NOT NULL, changed_at timestamptz NOT NULL DEFAULT now(),
 database_user text NOT NULL DEFAULT current_user
);
CREATE OR REPLACE FUNCTION airmanager_booking_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
 capacity integer; units integer; oversold boolean; room_capacity integer;
 mode text; changed_capacity boolean;
BEGIN
 IF NEW.deleted_at IS NOT NULL THEN RETURN NEW; END IF;
 IF NEW.check_in !~ '^\d{4}-\d{2}-\d{2}$' OR NEW.check_out !~ '^\d{4}-\d{2}-\d{2}$' OR NEW.check_out::date <= NEW.check_in::date THEN
  RAISE EXCEPTION 'Checkout must be after a valid check-in date' USING ERRCODE='23514';
 END IF;
 IF NEW.total_amount < 0 OR (NEW.room_count IS NOT NULL AND NEW.room_count < 1) THEN
  RAISE EXCEPTION 'Amounts and room counts are invalid' USING ERRCODE='23514';
 END IF;
 IF TG_OP='UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
  IF NOT (CASE OLD.status
   WHEN 'upcoming' THEN NEW.status IN ('checked_in','current','cancelled','blocked')
   WHEN 'checked_in' THEN NEW.status IN ('checked_out','upcoming')
   WHEN 'current' THEN NEW.status IN ('checked_out','upcoming')
   WHEN 'checked_out' THEN NEW.status IN ('checked_in','completed')
   WHEN 'cancelled' THEN NEW.status='upcoming'
   WHEN 'blocked' THEN NEW.status IN ('upcoming','cancelled') ELSE false END) THEN
   RAISE EXCEPTION 'Guest must check in before checkout; invalid status transition' USING ERRCODE='23514';
  END IF;
  IF NEW.status IN ('checked_in','current') AND NEW.check_in::date > (now() AT TIME ZONE 'Asia/Kolkata')::date THEN
   RAISE EXCEPTION 'Cannot check in before arrival date' USING ERRCODE='23514';
  END IF;
  INSERT INTO booking_status_events(booking_id,old_status,new_status) VALUES(NEW.id,OLD.status,NEW.status);
 END IF;
 changed_capacity := TG_OP='INSERT';
 IF TG_OP='UPDATE' THEN
  changed_capacity := (NEW.property_id, NEW.room_id, NEW.room_count, NEW.check_in, NEW.check_out)
    IS DISTINCT FROM (OLD.property_id, OLD.room_id, OLD.room_count, OLD.check_in, OLD.check_out)
    OR (OLD.status='cancelled' AND NEW.status!='cancelled');
 END IF;
 IF NOT changed_capacity OR NEW.status='cancelled' THEN RETURN NEW; END IF;
 PERFORM pg_advisory_xact_lock(9142, NEW.property_id);
 SELECT booking_mode INTO mode FROM properties WHERE id=NEW.property_id AND deleted_at IS NULL;
 IF mode IS NULL THEN RAISE EXCEPTION 'Property not found' USING ERRCODE='23503'; END IF;
 IF mode='whole' THEN
  IF EXISTS(SELECT 1 FROM bookings b WHERE b.property_id=NEW.property_id AND b.id!=NEW.id AND b.deleted_at IS NULL AND b.status!='cancelled' AND b.check_in<NEW.check_out AND b.check_out>NEW.check_in) THEN
   RAISE EXCEPTION 'BOOKING_OVERLAP' USING ERRCODE='23514';
  END IF;
 ELSE
  SELECT coalesce(sum(room_count),0) INTO capacity FROM rooms WHERE property_id=NEW.property_id;
  units := coalesce(NEW.room_count,1);
  IF NEW.room_id IS NOT NULL THEN
   SELECT room_count INTO room_capacity FROM rooms WHERE id=NEW.room_id AND property_id=NEW.property_id;
   IF room_capacity IS NULL THEN RAISE EXCEPTION 'Invalid room for property' USING ERRCODE='23503'; END IF;
  END IF;
  SELECT EXISTS (
   SELECT 1 FROM generate_series(NEW.check_in::date,NEW.check_out::date-1,interval '1 day') d
   LEFT JOIN bookings b ON b.property_id=NEW.property_id AND b.id!=NEW.id AND b.deleted_at IS NULL AND b.status!='cancelled' AND b.check_in::date<=d::date AND b.check_out::date>d::date
   GROUP BY d HAVING coalesce(sum(coalesce(b.room_count,1)) FILTER(WHERE b.id IS NOT NULL),0)+units>capacity
    OR (NEW.room_id IS NOT NULL AND coalesce(sum(coalesce(b.room_count,1)) FILTER(WHERE b.room_id=NEW.room_id),0)+units>room_capacity)
  ) INTO oversold;
  IF oversold THEN RAISE EXCEPTION 'BOOKING_OVERLAP' USING ERRCODE='23514'; END IF;
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS airmanager_booking_guard_trigger ON bookings;
CREATE TRIGGER airmanager_booking_guard_trigger BEFORE INSERT OR UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION airmanager_booking_guard();
DROP INDEX IF EXISTS bookings_room_dates_unique;
CREATE INDEX IF NOT EXISTS bookings_property_dates_idx ON bookings(property_id,check_in,check_out);
ALTER TABLE properties ALTER COLUMN currency SET DEFAULT 'INR';
UPDATE properties SET booking_mode='room_based' WHERE booking_mode='rooms';
COMMIT;
