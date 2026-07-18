/**
 * Fixed character reference photos, ported directly from the proven
 * legacy n8n video pipelines (toga Video Ads Creation.json, Toga Social
 * media video creation.json) — both locked every scene's generated image
 * to one real photo via Kie's image-to-image conditioning, which is what
 * actually kept a video's character (and, as a side effect, its render
 * style) consistent scene to scene. Our pipeline previously dropped this
 * step and generated each scene as an independent text-to-image call,
 * which is why the subject and style could drift mid-video.
 *
 * These are the exact same URLs the legacy workflows used in production —
 * not new assets. The male/female "character" input still only selects
 * the ElevenLabs narration voice, matching how the legacy workflows
 * actually behaved (the reference photo never varied by that field).
 */
export const META_ADS_CHARACTER_REFERENCE = "https://res.cloudinary.com/dvy5tjpah/image/upload/v1770276029/burak_ickpui.jpg";
export const SOCIAL_CHARACTER_REFERENCE = "https://res.cloudinary.com/dvy5tjpah/image/upload/v1772205087/b5a53b65-358c-4eb7-aeb6-b075ef86e81c_1_a8bdy4.jpg";
