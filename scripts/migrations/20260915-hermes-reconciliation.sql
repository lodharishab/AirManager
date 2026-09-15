BEGIN;

CREATE TABLE IF NOT EXISTS property_facts (
  id serial PRIMARY KEY,
  property_id integer NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  fact_key text NOT NULL,
  category text NOT NULL,
  label text NOT NULL,
  value text NOT NULL,
  status text NOT NULL DEFAULT 'verified',
  observed_at text NOT NULL,
  source text NOT NULL,
  metadata json,
  CONSTRAINT property_facts_property_key_unique UNIQUE(property_id, fact_key)
);

UPDATE properties
SET min_nightly_rate = 25000, currency = 'INR'
WHERE name = 'Kuber Vatika' AND min_nightly_rate IS NULL;

UPDATE properties
SET currency = 'INR',
    house_rules = concat_ws(E'\n', nullif(house_rules, ''),
      'Payment and cancellation policy: Advance payment is required; Pay at Hotel is not accepted. Bookings are non-refundable. If a platform requires a cancellation tier, use the strictest available tier.')
WHERE name IN ('Soni Bagh', 'Rivaan Hillside Guesthouse', 'Kuber Vatika')
  AND coalesce(house_rules, '') NOT ILIKE '%Pay at Hotel is not accepted%';

INSERT INTO property_links(property_id, label, url, link_type)
SELECT p.id, v.label, v.url, 'airbnb'
FROM properties p
JOIN (VALUES
  ('Soni Bagh', 'Airbnb · Soni Bagh', 'https://www.airbnb.co.in/rooms/1341157288181933741'),
  ('Rivaan Hillside Guesthouse', 'Airbnb · Garden Room', 'https://www.airbnb.co.in/rooms/1743505069189785247'),
  ('Rivaan Hillside Guesthouse', 'Airbnb · Hill-View Room', 'https://www.airbnb.co.in/rooms/1745716727410532621'),
  ('Kuber Vatika', 'Airbnb · Kuber Vatika', 'https://www.airbnb.co.in/rooms/45856170')
) AS v(property_name, label, url) ON p.name = v.property_name
WHERE p.deleted_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM property_links l WHERE l.property_id = p.id AND l.url = v.url);

INSERT INTO enquiries(property_id, guest_name, message, status, created_at)
SELECT p.id, 'Komal',
  'Historical Airbnb enquiry for 30–31 Aug 2026, 6 guests. Public list price ₹14,550; recorded host net ₹12,294.75. Pre-approval was sent and later expired without conversion. This is an enquiry, not a confirmed booking.',
  'closed', '2026-08-30T00:00:00+05:30'
FROM properties p
WHERE p.name = 'Soni Bagh' AND p.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM enquiries e
    WHERE e.property_id = p.id AND lower(e.guest_name) = 'komal'
      AND e.message ILIKE '%30–31 Aug 2026%'
  );

