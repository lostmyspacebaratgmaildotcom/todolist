import { firstDayOfNextCalendarMonthFrom, firstDayOfNextQuarterFrom } from "./date";
import type { Task } from "./types";

/** Fill missing next-due dates for monthly/seasonal tasks (template-filtered). */
export function mergeMissingUpcomingDates(
  existing: Record<string, string>,
  tasks: Task[],
  allowedTaskIds: Set<string>,
  cleaningDate: string,
): Record<string, string> {
  const next = { ...existing };

  for (const task of tasks) {
    if (!task.active || !task.zoneId || !allowedTaskIds.has(task.id)) {
      continue;
    }

    if (task.cadence === "monthly" && !next[task.id]) {
      next[task.id] = firstDayOfNextCalendarMonthFrom(cleaningDate);
    }

    if (task.cadence === "seasonal" && !next[task.id]) {
      next[task.id] = firstDayOfNextQuarterFrom(cleaningDate);
    }
  }

  return next;
}

export function nextUpcomingDateAfterComplete(task: Task, completedOn: string): string | null {
  if (task.cadence === "monthly") {
    return firstDayOfNextCalendarMonthFrom(completedOn);
  }

  if (task.cadence === "seasonal") {
    return firstDayOfNextQuarterFrom(completedOn);
  }

  return null;
}
