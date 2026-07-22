"use client";
import { useState } from "react";
import { RotateCcw, Check, Send, Pencil, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/textarea";
import { EmailPreview } from "./EmailPreview";
import {
  useRegenerateOutreachCampaign,
  useEditOutreachCampaignContent,
  useApproveOutreachCampaign,
  useSendOutreachCampaign,
} from "../../hooks/useOutreachCampaigns";
import { OutreachCampaign } from "../../types/outreach.types";

/** Shared draft/review UI for a single campaign — used both by the
 * create-a-campaign flow (right after generating) and by reopening an
 * existing draft/campaign from the Campaigns list. */
export function CampaignDraftPanel({ campaign, onSendStarted }: { campaign: OutreachCampaign; onSendStarted?: () => void }) {
  const [editing, setEditing] = useState(false);
  const [editSubject, setEditSubject] = useState("");
  const [editBody, setEditBody] = useState("");
  const [feedback, setFeedback] = useState("");
  const [sendClicked, setSendClicked] = useState(false);

  const regenerate = useRegenerateOutreachCampaign();
  const saveEdit = useEditOutreachCampaignContent();
  const approve = useApproveOutreachCampaign();
  const sendCampaign = useSendOutreachCampaign();

  const handleSend = () => {
    setSendClicked(true);
    onSendStarted?.();
    sendCampaign.mutate({ id: campaign.id });
  };

  const handleRegenerate = async () => {
    if (!feedback.trim()) return;
    await regenerate.mutateAsync({ campaignId: campaign.id, feedback: feedback.trim() });
    setFeedback("");
  };

  const startEditing = () => {
    if (!campaign.generated_body) return;
    setEditSubject(campaign.generated_body.subject);
    setEditBody(campaign.generated_body.body);
    setEditing(true);
  };

  const saveEdits = async () => {
    await saveEdit.mutateAsync({ campaignId: campaign.id, subject: editSubject, body: editBody });
    setEditing(false);
  };

  return (
    <div className="bg-background border border-primary/30 rounded-xl p-5 space-y-4">
      {editing ? (
        <div className="space-y-2">
          <label className="text-xs font-bold text-muted uppercase tracking-wide">Subject</label>
          <Input value={editSubject} onChange={(e) => setEditSubject(e.target.value)} />
          <label className="text-xs font-bold text-muted uppercase tracking-wide">Body</label>
          <Textarea value={editBody} onChange={(e) => setEditBody(e.target.value)} rows={8} />
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setEditing(false)}>Discard changes</Button>
            <Button size="sm" onClick={saveEdits} loading={saveEdit.isPending} icon={<Check className="w-3.5 h-3.5" />}>Save edits</Button>
          </div>
        </div>
      ) : (
        campaign.generated_body && (
          <EmailPreview
            subject={campaign.generated_body.subject}
            body={campaign.generated_body.body}
            ctaText={campaign.cta_text}
            ctaLink={campaign.cta_link}
            headerAction={
              campaign.status === "draft" && (
                <Button size="sm" variant="outline" onClick={startEditing} icon={<Pencil className="w-3.5 h-3.5" />}>Edit</Button>
              )
            }
          />
        )
      )}

      {campaign.status === "draft" && !editing && (
        <div className="space-y-4">
          <Textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} rows={2} placeholder="Ask the AI for changes (optional)" />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={handleRegenerate} loading={regenerate.isPending} disabled={!feedback.trim()} icon={<RotateCcw className="w-3.5 h-3.5" />}>Regenerate</Button>
            <Button onClick={() => approve.mutate(campaign.id)} loading={approve.isPending} icon={<Check className="w-4 h-4" />}>Approve</Button>
          </div>
        </div>
      )}

      {campaign.status === "active" && !campaign.external_campaign_id && (
        sendClicked ? (
          <div className="flex items-center gap-2 text-sm font-medium text-muted">
            <Loader2 className="w-4 h-4 animate-spin" /> Sending — this can take a minute, the page will update automatically.
          </div>
        ) : (
          <Button onClick={handleSend} loading={sendCampaign.isPending} icon={<Send className="w-4 h-4" />}>Start Sending</Button>
        )
      )}
      {campaign.status === "completed" && !campaign.external_campaign_id && (
        <p className="text-sm text-muted">No eligible leads were found to send to — everyone in this list is suppressed, already contacted, or the list is empty.</p>
      )}
      {campaign.external_campaign_id && <p className="text-sm font-semibold text-success">Sent</p>}
    </div>
  );
}
