-- ============================================================
-- Ad generation prompts (image/video/idea) need the customer
-- pain points a business's ads should speak to. Every other field
-- the proven n8n prompts reference already has a home on
-- businesses (core_offerings, business_voice, target_audience,
-- industry) — this is the one genuinely missing field.
-- ============================================================

ALTER TABLE businesses
    ADD COLUMN IF NOT EXISTS pain_points TEXT;

UPDATE businesses SET
    pain_points = 'High cost of dental/hair procedures at home, long wait times for consultations and treatment, fear of low-quality or unlicensed clinics abroad, anxiety about travelling alone for a medical procedure, uncertainty about total all-in cost (hidden fees), self-consciousness about appearance (missing teeth, hair loss) affecting confidence.'
WHERE id = (SELECT id FROM businesses ORDER BY created_at ASC LIMIT 1);
