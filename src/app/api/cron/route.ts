import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { env } from '@/config';

export async function GET(request: NextRequest) {
  // Validate that the request is coming from Vercel Cron or an authorized runner
  const authHeader = request.headers.get('authorization');

  if (
    env.CRON_SECRET &&
    authHeader !== `Bearer ${env.CRON_SECRET}`
  ) {
    return NextResponse.json(
      { error: 'Unauthorized. Invalid CRON_SECRET.' },
      { status: 401 }
    );
  }

  try {
    // ---------------------------------------------------------
    // CRON JOB LOGIC GOES HERE
    // Example: 
    // - Check for scheduled social media posts and publish them
    // - Pull latest ads metrics from Meta API
    // - Send daily summary emails via Resend
    // ---------------------------------------------------------
    
    console.log("[CRON] Executing scheduled background tasks...", new Date().toISOString());

    return NextResponse.json({ success: true, message: "Cron executed successfully" });
  } catch (error: any) {
    console.error("[CRON] Execution failed:", error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}
