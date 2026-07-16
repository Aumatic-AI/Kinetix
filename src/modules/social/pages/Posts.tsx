"use client";
import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { CreatePostModal } from "../components/CreatePostModal";
import { PostTile } from "../components/PostTile";
import { PublishFlowModal } from "../components/PublishFlowModal";
import { PostDetailsModal } from "../components/PostDetailsModal";
import { useSocialPosts, useConnections, useRetryPosts, socialKeys } from "../hooks/useSocialPosts";
import { groupPosts, PostGroup, PostRow } from "../lib/postGroups";
import { useQueryClient } from "@tanstack/react-query";

export function Posts() {
  const { data: rows = [], isLoading } = useSocialPosts();
  const { data: connections = [] } = useConnections();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [publishTarget, setPublishTarget] = useState<PostGroup | null>(null);
  const [detailsTarget, setDetailsTarget] = useState<PostGroup | null>(null);
  const queryClient = useQueryClient();
  const retryMutation = useRetryPosts();

  const groups = useMemo(() => groupPosts(rows as PostRow[]), [rows]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: socialKeys.posts() });

  return (
    <div className="space-y-6 pb-10">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-text">Posts</h2>
          <p className="text-sm text-muted mt-1">Create once, publish everywhere your accounts are connected.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} icon={<Plus className="w-4 h-4" />}>
          Create Post
        </Button>
      </div>

      {isLoading ? (
        <div className="columns-2 sm:columns-3 lg:columns-4 xl:columns-5 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="mb-4 break-inside-avoid rounded-2xl bg-surface animate-pulse" style={{ height: 180 + (i % 3) * 60 }} />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <div className="text-center py-24 text-muted border border-default rounded-2xl border-dashed">
          <p className="mb-4">No posts yet — create your first one.</p>
        </div>
      ) : (
        <div className="columns-2 sm:columns-3 lg:columns-4 xl:columns-5 gap-4">
          {groups.map((g) => (
            <PostTile
              key={g.key}
              group={g}
              onPublish={setPublishTarget}
              onViewDetails={setDetailsTarget}
              onRetry={(group) => retryMutation.mutate(group.rows.filter((r) => r.status === "failed").map((r) => r.id))}
            />
          ))}
        </div>
      )}

      <CreatePostModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={invalidate}
      />

      <PublishFlowModal
        group={publishTarget}
        connections={connections}
        onClose={() => setPublishTarget(null)}
        onDone={invalidate}
      />

      <PostDetailsModal group={detailsTarget} onClose={() => setDetailsTarget(null)} />
    </div>
  );
}
