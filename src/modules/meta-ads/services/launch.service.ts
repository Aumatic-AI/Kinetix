/**
 * The one genuinely intricate part of the Meta Ads module — turning a
 * finished Ad Library creative into a real Campaign -> Ad Set -> Creative
 * -> Ad on Meta. Ported from the legacy project's /api/meta/launch route
 * (media upload + video-ready polling, Page resolution, pixel
 * auto-discover/create, DSA fields), cleaned up into named steps instead
 * of one 600-line function. Every new object is created PAUSED — Launch
 * never spends money by itself; going live is a separate, explicit Smart
 * Run/Resume action (see /api/meta-ads/campaigns/status).
 */
import { graphGet, graphPost, graphPostForm } from "@/services/meta/graph-client";
import { env } from "@/config";

export interface UploadedMedia {
  isVideo: boolean;
  videoId?: string;
  imageHash: string;
}

export async function uploadMediaToMeta(mediaUrl: string, isVideo: boolean, accessToken: string, adAccountId: string): Promise<UploadedMedia> {
  if (!mediaUrl.startsWith("http://") && !mediaUrl.startsWith("https://")) {
    throw new Error(`Invalid media URL: ${mediaUrl}`);
  }

  if (!isVideo) {
    const imgRes = await fetch(mediaUrl);
    if (!imgRes.ok) throw new Error(`Failed to fetch image from ${mediaUrl}`);
    const blob = new Blob([await imgRes.arrayBuffer()]);
    const form = new FormData();
    form.append("source", blob, "ad_image.jpg");
    const uploadData = await graphPostForm<{ images?: Record<string, { hash: string }> }>(`act_${adAccountId}/adimages`, accessToken, form);
    const imageHash = uploadData.images?.["ad_image.jpg"]?.hash;
    if (!imageHash) throw new Error("Meta didn't return an image hash for the upload.");
    return { isVideo: false, imageHash };
  }

  const uploadForm = new FormData();
  uploadForm.append("file_url", mediaUrl);
  const uploadData = await graphPostForm<{ id?: string }>(`act_${adAccountId}/advideos`, accessToken, uploadForm);
  const videoId = uploadData.id;
  if (!videoId) throw new Error("Meta didn't return a video id for the upload.");

  let ready = false;
  for (let i = 0; i < 15; i++) {
    await new Promise((resolve) => setTimeout(resolve, 3000));
    try {
      const status = await graphGet<{ status?: { video_status?: string } }>(videoId, accessToken, { fields: "status" });
      if (status.status?.video_status === "ready") {
        ready = true;
        break;
      }
    } catch {
      // keep polling — a transient failure here shouldn't abort the whole launch
    }
  }
  if (!ready) {
    console.warn(`[meta-ads/launch] video ${videoId} still processing after 45s — proceeding anyway`);
  }

  let imageHash: string | null = null;
  try {
    const pic = await graphGet<{ picture?: string }>(videoId, accessToken, { fields: "picture" });
    if (pic.picture) {
      const imgRes = await fetch(pic.picture);
      if (imgRes.ok) {
        const blob = new Blob([await imgRes.arrayBuffer()], { type: "image/jpeg" });
        const thumbForm = new FormData();
        thumbForm.append("source", blob, "video_thumb.jpg");
        const thumbUpload = await graphPostForm<{ images?: Record<string, { hash: string }> }>(`act_${adAccountId}/adimages`, accessToken, thumbForm);
        imageHash = thumbUpload.images?.["video_thumb.jpg"]?.hash || null;
      }
    }
  } catch {
    // handled by the null check below
  }
  if (!imageHash) {
    throw new Error("Couldn't generate a thumbnail for the video yet — Meta may still be processing it. Wait a moment and try launching again.");
  }

  return { isVideo: true, videoId, imageHash };
}

export async function resolvePageId(accessToken: string): Promise<string> {
  const configured = env.META_PAGE_ID;
  if (configured) return configured;
  const pages = await graphGet<{ data?: { id: string }[] }>("me/accounts", accessToken);
  if (!pages.data?.length) {
    throw new Error("No Facebook Page is linked to this access token. Meta requires a Page to create ad creatives — link one in Business Manager first.");
  }
  return pages.data[0].id;
}

export async function fetchExistingCampaignInfo(externalCampaignId: string, accessToken: string): Promise<{ objective: string; isCbo: boolean }> {
  const data = await graphGet<{ objective?: string; daily_budget?: string; lifetime_budget?: string }>(externalCampaignId, accessToken, {
    fields: "objective,daily_budget,lifetime_budget",
  });
  const hasCampaignBudget = !!(parseInt(data.daily_budget || "0", 10) || parseInt(data.lifetime_budget || "0", 10));
  return { objective: data.objective || "OUTCOME_TRAFFIC", isCbo: hasCampaignBudget };
}

export async function getOrCreatePixelId(accessToken: string, adAccountId: string): Promise<string> {
  const existing = await graphGet<{ data?: { id: string }[] }>(`act_${adAccountId}/adspixels`, accessToken);
  if (existing.data?.length) return existing.data[0].id;

  const created = await graphPost<{ id?: string }>(`act_${adAccountId}/adspixels`, accessToken, { name: "Kinetix Ads Pixel" });
  if (!created.id) {
    throw new Error(
      "This objective needs a tracking pixel and none could be found or created automatically. Create one in Meta Events Manager and assign it to this ad account, or switch the objective to Traffic, which doesn't require one."
    );
  }
  return created.id;
}
