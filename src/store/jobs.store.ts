import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface Job {
  id: string;
  title: string;
  type: string;
  status: JobStatus;
  progress: number; // 0 to 100
  targetUrl?: string; // Where to navigate when clicked
  createdAt: number;
  error?: string;
}

interface JobsState {
  jobs: Job[];
  isWidgetOpen: boolean;
  addJob: (job: Omit<Job, 'status' | 'progress' | 'createdAt'> & { status?: JobStatus }) => void;
  updateJob: (id: string, updates: Partial<Job>) => void;
  removeJob: (id: string) => void;
  clearCompleted: () => void;
  setWidgetOpen: (isOpen: boolean) => void;
}

export const useJobsStore = create<JobsState>()(
  persist(
    (set) => ({
      jobs: [],
      isWidgetOpen: false,

      addJob: (job) => set((state) => ({
        jobs: [
          {
            ...job,
            status: job.status || 'queued',
            progress: 0,
            createdAt: Date.now(),
          },
          ...state.jobs,
        ],
        isWidgetOpen: true, // Auto-open widget when new job is added
      })),

      updateJob: (id, updates) => set((state) => ({
        jobs: state.jobs.map((job) => 
          job.id === id ? { ...job, ...updates } : job
        ),
      })),

      removeJob: (id) => set((state) => ({
        jobs: state.jobs.filter((job) => job.id !== id),
      })),

      clearCompleted: () => set((state) => ({
        jobs: state.jobs.filter((job) => job.status !== 'completed' && job.status !== 'failed'),
      })),

      setWidgetOpen: (isOpen) => set({ isWidgetOpen: isOpen }),
    }),
    {
      name: 'kinetix-jobs-storage', // Persist jobs across page reloads
    }
  )
);
