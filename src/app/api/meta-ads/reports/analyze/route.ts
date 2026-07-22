import { NextResponse } from "next/server";
import { aiOrchestrator } from "@/services/ai/orchestrator";
import { getReportAnalysisPrompt, ReportAdInput } from "@/prompts/meta-ads";

/**
 * On-demand only — never called automatically on page load. One GPT call
 * analyzes every ad currently on screen at once (not one call per ad), so
 * clicking "Analyze" a hundred times a day is the only way to spend
 * anything here, and even then it's a single call each time.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { ads: ReportAdInput[]; summary: { totalSpend: number; totalImpressions: number; totalClicks: number; avgCtr: number; avgCpm: number } };
    if (!Array.isArray(body.ads) || body.ads.length === 0) {
      return NextResponse.json({ error: "No ads to analyze" }, { status: 400 });
    }

    const prompt = getReportAnalysisPrompt(body.ads, body.summary);
    const responseText = (await aiOrchestrator.executeTask("analysis", prompt, "openai")) as string;
    const jsonStr = responseText.replace(/```json\n?|\n?```/g, "").trim();
    const parsed = JSON.parse(jsonStr);

    return NextResponse.json({ success: true, ...parsed });
  } catch (error: any) {
    console.error("[META_ADS_REPORTS_ANALYZE]", error);
    return NextResponse.json({ error: error.message || "Failed to analyze reports" }, { status: 500 });
  }
}
