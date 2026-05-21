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

  return new Intl.DateTimeFormat(undefined, {
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

function parseResetTime(resetTime: string): [number, number] {
  const [hour = "3", minute = "0"] = resetTime.split(":");

  return [Number(hour), Number(minute)];
}

export function getSeasonQuarterKey(cleaningDateYmd: string): string {
  const [yearRaw, monthRaw] = cleaningDateYmd.split("-").map(Number);
  const year = yearRaw;
  const month = monthRaw;
  const quarter = month <= 3 ? 1 : month <= 6 ? 2 : month <= 9 ? 3 : 4;

  return `${year}-Q${quarter}`;
}

