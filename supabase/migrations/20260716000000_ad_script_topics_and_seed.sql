-- ============================================================
-- Competitor ad analysis rebuild — business-level config
--
-- Adds the one genuinely new column (ad_script_topics, replacing
-- the 5 hardcoded ready_ad_scripts topics in the legacy n8n prompt)
-- and backfills the current business row with what used to be
-- hardcoded Togahh context inside that same prompt. Everything
-- else needed (target_countries, competitor_keywords, industry,
-- core_offerings, business_voice, target_audience, settings) is
-- already live schema — just empty until now.
-- ============================================================

ALTER TABLE businesses
    ADD COLUMN IF NOT EXISTS ad_script_topics JSONB NOT NULL DEFAULT '[]';

UPDATE businesses SET
    target_countries = '["CA", "US"]'::jsonb,
    competitor_keywords = '["hair transplant turkey", "dental implants turkey", "hollywood smile turkey", "all on 4 dental implants", "FUE hair transplant"]'::jsonb,
    industry = 'Medical Tourism',
    core_offerings = 'Dental implants, All-on-4, Hollywood Smile, zirconium crowns, FUE/Sapphire/DHI hair transplants. Save 60-80% vs Canadian/US prices, including VIP transfers, accommodation, and end-to-end patient support.',
    business_voice = 'Warm, professional, trustworthy, aspirational - never fear-mongering, never discount-clinic feel.',
    target_audience = 'Canadians and Americans aged 30-65, price-conscious, quality-aware, open to traveling abroad for care.',
    settings = settings || '{"competitor_scrape": {"only_active": true, "max_ads": 100, "sort": "impressions_desc"}}'::jsonb,
    ad_script_topics = '[
        {"topic": "Dental Implants Savings", "format": "Video Reel - 15 sec"},
        {"topic": "Hair Transplant Transformation", "format": "Image Ad"},
        {"topic": "Hollywood Smile / Full Mouth Restoration", "format": "Carousel Ad - 3 slides"},
        {"topic": "Trust / JCI Hospitals / Doctor Credibility", "format": "Video Reel - 30 sec"},
        {"topic": "Free Consultation / Patient Journey / Safety", "format": "Image Ad"}
    ]'::jsonb
WHERE id = (SELECT id FROM businesses ORDER BY created_at ASC LIMIT 1);
