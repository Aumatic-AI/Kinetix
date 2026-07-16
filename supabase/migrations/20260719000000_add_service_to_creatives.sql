-- ============================================================
-- Ad creatives now capture which service the ad is for (Hair
-- Transplant / Dental Implants / Rhinoplasty), selected explicitly
-- in Create Ad rather than inferred from free-text. This directly
-- drives the category-specific vocabulary/rules already built into
-- the generation prompts (src/services/ai/prompts/meta-ads.ts),
-- instead of relying on keyword-sniffing the idea text.
-- ============================================================

ALTER TABLE meta_ad_creatives
    ADD COLUMN IF NOT EXISTS service TEXT;

ALTER TABLE meta_ad_creatives
    ADD CONSTRAINT chk_meta_ad_creatives_service
    CHECK (service IS NULL OR service IN ('Hair Transplant', 'Dental Implants', 'Rhinoplasty'));
