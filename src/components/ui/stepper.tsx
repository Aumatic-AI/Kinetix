import { cn } from "@/lib/utils";

export interface StepperProps {
  /** Total number of steps. */
  steps: number;
  /** Current step, 1-indexed. */
  current: number;
  /** Optional label shown beside each step's circle, in step order. */
  labels?: string[];
  className?: string;
}

/** Numbered-circle progress indicator — filled black for the current step
 * and everything before it, hollow gray for what's ahead, connected by a
 * line that follows the same black/gray split. Deliberately monochrome
 * (text/background/border tokens only, no brand color) so it reads as
 * pure UI chrome rather than competing with the page's accent color. */
export function Stepper({ steps, current, labels, className }: StepperProps) {
  return (
    <div className={cn("flex items-center w-full", className)}>
      {Array.from({ length: steps }, (_, i) => i + 1).map((step) => {
        const isReached = step <= current;
        return (
          <div key={step} className={cn("flex items-center", step < steps ? "flex-1" : "shrink-0")}>
            <div className="flex items-center gap-3 shrink-0">
              <div
                className={cn(
                  "flex items-center justify-center w-9 h-9 rounded-full text-sm font-bold shrink-0 transition-colors",
                  isReached ? "bg-text text-background" : "bg-background border border-default text-muted"
                )}
              >
                {step}
              </div>
              {labels?.[step - 1] && (
                <span className={cn("text-base whitespace-nowrap transition-colors", isReached ? "font-semibold text-text" : "font-medium text-muted")}>
                  {labels[step - 1]}
                </span>
              )}
            </div>
            {step < steps && (
              <div className={cn("flex-1 h-0.5 mx-4 rounded-full transition-colors", step < current ? "bg-text" : "bg-border")} />
            )}
          </div>
        );
      })}
    </div>
  );
}
