import { Sparkles, Lightbulb } from "lucide-react";
import { SectionTitle, ACCENT } from "../competitors/shared";
import { ReportAd, ReportAnalysis } from "../../hooks/useReports";

export function ReportAnalysisPanel({ analysis, ads }: { analysis: ReportAnalysis; ads: ReportAd[] }) {
  const adById = new Map(ads.map((a) => [a.adId, a]));
  const notesWithSuggestions = analysis.ad_notes.filter(
    (n) => n.headline_suggestion || n.body_suggestion || n.budget_suggestion || n.targeting_suggestion
  );

  return (
    <div className="space-y-4">
      <div className="bg-primary-subtle border border-primary/20 rounded-2xl p-5">
        <SectionTitle icon={Sparkles} title="AI Overview" accent={ACCENT.purple} />
        <p className="text-sm text-text leading-relaxed">{analysis.ai_overview}</p>
        {analysis.key_insights.length > 0 && (
          <ul className="mt-3 space-y-1.5">
            {analysis.key_insights.map((insight, i) => (
              <li key={i} className="text-xs text-muted flex gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>{insight}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-4 text-sm font-semibold text-text border-t border-primary/20 pt-3">{analysis.overall_recommendation}</p>
      </div>

      {notesWithSuggestions.length > 0 && (
        <div className="space-y-3">
          {notesWithSuggestions.map((note) => {
            const ad = adById.get(note.ad_id);
            return (
              <div key={note.ad_id} className="bg-background border border-default/60 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="w-3.5 h-3.5 text-warning" />
                  <p className="text-sm font-bold text-text">{ad?.adName || note.ad_id}</p>
                </div>
                <p className="text-xs text-muted mb-2">{note.issue}</p>
                <div className="grid sm:grid-cols-2 gap-2 text-xs">
                  {note.headline_suggestion && <p><span className="font-semibold text-text">Headline: </span><span className="text-muted">{note.headline_suggestion}</span></p>}
                  {note.body_suggestion && <p><span className="font-semibold text-text">Body: </span><span className="text-muted">{note.body_suggestion}</span></p>}
                  {note.budget_suggestion && <p><span className="font-semibold text-text">Budget: </span><span className="text-muted">{note.budget_suggestion}</span></p>}
                  {note.targeting_suggestion && <p><span className="font-semibold text-text">Targeting: </span><span className="text-muted">{note.targeting_suggestion}</span></p>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
