BEGIN;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS internal_notes text;
UPDATE properties SET internal_notes=concat_ws(E'\n\n',internal_notes,'Historical property description (pending verification): ' || description),
 description='11-room guesthouse in Pushkar. Room-type details, rates for unclassified rooms, and total guest capacity are pending verification.', max_guests=NULL
WHERE id=5 AND name='Rivaan Hillside Guesthouse' AND description LIKE '%two bookable rooms%';
UPDATE properties SET internal_notes=concat_ws(E'\n\n',internal_notes,'Address verification note: ' || address),
 address=trim(regexp_replace(address,'\s*\([^)]*(pending|verification)[^)]*\)','','gi'))
WHERE address ~* '\([^)]*(pending|verification)[^)]*\)';
COMMIT;