INSERT INTO property_facts(property_id, fact_key, category, label, value, status, observed_at, source, metadata)
SELECT p.id, f.fact_key, f.category, f.label, f.value, f.status, f.observed_at, f.source, f.metadata::json
FROM properties p
JOIN (VALUES
  ('Soni Bagh', 'booking-policy', 'policy', 'Booking payment and cancellation', 'Advance payment only; never Pay at Hotel. Bookings are non-refundable; use the strictest cancellation tier available on the platform.', 'verified', '2026-09-09', 'Hermes/OpenClaw owner policy', '{}'),
  ('Soni Bagh', 'airbnb-settings', 'channel_policy', 'Airbnb settings', 'Manual price ₹15,000; Smart Pricing off; Firm cancellation; non-refundable option on; Instant Book on.', 'historical', '2026-07-27', 'Hermes/OpenClaw Airbnb record', '{"listingId":"1341157288181933741"}'),
  ('Soni Bagh', 'airbnb-review-snapshot-20260909', 'review_snapshot', 'Airbnb rating snapshot', '2.67 stars from 3 reviews. Aggregate snapshot only; individual reviews were not available and were not invented.', 'historical', '2026-09-09', 'Hermes/OpenClaw public listing audit', '{"rating":2.67,"reviewCount":3}'),
  ('Soni Bagh', 'pricing-snapshot-20260909', 'pricing_snapshot', 'Historical pricing recommendation', 'Weekday ₹16,150; weekend about ₹18,575. This recommendation expired and was never pushed to the channel.', 'expired', '2026-09-09', 'Hermes pricing run', '{"weekday":16150,"weekend":18575,"pushed":false}'),
  ('Rivaan Hillside Guesthouse', 'booking-policy', 'policy', 'Booking payment and cancellation', 'Advance payment only; never Pay at Hotel. Bookings are non-refundable; use the strictest cancellation tier available on the platform.', 'verified', '2026-09-09', 'Hermes/OpenClaw owner policy', '{}'),
  ('Rivaan Hillside Guesthouse', 'airbnb-review-snapshot-20260909', 'review_snapshot', 'Airbnb rating snapshot', 'Garden Room and Hill-View Room each showed 0 reviews.', 'historical', '2026-09-09', 'Hermes/OpenClaw public listing audit', '{"gardenListingId":"1743505069189785247","hillViewListingId":"1745716727410532621","reviewCount":0}'),
  ('Rivaan Hillside Guesthouse', 'availability-20260911-13', 'availability_observation', 'Public calendar observation · 11–13 Sep', 'Both public room widgets appeared unavailable. Whether this was a booking or a host block could not be verified, so no booking was created.', 'needs_verification', '2026-09-09', 'Hermes/OpenClaw public widget audit', '{"start":"2026-09-11","end":"2026-09-13"}'),
  ('Rivaan Hillside Guesthouse', 'availability-20261002-04', 'availability_observation', 'Public calendar observation · 2–4 Oct', 'Both public room widgets appeared unavailable. Whether this was a booking or a host block could not be verified, so no booking was created.', 'needs_verification', '2026-09-09', 'Hermes/OpenClaw public widget audit', '{"start":"2026-10-02","end":"2026-10-04"}'),
  ('Rivaan Hillside Guesthouse', 'ota-rate-floor-20260909', 'rate_observation', 'MMT/Goibibo rate below owner floor', 'Public rates of ₹2,238 and ₹2,152 were observed against the ₹3,500 room floor. Extranet login had expired, so the channel configuration still needs verification.', 'needs_verification', '2026-09-09', 'Hermes/OpenClaw OTA audit', '{"floor":3500,"observedRates":[2238,2152]}'),
  ('Rivaan Hillside Guesthouse', 'pricing-snapshot-20260909', 'pricing_snapshot', 'Historical pricing recommendation', 'Weekday ₹3,550; weekend about ₹4,085. This recommendation expired and was never pushed to the channel.', 'expired', '2026-09-09', 'Hermes pricing run', '{"weekday":3550,"weekend":4085,"pushed":false}'),
  ('Kuber Vatika', 'booking-policy', 'policy', 'Booking payment and cancellation', 'Advance payment only; never Pay at Hotel. Bookings are non-refundable; use the strictest cancellation tier available on the platform.', 'verified', '2026-09-09', 'Hermes/OpenClaw owner policy', '{}'),
  ('Kuber Vatika', 'airbnb-settings', 'channel_policy', 'Airbnb settings', 'Maximum 12 guests; Request to Book (Instant Book off). The listing is independent/non-Zoella; whether to unlist it remains undecided.', 'needs_verification', '2026-09-09', 'Hermes/OpenClaw Airbnb record', '{"listingId":"45856170","maxGuests":12,"instantBook":false}'),
  ('Kuber Vatika', 'airbnb-review-snapshot-20260909', 'review_snapshot', 'Airbnb rating snapshot', '4.0 stars from 3 reviews. Aggregate snapshot only; individual reviews were not available and were not invented.', 'historical', '2026-09-09', 'Hermes/OpenClaw public listing audit', '{"rating":4.0,"reviewCount":3}'),
  ('Kuber Vatika', 'pricing-snapshot-20260909', 'pricing_snapshot', 'Historical pricing recommendation', 'Weekday ₹25,650; weekend about ₹29,500. This recommendation expired and was never pushed to the channel.', 'expired', '2026-09-09', 'Hermes pricing run', '{"weekday":25650,"weekend":29500,"pushed":false}')
) AS f(property_name, fact_key, category, label, value, status, observed_at, source, metadata)
  ON p.name = f.property_name
WHERE p.deleted_at IS NULL
ON CONFLICT(property_id, fact_key) DO UPDATE SET
  category = excluded.category,
  label = excluded.label,
  value = excluded.value,
  status = excluded.status,
  observed_at = excluded.observed_at,
  source = excluded.source,
  metadata = excluded.metadata;

COMMIT;

-- NOTE (2026-09-16): Data rows for unresolved verification tickets and property facts
-- (guest names, rates, listing IDs) are intentionally NOT committed to this public
-- repository. They are archived in the Zoella Stays vault:
--   Zoella/2026-09-15-hermes-reconciliation-pending-tickets.sql
-- and are applied directly to the database when verified. Zoella-stays branch policy.
