import { Platform } from "./platforms";

export interface PostRow {
  id: string;
  status: string;
  format: string | null;
  idea_prompt: string | null;
  caption: string | null;
  media_asset_id: string | null;
  error_message: string | null;
  created_at: string;
  published_at: string | null;
  platform_connections: { platform: Platform; display_name: string | null; metadata: any } | null;
  media_assets: { type: string; metadata: any } | null;
}

export interface PostGroup {
  key: string;
  createdAt: string;
  format: string;
  ideaPrompt: string | null;
  thumbnailUrl: string | null;
  mediaType: string | null;
  mediaAssetId: string | null;
  rows: PostRow[];
}

export function groupPosts(rows: PostRow[]): PostGroup[] {
  const groups = new Map<string, PostGroup>();
  for (const row of rows) {
    const key = row.media_asset_id || `${row.created_at}|${row.idea_prompt}`;
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        createdAt: row.created_at,
        format: row.format || "image",
        ideaPrompt: row.idea_prompt,
        thumbnailUrl: row.media_assets?.metadata?.publicUrl || null,
        mediaType: row.media_assets?.type || null,
        mediaAssetId: row.media_asset_id,
        rows: [],
      });
    }
    groups.get(key)!.rows.push(row);
  }
  return [...groups.values()].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export type GroupState = "generating" | "failed" | "draft" | "published";

/** Priority: an in-flight generation always wins, then anything broken
 * needs attention, then anything still unposted, and only once every row
 * is actually live do we call the whole group "published". */
export function groupState(group: PostGroup): GroupState {
  if (group.rows.some((r) => r.status === "generating")) return "generating";
  if (group.rows.some((r) => r.status === "failed")) return "failed";
  if (group.rows.some((r) => r.status === "draft")) return "draft";
  return "published";
}
