import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { aiOrchestrator } from '@/services/ai/orchestrator';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { prompt, type, provider } = body;

    if (!prompt || !type) {
      return NextResponse.json({ error: 'Missing prompt or type' }, { status: 400 });
    }

    // 1. Fetch Brand (using the first available brand for now)
    const { data: brands } = await supabase.from('brands').select('id').limit(1);
    if (!brands || brands.length === 0) {
      return NextResponse.json({ error: 'No brand found' }, { status: 400 });
    }
    const brandId = brands[0].id;

    // 2. Insert into generation_jobs
    const { data: job, error: insertError } = await supabase
      .from('generation_jobs')
      .insert({
        brand_id: brandId,
        requested_by: user.id,
        type: type,
        status: 'running',
        provider: provider || 'auto',
        prompt: prompt,
        started_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError || !job) {
      console.error("Job Insert Error:", insertError);
      return NextResponse.json({ error: 'Failed to create job' }, { status: 500 });
    }

    // 3. Execute AI Task synchronously (In a real high-scale prod environment this would be queued,
    // but Vercel handles up to 60s maxDuration for pro accounts, and most Fal/Runway tasks finish or return an ID quickly).
    // If provider returns an ID (like Runway), we can store it. If it returns the final URL (like Fal), we complete it.
    
    // We wrap this in a promise that doesn't block the response immediately, but Next.js Serverless might kill it 
    // if we return too fast. So we actually AWAIT the AI orchestrator since this is a standard API route.
    
    try {
      const result = await aiOrchestrator.executeTask(type as any, prompt, provider as any);
      
      // If result is an object containing task IDs or URLs
      const outputData = typeof result === 'string' ? { url: result } : result;

      // Update Job as success
      await supabase
        .from('generation_jobs')
        .update({
          status: 'succeeded',
          output: outputData,
          finished_at: new Date().toISOString()
        })
        .eq('id', job.id);

      return NextResponse.json({ jobId: job.id, status: 'succeeded', result: outputData });
    } catch (aiError: any) {
      console.error("AI Execution Error:", aiError);
      // Mark as failed
      await supabase
        .from('generation_jobs')
        .update({
          status: 'failed',
          error_message: aiError.message || 'Unknown AI error',
          finished_at: new Date().toISOString()
        })
        .eq('id', job.id);
        
      return NextResponse.json({ error: 'AI generation failed', jobId: job.id }, { status: 500 });
    }
  } catch (error: any) {
    console.error("Generation Route Error:", error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
