"use client";
import React, { useRef, useState } from "react";
import { UploadCloud, Video, Image as ImageIcon, Trash2, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { useMediaAssets, socialKeys } from "../hooks/useSocialPosts";
import { useQueryClient } from "@tanstack/react-query";

type FilterType = "all" | "image" | "video";

export function MediaLibrary() {
  const { data: assets = [], isLoading } = useMediaAssets();
  const [filter, setFilter] = useState<FilterType>("all");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const supabase = createClient();

  const filtered = filter === "all" ? assets : assets.filter((a: any) => a.type === filter);

  const handleUpload = async (file: File) => {
    setIsUploading(true);
    try {
      const { data: business } = await supabase.from("businesses").select("id").limit(1).single();
      if (!business) throw new Error("No business found");

      const fileName = `${business.id}/social/library/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.\-_]/g, "")}`;
      const { error: uploadError } = await supabase.storage.from("business_media").upload(fileName, file, { contentType: file.type });
      if (uploadError) throw uploadError;
      const { data: publicUrlData } = supabase.storage.from("business_media").getPublicUrl(fileName);

      const isVideo = file.type.startsWith("video/");
      await supabase.from("media_assets").insert({
        business_id: business.id,
        type: isVideo ? "video" : "image",
        source: "uploaded",
        bucket: "business_media",
        storage_path: fileName,
        mime_type: file.type,
        size_bytes: file.size,
        metadata: { publicUrl: publicUrlData.publicUrl },
      });

      queryClient.invalidateQueries({ queryKey: socialKeys.mediaAssets() });
    } catch (e) {
      console.error(e);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string, storagePath: string) => {
    await supabase.storage.from("business_media").remove([storagePath]);
    await supabase.from("media_assets").delete().eq("id", id);
    queryClient.invalidateQueries({ queryKey: socialKeys.mediaAssets() });
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-text">Media Library</h2>
          <p className="text-sm text-muted mt-1">Every asset generated or uploaded — reusable across any post.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1 bg-surface rounded-lg p-1">
            {(["all", "image", "video"] as FilterType[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-md text-xs font-bold capitalize transition-colors ${filter === f ? "bg-background text-primary shadow-sm" : "text-muted"}`}
              >
                {f}
              </button>
            ))}
          </div>
          <input
            type="file"
            accept="image/*,video/*"
            ref={fileInputRef}
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
          />
          <Button onClick={() => fileInputRef.current?.click()} disabled={isUploading} icon={<UploadCloud className="w-4 h-4" />}>
            {isUploading ? "Uploading..." : "Upload"}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="aspect-square rounded-2xl bg-surface animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-24 text-muted border border-default rounded-2xl border-dashed">
          No media yet — generate a post or upload something to get started.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((asset: any) => (
            <div key={asset.id} className="group relative bg-background border border-default/60 rounded-2xl overflow-hidden shadow-sm">
              <div className="aspect-square bg-surface flex items-center justify-center overflow-hidden">
                {asset.type === "video" ? (
                  <video src={asset.metadata?.publicUrl} className="w-full h-full object-cover" muted preload="metadata" />
                ) : asset.metadata?.publicUrl ? (
                  <img src={asset.metadata.publicUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="w-8 h-8 text-muted" />
                )}
              </div>
              <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded-full">
                {asset.source === "ai_generated" ? <Sparkles className="w-3 h-3" /> : asset.type === "video" ? <Video className="w-3 h-3" /> : <ImageIcon className="w-3 h-3" />}
                {asset.source === "ai_generated" ? "AI" : "Uploaded"}
              </div>
              <button
                onClick={() => handleDelete(asset.id, asset.storage_path)}
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 bg-black/60 backdrop-blur-sm text-white rounded-full hover:bg-danger"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
