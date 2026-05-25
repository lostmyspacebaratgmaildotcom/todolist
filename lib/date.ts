export function getCleaningDate(resetTime: string, now = new Date()): string {
  const [resetHour, resetMinute] = parseResetTime(resetTime);
  const cleaningDate = new Date(now);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const resetMinutes = resetHour * 60 + resetMinute;

  if (currentMinutes < resetMinutes) {
    cleaningDate.setDate(cleaningDate.getDate() - 1);
  }

  return formatLocalDate(cleaningDate);
}

export function formatDisplayDate(dateString: string): string {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  // Fixed locale keeps SSR and the browser from disagreeing (hydration mismatch).
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(date);
}

export function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}


/** Local calendar date from the device clock (not shifted by daily reset time). */
export function getLocalCalendarDate(now = new Date()): string {
  return formatLocalDate(now);
}

function parseResetTime(resetTime: string): [number, number] {
  const [hour = "3", minute = "0"] = resetTime.split(":");

  return [Number(hour), Number(minute)];
}

/** First calendar day of the month after the month containing `ymd`. */
export function firstDayOfNextCalendarMonthFrom(ymd: string): string {
  const [year, month] = ymd.split("-").map(Number);
  const next = new Date(year, month - 1 + 1, 1);

  return formatLocalDate(next);
}

/** First calendar day of the quarter after the quarter containing `ymd`. */
export function firstDayOfNextQuarterFrom(ymd: string): string {
  const [year, month] = ymd.split("-").map(Number);
  const monthIndex = month - 1;
  const quarter = Math.floor(monthIndex / 3);

  if (quarter < 3) {
    return formatLocalDate(new Date(year, (quarter + 1) * 3, 1));
  }

  return formatLocalDate(new Date(year + 1, 0, 1));
}

