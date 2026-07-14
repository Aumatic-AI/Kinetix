"use client";
import React, { useState, useRef } from "react";
import { X, Video, Image as ImageIcon, Music, Mic, Sparkles, Send, Tag, Monitor, User, Mic2, UploadCloud, File, Trash2, CheckCircle2, Wand2, MessageSquare, Clock, Globe } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/Button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import VoiceExplorerModal from "./VoiceExplorerModal";
import { createClient } from "@/lib/supabase/client";
import { useCreateMetaAdCreative } from "../hooks/useMetaAds";

const VOICE_OPTIONS = {
  male: [
    { id: "KLoLpdGWK7agg0O2TJYg", label: "Charlie - Men" },
    { id: "eqz5FuihuZwmJPuvZ65E", label: "Jess - Men" }
  ],
  female: [
    { id: "wrxvN1LZJIfL3HHvffqe", label: "Bella - Lady" },
    { id: "odyUrTN5HMVKujvVAgWW", label: "Emily - Lady" },
    { id: "aD6riP1btT197c6dACmy", label: "Rachel - Lady" },
    { id: "KClAuq9Hs0wFY7oJmaGN", label: "Maayan - Lady" }
  ]
};

export function CreateAdModal({ isOpen, onClose, onSuccess }: { isOpen: boolean; onClose: () => void; onSuccess?: () => void }) {
  // Tabs state
  const [activeTab, setActiveTab] = useState("generate");

  // AI Generate state
  const [type, setType] = useState("video");
  const [duration, setDuration] = useState("28 seconds");
  const [audioStyle, setAudioStyle] = useState("Background Music");
  const [character, setCharacter] = useState<"male"|"female">("male");
  const [voiceId, setVoiceId] = useState(VOICE_OPTIONS.male[0].id);
  const [voiceLabel, setVoiceLabel] = useState(VOICE_OPTIONS.male[0].label);
  const [videoStyle, setVideoStyle] = useState("Bold & Colorful");
  const [language, setLanguage] = useState("English");
  const [idea, setIdea] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);

  // Upload state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();
  const createMutation = useCreateMetaAdCreative();

  // Handlers
  const handleGenerateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const endpoint = type === "video" ? "/api/meta-ads/generate/video" : "/api/meta-ads/generate/image";
      const payload = type === "video" 
        ? { duration, audioStyle, character, voiceId, videoStyle, language, ideaPrompt: idea }
        : { ideaPrompt: idea };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (response.ok) {
        if (onSuccess) onSuccess();
        onClose();
        setIdea("");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadFile(e.target.files[0]);
      setUploadError("");
      setUploadSuccess(false);
    }
  };

  const handleUploadSubmit = async () => {
    if (!uploadFile) return;
    setIsUploading(true);
    setUploadError("");
    try {
      const { data: brandData } = await supabase.from("brands").select("id").limit(1).single();
      const brandId = brandData?.id;
      if (!brandId) throw new Error("No brand found");

      const fileName = `${brandId}/meta-ads/uploads/${Date.now()}_${uploadFile.name.replace(/[^a-zA-Z0-9.\-_]/g, '')}`;
      
      const { data: storageData, error: storageError } = await supabase.storage
        .from("brand_media")
        .upload(fileName, uploadFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (storageError) throw new Error(storageError.message);

      const { data: publicUrlData } = supabase.storage
        .from("brand_media")
        .getPublicUrl(fileName);

      const isVideo = uploadFile.type.startsWith("video/");

      await createMutation.mutateAsync({
        brand_id: brandId,
        type: isVideo ? "video" : "image",
        media_urls: [publicUrlData.publicUrl],
        status: "approved", // Automatically approve direct uploads
        duration: isVideo ? "Custom" : undefined,
        idea_prompt: "Custom Upload",
      });

      setUploadSuccess(true);
      if (onSuccess) onSuccess();
      setTimeout(() => {
        onClose();
        setUploadFile(null);
        setUploadSuccess(false);
      }, 1500);
    } catch (err: any) {
      console.error(err);
      setUploadError(err.message || "Failed to upload file.");
    } finally {
      setIsUploading(false);
    }
  };

  const Label = ({ children, icon: Icon }: any) => (
    <label className="flex items-center gap-1.5 text-sm font-bold text-text mb-2">
      {Icon && <Icon className="w-4 h-4 text-muted" />}
      {children}
    </label>
  );

  return (
    <>
      <Dialog 
        open={isOpen} 
        onOpenChange={(open, event, reason) => { 
          // Base UI passes reason as 3rd arg. If it's a click outside, ignore it to fix the dropdown bug.
          if (reason === 'backdropClick') return;
          if (!open) { setIdea(""); onClose(); } 
        }}
      >
        <DialogContent 
          className="max-w-5xl sm:max-w-5xl md:max-w-5xl bg-background border-border text-text p-0 sm:rounded-xl gap-0 overflow-hidden outline-none flex flex-col h-[85vh] shadow-lg"
        >
          
          <DialogHeader className="pl-8 pr-20 py-6 border-b border-border shrink-0 bg-surface flex flex-row items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary-subtle rounded-lg text-primary">
                {activeTab === "generate" ? <Sparkles className="w-6 h-6" /> : <UploadCloud className="w-6 h-6" />}
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold text-text tracking-tight">
                  {activeTab === "generate" ? "Create New Ad" : "Upload Media"}
                </DialogTitle>
                <DialogDescription className="text-sm text-muted mt-1">
                  {activeTab === "generate" ? "Generate highly engaging ads with AI." : "Upload your finalized video or image assets directly."}
                </DialogDescription>
              </div>
            </div>
            <Button 
              variant="outline" 
              onClick={() => setActiveTab(activeTab === "generate" ? "upload" : "generate")}
              className="rounded-lg font-semibold bg-background shadow-sm hover:bg-surface shrink-0"
              icon={activeTab === "generate" ? <UploadCloud className="w-4 h-4" /> : <Wand2 className="w-4 h-4" />}
            >
              {activeTab === "generate" ? "Direct Upload" : "AI Generation"}
            </Button>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto bg-background">
            {activeTab === "generate" ? (
              <div className="p-8 space-y-6 outline-none">
              
              {/* Format Selection */}
              <section>
                <Label className="mb-2 block text-sm font-semibold">Format</Label>
                <div className="flex items-center gap-2">
                  <button 
                    type="button"
                    onClick={() => setType("video")}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg transition-all border",
                      type === "video" 
                        ? "bg-primary text-white border-primary shadow-sm" 
                        : "border-transparent text-muted hover:bg-surface"
                    )}
                  >
                    <Video className="w-4 h-4 shrink-0" /> Video Ad
                  </button>
                  <button 
                    type="button"
                    onClick={() => setType("image")}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg transition-all border",
                      type === "image" 
                        ? "bg-primary text-white border-primary shadow-sm" 
                        : "border-transparent text-muted hover:bg-surface"
                    )}
                  >
                    <ImageIcon className="w-4 h-4 shrink-0" /> Static Image
                  </button>
                </div>
              </section>

              {type === "video" && (
                <div className="bg-surface p-6 rounded-xl border border-default grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="mb-2 block text-sm font-semibold">Duration</Label>
                    <Select value={duration} onValueChange={setDuration}>
                      <SelectTrigger className="w-full bg-background border-default rounded-lg">
                        <SelectValue placeholder="Select duration" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="20 seconds">20 seconds</SelectItem>
                        <SelectItem value="28 seconds">28 seconds</SelectItem>
                        <SelectItem value="32 seconds">32 seconds</SelectItem>
                        <SelectItem value="36 seconds">36 seconds</SelectItem>
                        <SelectItem value="40 seconds">40 seconds</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="mb-2 block text-sm font-semibold">Audio Style</Label>
                    <Select value={audioStyle} onValueChange={setAudioStyle}>
                      <SelectTrigger className="w-full bg-background border-default rounded-lg">
                        <SelectValue placeholder="Select audio style" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Background Music">Background Music</SelectItem>
                        <SelectItem value="Voiceover">Voiceover</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {audioStyle === "Voiceover" && (
                    <div>
                      <Label className="mb-2 block text-sm font-semibold">Voice</Label>
                      <button
                        type="button"
                        onClick={() => setIsVoiceModalOpen(true)}
                        className="w-full h-9 px-4 flex items-center justify-center gap-2 bg-background border border-dashed border-primary/50 text-primary hover:bg-primary/5 rounded-lg text-sm font-semibold transition-all focus:ring-1 focus:ring-primary/20"
                      >
                        <Mic2 className="w-4 h-4 shrink-0" />
                        <span className="truncate">{voiceLabel !== VOICE_OPTIONS.male[0].label ? voiceLabel : "Select Voice *"}</span>
                      </button>
                    </div>
                  )}

                  <div>
                    <Label className="mb-2 block text-sm font-semibold">Character</Label>
                    <Select value={character} onValueChange={(val) => {
                      const newChar = val as "male" | "female";
                      setCharacter(newChar);
                      setVoiceId(VOICE_OPTIONS[newChar][0].id);
                      setVoiceLabel(VOICE_OPTIONS[newChar][0].label);
                    }}>
                      <SelectTrigger className="w-full bg-background border-default rounded-lg">
                        <SelectValue placeholder="Select character" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="mb-2 block text-sm font-semibold">Visual Style</Label>
                    <Select value={videoStyle} onValueChange={setVideoStyle}>
                      <SelectTrigger className="w-full bg-background border-default rounded-lg">
                        <SelectValue placeholder="Select visual style" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Bold & Colorful">Bold & Colorful</SelectItem>
                        <SelectItem value="Cinematic">Cinematic</SelectItem>
                        <SelectItem value="Minimal & Clean">Minimal & Clean</SelectItem>
                        <SelectItem value="Dark & Moody">Dark & Moody</SelectItem>
                        <SelectItem value="Neon / Glow">Neon / Glow</SelectItem>
                        <SelectItem value="Hand-drawn / Sketch">Hand-drawn / Sketch</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="mb-2 block text-sm font-semibold">Language</Label>
                    <Select value={language} onValueChange={setLanguage}>
                      <SelectTrigger className="w-full bg-background border-default rounded-lg">
                        <SelectValue placeholder="Select language" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="English">English</SelectItem>
                        <SelectItem value="Spanish">Spanish</SelectItem>
                        <SelectItem value="French">French</SelectItem>
                        <SelectItem value="Hebrew">Hebrew</SelectItem>
                        <SelectItem value="Turkish">Turkish</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Story Description */}
              <section>
                <Label className="mb-2 block text-sm font-semibold">SCRIPT<span className="text-red-500">*</span></Label>
                <Textarea
                  value={idea}
                  onChange={(e) => setIdea(e.target.value)}
                  placeholder={type === "video" ? "Describe your video concept, offer, or story angle..." : "Describe your image concept, offer, or visual angle..."}
                  className="!p-4 min-h-[120px]"
                />
              </section>
              </div>
            ) : (
              <div className="flex-1 p-8 m-0 bg-background flex flex-col justify-center min-h-full">
              <div className="max-w-2xl mx-auto w-full">
                <div 
                  onClick={() => !uploadFile && fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-12 flex flex-col items-center justify-center text-center transition-all ${
                    !uploadFile ? "border-border hover:border-primary hover:bg-surface cursor-pointer bg-background" : "border-border bg-surface"
                  }`}
                >
                  <div className="w-20 h-20 bg-primary-subtle rounded-full flex items-center justify-center mb-6 text-primary">
                    <UploadCloud className="w-10 h-10" />
                  </div>
                  <h3 className="text-xl font-bold text-text mb-2">Upload Your Media</h3>
                  <p className="text-sm text-muted mb-8 max-w-md">Bypass AI generation and directly upload your finalized video or image assets into the Approved library.</p>
                  
                  {uploadFile ? (
                    <div className="w-full max-w-sm bg-background border border-border shadow-sm rounded-lg p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4 overflow-hidden">
                        <div className="p-2 bg-primary-subtle text-primary rounded-lg">
                          <File className="w-6 h-6 shrink-0" />
                        </div>
                        <div className="text-left overflow-hidden">
                          <p className="text-sm font-semibold text-text truncate w-[180px]">{uploadFile.name}</p>
                          <p className="text-xs text-muted font-medium">{(uploadFile.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                      </div>
                      <button 
                        type="button" 
                        onClick={(e) => { e.stopPropagation(); setUploadFile(null); }}
                        disabled={isUploading}
                        className="p-2 text-muted hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3 w-full max-w-xs">
                      <input 
                        type="file" 
                        accept="video/mp4,video/quicktime,image/jpeg,image/png,image/webp"
                        className="hidden" 
                        ref={fileInputRef}
                        onChange={handleFileChange}
                      />
                      <Button onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }} className="w-full rounded-lg py-3 font-semibold">
                        Choose File
                      </Button>
                      <span className="text-xs font-semibold text-muted tracking-wide uppercase mt-1">MP4, MOV, JPG, PNG (Max 50MB)</span>
                    </div>
                  )}

                  {uploadError && (
                    <div className="w-full max-w-sm mt-6 p-4 bg-danger-bg border border-danger-border text-danger text-sm font-medium rounded-lg text-left flex items-start gap-3">
                      <X className="w-5 h-5 shrink-0" />
                      {uploadError}
                    </div>
                  )}
                  {uploadSuccess && (
                    <div className="w-full max-w-sm mt-6 p-4 bg-success-bg border border-success-border text-success text-sm font-medium rounded-lg text-left flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 shrink-0" /> 
                      Media uploaded successfully!
                    </div>
                  )}
                </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="px-8 py-5 border-t border-border bg-surface flex flex-row justify-end gap-4 shrink-0">
            <Button variant="outline" onClick={onClose} className="px-6 rounded-lg font-semibold">
              Cancel
            </Button>
            {activeTab === "generate" ? (
              <Button
                onClick={handleGenerateSubmit}
                disabled={isSubmitting || !idea.trim()}
                className="px-8 rounded-lg font-bold shadow-md"
                icon={isSubmitting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send className="w-5 h-5" />}
              >
                {isSubmitting ? "Generating..." : "Generate Creative"}
              </Button>
            ) : (
              <Button
                onClick={handleUploadSubmit}
                disabled={!uploadFile || isUploading}
                className="px-8 rounded-lg font-bold shadow-md"
                icon={isUploading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <UploadCloud className="w-5 h-5" />}
              >
                {isUploading ? "Uploading..." : "Upload Media"}
              </Button>
            )}
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
