/**
 * Shared, framework-agnostic scheduling math for the two weekly
 * background jobs (Competitor Analysis, Self Ad Analysis) whose day/time
 * is now business-configurable from Settings instead of a hardcoded cron
 * expression. Inngest cron triggers are fixed strings baked in at deploy
 * time — they can't read a database value — so the actual jobs run on a
 * frequent, fixed hourly "checker" cron and call shouldRunScheduledJob()
 * to decide whether THIS particular business's configured day+hour has
 * just been reached. No import here touches Supabase/Next — safe to call
 * from both a server job and the Settings page (for the live "next run"
 * preview as the user changes the day/hour pickers).
 */

export const WEEKDAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const WEEKDAY_SHORT_INDEX: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

export function hourLabel(hour: number): string {
  const h = ((hour % 24) + 24) % 24;
  const period = h < 12 ? "AM" : "PM";
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${display}:00 ${period}`;
}

function partsInTimezone(date: Date, timezone: string) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
    weekday: "short",
  });
  const map: Record<string, string> = {};
  for (const p of fmt.formatToParts(date)) map[p.type] = p.value;
  const hour = map.hour === "24" ? 0 : parseInt(map.hour, 10);
  return {
    year: parseInt(map.year, 10),
    month: parseInt(map.month, 10),
    day: parseInt(map.day, 10),
    hour,
    weekday: WEEKDAY_SHORT_INDEX[map.weekday] ?? 0,
  };
}

export interface ScheduleCheck {
  scheduleDay: number; // 0 (Sun) – 6 (Sat)
  scheduleHour: number; // 0–23
  lastRunAt: string | null;
  timezone: string;
  now?: Date;
}

/** True exactly once per matching hourly checker tick — the real
 * enforcement, using precise timezone-aware wall-clock comparison. Guards
 * against firing twice in the same week (e.g. if last run was under 6
 * days ago) even though day+hour only naturally repeats every 7 days. */
export function shouldRunScheduledJob({ scheduleDay, scheduleHour, lastRunAt, timezone, now = new Date() }: ScheduleCheck): boolean {
  const parts = partsInTimezone(now, timezone);
  if (parts.weekday !== scheduleDay || parts.hour !== scheduleHour) return false;
  if (lastRunAt) {
    const daysSinceLastRun = (now.getTime() - new Date(lastRunAt).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceLastRun < 6) return false;
  }
  return true;
}

/** Approximate next-occurrence DATE for the "next run" preview shown
 * while editing — a display hint, not the scheduling mechanism itself
 * (shouldRunScheduledJob above is authoritative). Resolves which calendar
 * day is next using the target timezone's current wall-clock day/hour,
 * then builds a plain Date for that calendar day at local midnight in the
 * viewer's own timezone — callers show only the weekday name, not a
 * timezone-precise instant, so day-level precision is all that's needed. */
export function computeNextRunDate({ scheduleDay, scheduleHour, timezone, now = new Date() }: { scheduleDay: number; scheduleHour: number; timezone: string; now?: Date }): Date {
  const parts = partsInTimezone(now, timezone);
  let daysUntil = (scheduleDay - parts.weekday + 7) % 7;
  if (daysUntil === 0 && parts.hour >= scheduleHour) daysUntil = 7;
  const base = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + daysUntil));
  return base;
}
