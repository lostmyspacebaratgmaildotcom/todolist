import {
  defaultResetTime,
  defaultTemplateId,
  defaultZoneId,
  zones as defaultZones,
} from "./data";
import { getCleaningDate } from "./date";
import {
  calculateCompletions,
  calculateDailyCompletion,
  getTemplateTasks,
} from "./progress";
import type { DailyLog, EditableRoutineData, RoutineTemplate, Settings, Task } from "./types";

const settingsKey = "apartment-reset:settings";
const routineDataKey = "apartment-reset:routine-data";
const logPrefix = "cleaningLog:";

export const defaultSettings: Settings = {
  selectedTemplateId: defaultTemplateId,
  resetTime: defaultResetTime,
  currentZoneIds: [defaultZoneId],
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
    const parsedSettings = JSON.parse(rawSettings) as Partial<Settings>;
    const currentZoneIds = Array.isArray(parsedSettings.currentZoneIds)
      ? parsedSettings.currentZoneIds
      : parsedSettings.currentZoneId
        ? [parsedSettings.currentZoneId]
        : defaultSettings.currentZoneIds;

    return { ...defaultSettings, ...parsedSettings, currentZoneIds };
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

export function createRoutineDataFromTemplate(
  template: RoutineTemplate,
  zones = defaultZones,
): EditableRoutineData {
  return {
    zones,
    tasks: getTemplateTasks(template).map((task) => ({ ...task })),
    updatedAt: new Date().toISOString(),
  };
}

export function loadRoutineData(template: RoutineTemplate): EditableRoutineData {
  if (!canUseStorage()) {
    return createRoutineDataFromTemplate(template);
  }

  const rawRoutineData = window.localStorage.getItem(routineDataKey);

  if (!rawRoutineData) {
    return createRoutineDataFromTemplate(template);
  }

  try {
    const parsed = JSON.parse(rawRoutineData) as EditableRoutineData;

    if (!Array.isArray(parsed.zones) || !Array.isArray(parsed.tasks)) {
      return createRoutineDataFromTemplate(template);
    }

    return {
      zones: parsed.zones,
      tasks: parsed.tasks,
      updatedAt: parsed.updatedAt ?? new Date().toISOString(),
    };
  } catch {
    return createRoutineDataFromTemplate(template);
  }
}

export function saveRoutineData(routineData: EditableRoutineData): void {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(routineDataKey, JSON.stringify(routineData));
}

export function getTodayLog(tasks: Task[], settings: Settings): DailyLog {
  const date = getCleaningDate(settings.resetTime);
  const existingLog = loadDailyLog(date);

  if (existingLog) {
    const validCompletedTaskIds = existingLog.completedTaskIds.filter((taskId) =>
      tasks.some((task) => task.id === taskId),
    );
    const blockCompletion = calculateCompletions(tasks, validCompletedTaskIds);

    return {
      ...existingLog,
      completedTaskIds: validCompletedTaskIds,
      blockCompletion,
      dailyCompletion: calculateDailyCompletion(blockCompletion),
    };
  }

  const blockCompletion = calculateCompletions(tasks, []);

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
    (key) => key === settingsKey || key === routineDataKey || key.startsWith(logPrefix),
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
