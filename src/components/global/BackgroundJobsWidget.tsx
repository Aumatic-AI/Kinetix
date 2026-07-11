"use client";

import { useJobsStore } from "@/store";
import { ChevronDown, ChevronUp, Loader2, CheckCircle2, XCircle, X } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const CircularProgress = ({ progress, status }: { progress: number, status: string }) => {
  const radius = 10;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  if (status === 'completed') return <CheckCircle2 className="text-green-500 w-6 h-6" />;
  if (status === 'failed') return <XCircle className="text-red-500 w-6 h-6" />;

  return (
    <div className="relative w-6 h-6 flex items-center justify-center">
      <svg className="w-full h-full transform -rotate-90">
        <circle
          cx="12"
          cy="12"
          r={radius}
          className="text-muted/30"
          strokeWidth="2"
          stroke="currentColor"
          fill="transparent"
        />
        <circle
          cx="12"
          cy="12"
          r={radius}
          className="text-primary transition-all duration-300 ease-in-out"
          strokeWidth="2"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
        />
      </svg>
    </div>
  );
};

export function BackgroundJobsWidget() {
  const { jobs, isWidgetOpen, setWidgetOpen, removeJob } = useJobsStore();

  if (jobs.length === 0) return null;

  const activeJobs = jobs.filter(j => j.status === 'queued' || j.status === 'processing');
  const completedJobs = jobs.filter(j => j.status === 'completed');
  
  const allComplete = activeJobs.length === 0 && jobs.length > 0;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end pointer-events-none">
      
      {/* Expanded List */}
      <div 
        className={cn(
          "w-80 bg-background border rounded-lg shadow-xl mb-3 overflow-hidden transition-all duration-300 ease-in-out origin-bottom-right pointer-events-auto",
          isWidgetOpen ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none h-0 border-none mb-0"
        )}
      >
        <div className="bg-muted/50 p-3 border-b flex items-center justify-between">
          <h4 className="text-sm font-semibold">
            {activeJobs.length > 0 ? `${activeJobs.length} tasks running` : 'All tasks completed'}
          </h4>
          <button onClick={() => setWidgetOpen(false)} className="p-1 hover:bg-muted rounded-full transition-colors">
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
        
        <div className="max-h-60 overflow-y-auto p-2 space-y-1">
          {jobs.map((job) => (
            <div key={job.id} className="group relative">
              <Link
                href={job.status === 'completed' && job.targetUrl ? job.targetUrl : '#'}
                className={cn(
                  "flex items-center gap-3 p-2 text-sm rounded-md transition-colors",
                  job.status === 'completed' && job.targetUrl ? "hover:bg-muted cursor-pointer" : "cursor-default"
                )}
                onClick={(e) => {
                  if (job.status !== 'completed' || !job.targetUrl) e.preventDefault();
                }}
              >
                <CircularProgress progress={job.progress} status={job.status} />
                <div className="flex-1 truncate">
                  <p className="font-medium truncate">{job.title}</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {job.status === 'processing' ? `${job.progress}%` : job.status}
                  </p>
                </div>
              </Link>
              
              {/* Dismiss button for completed/failed jobs */}
              {(job.status === 'completed' || job.status === 'failed') && (
                <button 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    removeJob(job.id);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-background border shadow-sm rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Collapsed Pill */}
      <button
        onClick={() => setWidgetOpen(!isWidgetOpen)}
        className={cn(
          "pointer-events-auto flex items-center gap-2 px-4 py-2 bg-background border rounded-full shadow-lg hover:bg-muted/50 transition-all",
          isWidgetOpen && "opacity-0 scale-95 pointer-events-none"
        )}
      >
        {allComplete ? (
          <CheckCircle2 className="w-4 h-4 text-green-500" />
        ) : (
          <Loader2 className="w-4 h-4 text-primary animate-spin" />
        )}
        <span className="text-sm font-medium">
          {allComplete ? "Uploads complete" : `${activeJobs.length} running`}
        </span>
        <ChevronUp className="w-4 h-4 text-muted-foreground ml-2" />
      </button>

    </div>
  );
}
