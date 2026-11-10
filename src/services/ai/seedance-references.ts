import sharp from "sharp";

/**
 * Seedance 2.5 only takes reference images 300–6000 px a side and between
 * 0.4 and 2.5 wide to tall, so every reference (the character photo, the
 * logo) is redrawn to fit: a very wide or tall image (a logo strip) is padded
 * onto a white square, anything else is scaled to 1280 px on its long side.
 * The fitted copies go to Supabase storage, since Kie fetches them by URL.
 */
export interface ReferenceImage {
  url: string;
  /** What this image is, for the prompt ("the main character", "the logo") */
  what: string;
  /** Sent to Seedance only when the prompt writer uses it (the brand image) */
  optional?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fitSeedanceReferences(supabase: any, folder: string, images: ReferenceImage[]): Promise<ReferenceImage[]> {
  const fitted: ReferenceImage[] = [];
  for (const [i, image] of images.entries()) {
    try {
      const res = await fetch(image.url);
      if (!res.ok) throw new Error(`status ${res.status}`);
      const source = sharp(Buffer.from(await res.arrayBuffer())).rotate();
      const { width = 1, height = 1 } = await source.metadata();
      const ratio = width / height;
      const resized = ratio < 0.45 || ratio > 2.2 ? source.resize(1280, 1280, { fit: "contain", background: "#ffffff" }) : source.resize(1280, 1280, { fit: "inside" });
      const jpg = await resized.flatten({ background: "#ffffff" }).jpeg({ quality: 90 }).toBuffer();

      const path = `${folder}/ref-${i + 1}.jpg`;
      const { error } = await supabase.storage.from("business_media").upload(path, jpg, { contentType: "image/jpeg", upsert: true });
      if (error) throw new Error(error.message);
      fitted.push({ ...image, url: supabase.storage.from("business_media").getPublicUrl(path).data.publicUrl });
    } catch (e) {
      // A missing reference doesn't stop the video: the prompt then describes that part in words
      console.error(`[SEEDANCE_REFERENCES] Skipped ${image.what} (${image.url}): ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return fitted;
}
