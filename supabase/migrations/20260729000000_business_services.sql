-- Client-configurable list of services the business offers — was hardcoded
-- (inconsistently) in multiple UI dropdowns across Outreach, Meta Ads, and
-- Social. Single source of truth now; fetched once into the business store
-- on app load rather than re-typed per module.

ALTER TABLE businesses ADD COLUMN IF NOT EXISTS services TEXT[] NOT NULL DEFAULT '{}';

-- Backfill with the real service list (confirmed against the legacy
-- Outreach app's campaign form service_type enum — the most complete,
-- authoritative list of what this business actually offers).
UPDATE businesses
SET services = ARRAY['Hair Transplant', 'Dental Treatment', 'Cosmetic Surgery', 'Eye Treatment', 'IVF Fertility', 'Thermal Wellness']
WHERE services = '{}';
