-- Adds a `category` field to each businesses.services[] entry so AI
-- generation prompts can key off it directly instead of re-deriving a
-- category from the service's `name` string every time (fragile against
-- a rename). Backfills the 6 known live services; a service added later
-- with no category set just falls back to name-matching, same as today.
UPDATE businesses
SET services = (
  SELECT jsonb_agg(
    CASE lower(s->>'name')
      WHEN 'hair transplant' THEN s || jsonb_build_object('category', 'HAIR')
      WHEN 'dental treatment' THEN s || jsonb_build_object('category', 'DENTAL')
      WHEN 'cosmetic surgery' THEN s || jsonb_build_object('category', 'COSMETIC')
      WHEN 'eye treatment' THEN s || jsonb_build_object('category', 'EYE')
      WHEN 'ivf fertility' THEN s || jsonb_build_object('category', 'IVF')
      WHEN 'thermal wellness' THEN s || jsonb_build_object('category', 'WELLNESS')
      ELSE s
    END
  )
  FROM jsonb_array_elements(services) AS s
)
WHERE services IS NOT NULL AND jsonb_array_length(services) > 0;
