"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/textarea";

export default function SettingsWorkspacePage() {
  const [countries, setCountries] = useState("CA, US");
  const [keywords, setKeywords] = useState("hair transplant turkey, dental implants turkey");
  const [industry, setIndustry] = useState("Medical Tourism");
  const [brandVoice, setBrandVoice] = useState("Warm, professional, trustworthy — never fear-mongering.");
  const [coreOfferings, setCoreOfferings] = useState("Save 60-80% vs Canadian prices");
  
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = () => {
    setIsSaving(true);
    // TODO: Wire to Supabase API
    setTimeout(() => setIsSaving(false), 800);
  };

  return (
    <div className="max-w-4xl space-y-8 pb-10">
      <div>
        <h1 className="text-2xl font-bold text-text">Workspace Settings</h1>
        <p className="text-sm text-text/60 mt-1">Configure your brand and competitive intelligence parameters.</p>
      </div>

      <div className="bg-surface border border-border rounded-xl p-6 space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-text">Brand Identity</h2>
          <p className="text-sm text-text/60">This context will be injected into all AI generations.</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-text mb-1 block">Industry / Niche</label>
            <Input 
              value={industry} 
              onChange={(e) => setIndustry(e.target.value)} 
              placeholder="e.g. Medical Tourism"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-text mb-1 block">Core Offerings</label>
            <Input 
              value={coreOfferings} 
              onChange={(e) => setCoreOfferings(e.target.value)} 
              placeholder="e.g. Save 60-80% vs Canadian prices"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-text mb-1 block">Brand Voice Guidelines</label>
            <Textarea 
              value={brandVoice} 
              onChange={(e) => setBrandVoice(e.target.value)} 
              className="min-h-[100px]"
              placeholder="Describe how the AI should write on behalf of your brand."
            />
          </div>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-xl p-6 space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-text">Competitive Intelligence</h2>
          <p className="text-sm text-text/60">Configure parameters for the background Ad Library scraper.</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-text mb-1 block">Target Countries</label>
            <Input 
              value={countries} 
              onChange={(e) => setCountries(e.target.value)} 
              placeholder="Comma separated: CA, US, GB"
            />
            <p className="text-xs text-text/40 mt-1">Country codes for the Apify scraper (e.g. CA, US).</p>
          </div>

          <div>
            <label className="text-sm font-medium text-text mb-1 block">Competitor Search Keywords</label>
            <Textarea 
              value={keywords} 
              onChange={(e) => setKeywords(e.target.value)} 
              className="min-h-[80px]"
              placeholder="Comma separated: hair transplant turkey, dental implants turkey"
            />
            <p className="text-xs text-text/40 mt-1">Keywords the scraper will use to find competitor ads.</p>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
