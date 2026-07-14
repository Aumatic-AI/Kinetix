import { NextResponse } from "next/server";
import { inngest } from "@/services/inngest/client";

export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const creativeId = searchParams.get("creativeId");

    const body = await req.json();
    
    // Kie AI sends { taskId: '...', state: '...', resultJson: { urls: [...] } }
    const jobId = body.jobId || body.id || body.taskId;
    
    if (!jobId || !creativeId) {
      return NextResponse.json({ error: "Missing jobId, taskId or creativeId" }, { status: 400 });
    }

    // Forward the webhook payload to Inngest so waitForEvent can catch it
    await inngest.send({
      name: "meta-ads/kie-webhook",
      data: {
        creativeId, // Matches the triggering event
        jobId: String(jobId),
        payload: body
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Webhook parse error:", error);
    return NextResponse.json({ error: "Invalid webhook payload" }, { status: 400 });
  }
}
