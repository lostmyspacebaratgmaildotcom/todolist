import { defaultResetTime, defaultTemplateId, defaultZoneId } from "./data";
import { getCleaningDate } from "./date";
import { calculateCompletions, calculateDailyCompletion } from "./progress";
import type { DailyLog, RoutineTemplate, Settings } from "./types";

const settingsKey = "apartment-reset:settings";
const logPrefix = "cleaningLog:";

export const defaultSettings: Settings = {
  selectedTemplateId: defaultTemplateId,
  resetTime: defaultResetTime,
  currentZoneId: defaultZoneId,
  firstRunComplete: false,
};

export function loadSettings(): Settings {
  if (!canUseStorage()) {
    return defaultSettings;
  }

  const rawSettings = window.localStorage.getItem(settingsKey);

  if (!rawSettings) {
    return defaultSettings;
  }

  try {
    return { ...defaultSettings, ...JSON.parse(rawSettings) };
  } catch {
    return defaultSettings;
  }
}

export function saveSettings(settings: Settings): void {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(settingsKey, JSON.stringify(settings));
}

export function getTodayLog(template: RoutineTemplate, settings: Settings): DailyLog {
  const date = getCleaningDate(settings.resetTime);
  const existingLog = loadDailyLog(date);

  if (existingLog) {
    const blockCompletion = calculateCompletions(template, existingLog.completedTaskIds);

    return {
      ...existingLog,
      blockCompletion,
      dailyCompletion: calculateDailyCompletion(blockCompletion),
    };
  }

  const blockCompletion = calculateCompletions(template, []);

  return {
    date,
    completedTaskIds: [],
    blockCompletion,
    dailyCompletion: calculateDailyCompletion(blockCompletion),
    updatedAt: new Date().toISOString(),
  };
}

export function saveDailyLog(log: DailyLog): void {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(`${logPrefix}${log.date}`, JSON.stringify(log));
}

export function clearLocalData(): void {
  if (!canUseStorage()) {
    return;
  }

  const keysToRemove = Object.keys(window.localStorage).filter(
    (key) => key === settingsKey || key.startsWith(logPrefix),
  );

  keysToRemove.forEach((key) => window.localStorage.removeItem(key));
}

function loadDailyLog(date: string): DailyLog | null {
  if (!canUseStorage()) {
    return null;
  }

  const rawLog = window.localStorage.getItem(`${logPrefix}${date}`);

  if (!rawLog) {
    return null;
  }

  try {
    return JSON.parse(rawLog) as DailyLog;
  } catch {
    return null;
  }
}

function canUseStorage(): boolean {
  return typeof window !== "undefined" && "localStorage" in window;
}
