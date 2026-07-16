"use client";
import React, { useState, useRef } from "react";
import { ImageIcon, Video, Sparkles, UploadCloud, Send, Mic2, File, Trash2, X, RectangleHorizontal, RectangleVertical } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/Button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import VoiceExplorerModal from "@/modules/meta-ads/components/VoiceExplorerModal";

const VOICE_OPTIONS = {
  male: [
    { id: "KLoLpdGWK7agg0O2TJYg", label: "Charlie - Men" },
    { id: "eqz5FuihuZwmJPuvZ65E", label: "Jess - Men" },
  ],
  female: [
    { id: "wrxvN1LZJIfL3HHvffqe", label: "Bella - Lady" },
    { id: "odyUrTN5HMVKujvVAgWW", label: "Emily - Lady" },
    { id: "aD6riP1btT197c6dACmy", label: "Rachel - Lady" },
    { id: "KClAuq9Hs0wFY7oJmaGN", label: "Maayan - Lady" },
  ],
};

// Matches the legacy social dashboard's exact input set.
const SERVICE_OPTIONS = ["Hair Transplant", "Dental Implants", "Rhinoplasty"];
const VIDEO_STYLE_OPTIONS = ["Highly Realistic 4k, real life", "Cinematic Drone - Smooth", "Studio Professional - Clean"];
const LANGUAGE_OPTIONS = ["English", "Spanish", "French", "Hebrew", "Turkish"];
const BACKGROUND_SONG_OPTIONS = [
  "Inspirational - Sunrise Bloom",
  "Warm - Gentle Piano",
  "Uplifting - Soft Strings",
  "Calm - Ambient Pads",
  "Hopeful - Acoustic Guitar",
];

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function CreatePostModal({ isOpen, onClose, onSuccess }: CreatePostModalProps) {
  const [mode, setMode] = useState<"generate" | "upload">("generate");
  const [format, setFormat] = useState<"image" | "video">("image");
  const [idea, setIdea] = useState("");
  const [aspectRatio, setAspectRatio] = useState<"16:9" | "9:16">("9:16");
  const [service, setService] = useState(SERVICE_OPTIONS[0]);
  const [videoStyle, setVideoStyle] = useState(VIDEO_STYLE_OPTIONS[0]);
  const [language, setLanguage] = useState(LANGUAGE_OPTIONS[0]);
  const [backgroundSong, setBackgroundSong] = useState(BACKGROUND_SONG_OPTIONS[0]);
  const [duration, setDuration] = useState(30);
  const [character, setCharacter] = useState<"male" | "female">("male");
  const [voiceId, setVoiceId] = useState(VOICE_OPTIONS.male[0].id);
  const [voiceLabel, setVoiceLabel] = useState(VOICE_OPTIONS.male[0].label);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [isGeneratingIdeas, setIsGeneratingIdeas] = useState(false);
  const [generatedIdeas, setGeneratedIdeas] = useState<{ id: number; angle: string; idea: string }[] | null>(null);
  const [ideaError, setIdeaError] = useState("");

  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setIdea("");
    setUploadFile(null);
    setError("");
    setGeneratedIdeas(null);
    setIdeaError("");
  };

  const handleGenerateIdeas = async () => {
    if (!idea.trim() || isGeneratingIdeas) return;
    setIsGeneratingIdeas(true);
    setIdeaError("");
    try {
      const res = await fetch("/api/social/posts/generate-idea", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ideaPrompt: idea, format, service: format === "video" ? service : undefined }),
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data.ideas) && data.ideas.length > 0) {
        setGeneratedIdeas(data.ideas);
      } else {
        setIdeaError(data.error || "No ideas returned. Try rephrasing your idea.");
      }
    } catch {
      setIdeaError("Failed to generate ideas. Please try again.");
    } finally {
      setIsGeneratingIdeas(false);
    }
  };

  const handleGenerate = async () => {
    if (!idea.trim()) return;
    setIsSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/social/posts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          format,
          ideaPrompt: idea,
          platforms: [],
          aspectRatio: format === "image" ? aspectRatio : undefined,
          duration: format === "video" ? duration : undefined,
          character: format === "video" ? character : undefined,
          voiceId: format === "video" ? voiceId : undefined,
          service: format === "video" ? service : undefined,
          videoStyle: format === "video" ? videoStyle : undefined,
          language: format === "video" ? language : undefined,
          backgroundSong: format === "video" ? backgroundSong : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start generation");
      onSuccess?.();
      onClose();
      reset();
    } catch (e: any) {
      setError(e.message || "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpload = async () => {
    if (!uploadFile) return;
    setIsSubmitting(true);
    setError("");
    try {
      const form = new FormData();
      form.append("file", uploadFile);
      form.append("platforms", JSON.stringify([]));
      if (idea.trim()) form.append("captionIdea", idea);

      const res = await fetch("/api/social/posts/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to upload");
      onSuccess?.();
      onClose();
      reset();
    } catch (e: any) {
      setError(e.message || "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = mode === "generate" ? !!idea.trim() : !!uploadFile;
  const submitLabel = mode === "generate" ? "Generate" : "Upload";

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { onClose(); reset(); } }}>
        <DialogContent className="max-w-3xl bg-background border-border text-text p-0 rounded-2xl gap-0 overflow-hidden outline-none flex flex-col max-h-[88vh]">
          <DialogHeader className="px-7 py-5 border-b border-border shrink-0 bg-surface flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary-subtle rounded-xl text-primary">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-text">Create Post</DialogTitle>
                <DialogDescription className="text-xs text-muted mt-0.5">Create content first, decide where it goes whenever you're ready.</DialogDescription>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMode(mode === "generate" ? "upload" : "generate")}
              className="rounded-lg font-semibold bg-background"
              icon={mode === "generate" ? <UploadCloud className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
            >
              {mode === "generate" ? "Upload instead" : "Generate with AI"}
            </Button>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-7 space-y-6">
            {/* Format */}
            {mode === "generate" && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-muted mb-2">Format</p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setFormat("image")}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg transition-all border",
                      format === "image" ? "bg-primary text-white border-primary shadow-sm" : "border-transparent text-muted hover:bg-surface"
                    )}
                  >
                    <ImageIcon className="w-4 h-4 shrink-0" /> Image
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormat("video")}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg transition-all border",
                      format === "video" ? "bg-primary text-white border-primary shadow-sm" : "border-transparent text-muted hover:bg-surface"
                    )}
                  >
                    <Video className="w-4 h-4 shrink-0" /> Video
                  </button>
                </div>
              </div>
            )}

            {mode === "generate" ? (
              <>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-bold uppercase tracking-wide text-muted">{format === "video" ? "Story Description" : "Image Generation Prompt"}</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleGenerateIdeas}
                      disabled={!idea.trim() || isGeneratingIdeas}
                      className="h-7 px-3 rounded-md text-xs"
                      icon={isGeneratingIdeas ? <div className="w-3.5 h-3.5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    >
                      {isGeneratingIdeas ? "Generating..." : "Generate Ideas"}
                    </Button>
                  </div>
                  <Textarea
                    value={idea}
                    onChange={(e) => { setIdea(e.target.value); if (generatedIdeas) setGeneratedIdeas(null); }}
                    placeholder={format === "video" ? "Describe the story you want told..." : "Describe what the image should show and what it's about..."}
                    className="!p-4 min-h-[110px]"
                  />
                  {ideaError && <p className="text-xs font-medium text-danger mt-2">{ideaError}</p>}
                  {generatedIdeas && generatedIdeas.length > 0 && (
                    <div className="mt-4 flex flex-col gap-2.5 p-4 rounded-xl border border-primary/20 bg-primary-subtle/40">
                      <div className="text-xs font-bold text-primary uppercase tracking-wide">✨ AI Generated Ideas — Click to use</div>
                      <div className="flex flex-col gap-2">
                        {generatedIdeas.map((ideaObj, i) => (
                          <button
                            type="button"
                            key={`${ideaObj.id}-${i}`}
                            onClick={() => { setIdea(ideaObj.idea); setGeneratedIdeas(null); }}
                            className="text-left p-3 rounded-lg border border-default bg-background hover:border-primary hover:bg-primary-subtle/60 transition-all text-sm text-text leading-relaxed"
                          >
                            <span className="block text-[10px] font-bold uppercase tracking-wide text-muted mb-1">{ideaObj.angle.replace(/_/g, " ")}</span>
                            {ideaObj.idea}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {format === "image" && (
                  <div>
                    <p className="text-xs font-semibold text-muted mb-2">Aspect Ratio</p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setAspectRatio("16:9")}
                        className={cn(
                          "flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg transition-all border",
                          aspectRatio === "16:9" ? "bg-primary text-white border-primary shadow-sm" : "border-transparent text-muted hover:bg-surface"
                        )}
                      >
                        <RectangleHorizontal className="w-4 h-4 shrink-0" /> Landscape (16:9)
                      </button>
                      <button
                        type="button"
                        onClick={() => setAspectRatio("9:16")}
                        className={cn(
                          "flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg transition-all border",
                          aspectRatio === "9:16" ? "bg-primary text-white border-primary shadow-sm" : "border-transparent text-muted hover:bg-surface"
                        )}
                      >
                        <RectangleVertical className="w-4 h-4 shrink-0" /> Portrait (9:16)
                      </button>
                    </div>
                  </div>
                )}

                {format === "video" && (
                  <div className="bg-surface p-5 rounded-xl border border-default grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs font-semibold text-muted mb-2">Category</p>
                      <Select value={service} onValueChange={setService}>
                        <SelectTrigger className="w-full bg-background border-default rounded-lg">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SERVICE_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-muted mb-2">Video Style</p>
                      <Select value={videoStyle} onValueChange={setVideoStyle}>
                        <SelectTrigger className="w-full bg-background border-default rounded-lg">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {VIDEO_STYLE_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-muted mb-2">Character</p>
                      <Select
                        value={character}
                        onValueChange={(val) => {
                          const c = val as "male" | "female";
                          setCharacter(c);
                          setVoiceId(VOICE_OPTIONS[c][0].id);
                          setVoiceLabel(VOICE_OPTIONS[c][0].label);
                        }}
                      >
                        <SelectTrigger className="w-full bg-background border-default rounded-lg">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-muted mb-2">Voice</p>
                      <button
                        type="button"
                        onClick={() => setIsVoiceModalOpen(true)}
                        className="w-full h-9 px-3 flex items-center justify-center gap-2 bg-background border border-dashed border-primary/50 text-primary hover:bg-primary/5 rounded-lg text-xs font-semibold transition-all"
                      >
                        <Mic2 className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{voiceLabel}</span>
                      </button>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-muted mb-2">Language</p>
                      <Select value={language} onValueChange={setLanguage}>
                        <SelectTrigger className="w-full bg-background border-default rounded-lg">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {LANGUAGE_OPTIONS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-muted mb-2">Duration</p>
                      <Select value={String(duration)} onValueChange={(v) => setDuration(parseInt(v, 10))}>
                        <SelectTrigger className="w-full bg-background border-default rounded-lg">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[20, 30, 40, 60, 90].map((d) => (
                            <SelectItem key={d} value={String(d)}>{d} seconds</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="md:col-span-3">
                      <p className="text-xs font-semibold text-muted mb-2">Background Song</p>
                      <Select value={backgroundSong} onValueChange={setBackgroundSong}>
                        <SelectTrigger className="w-full bg-background border-default rounded-lg">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {BACKGROUND_SONG_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <p className="text-[11px] text-muted mt-1.5">Saved with the post, but not mixed into the audio yet — we don't have a licensed music library wired up. Ask if you'd like this turned on.</p>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-muted mb-2">Media File</p>
                <div
                  onClick={() => !uploadFile && fileInputRef.current?.click()}
                  className={cn(
                    "border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center transition-all",
                    !uploadFile ? "border-border hover:border-primary hover:bg-surface cursor-pointer" : "border-border bg-surface"
                  )}
                >
                  <input
                    type="file"
                    accept="video/mp4,video/quicktime,image/jpeg,image/png,image/webp"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={(e) => e.target.files?.[0] && setUploadFile(e.target.files[0])}
                  />
                  {uploadFile ? (
                    <div className="w-full max-w-sm bg-background border border-border rounded-lg p-3 flex items-center justify-between">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="p-2 bg-primary-subtle text-primary rounded-lg"><File className="w-5 h-5" /></div>
                        <p className="text-sm font-semibold text-text truncate">{uploadFile.name}</p>
                      </div>
                      <button type="button" onClick={(e) => { e.stopPropagation(); setUploadFile(null); }} className="p-1.5 text-muted hover:text-danger">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <UploadCloud className="w-8 h-8 text-muted mb-2" />
                      <p className="text-sm font-semibold text-text">Click to choose a file</p>
                      <p className="text-xs text-muted mt-1">MP4, MOV, JPG, PNG</p>
                    </>
                  )}
                </div>
                <Textarea
                  value={idea}
                  onChange={(e) => setIdea(e.target.value)}
                  placeholder="Optional — what's this about? (used to write the caption)"
                  className="!p-4 min-h-[70px] mt-4"
                />
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2 text-sm text-danger bg-danger-bg border border-danger-border rounded-lg px-4 py-3">
                <X className="w-4 h-4 shrink-0 mt-0.5" />
                {error}
              </div>
            )}
          </div>

          <DialogFooter className="px-7 py-4 border-t border-border bg-surface flex flex-row justify-end gap-3 shrink-0">
            <Button variant="outline" onClick={() => { onClose(); reset(); }} className="rounded-lg font-semibold">Cancel</Button>
            <Button
              onClick={mode === "generate" ? handleGenerate : handleUpload}
              disabled={!canSubmit || isSubmitting}
              className="px-6 rounded-lg font-bold"
              icon={isSubmitting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send className="w-4 h-4" />}
            >
              {isSubmitting ? "Working..." : submitLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <VoiceExplorerModal
        isOpen={isVoiceModalOpen}
        onOpenChange={setIsVoiceModalOpen}
        selectedVoiceId={voiceId}
        onSelectVoice={(id, label) => {
          setVoiceId(id);
          setVoiceLabel(label);
          setIsVoiceModalOpen(false);
        }}
      />
    </>
  );
}
