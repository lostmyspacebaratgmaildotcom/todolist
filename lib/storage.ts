import {
  defaultResetTime,
  defaultTemplateId,
  defaultZoneId,
  tasks as seedTasks,
  zones as defaultZones,
} from "./data";
import { getCleaningDate } from "./date";
import {
  calculateCompletions,
  calculateDailyCompletion,
  getTemplateTasks,
} from "./progress";
import type {
  DailyLog,
  EditableRoutineData,
  RoutineTemplate,
  Settings,
  Task,
  Zone,
  ZoneFrequency,
} from "./types";

const settingsKey = "apartment-reset:settings";
const routineDataKey = "apartment-reset:routine-data";
const logPrefix = "cleaningLog:";

/** Bump when canonical routine rows (e.g. Kitchen, Entry) change so localStorage upgrades. */
export const ROUTINE_SCHEMA_VERSION = 3;

export const defaultSettings: Settings = {
  selectedTemplateId: defaultTemplateId,
  resetTime: defaultResetTime,
  currentZoneIds: [defaultZoneId],
  currentZoneId: defaultZoneId,
  scheduledZoneDates: {},
  lastZoneScheduleByCadence: {},
  upcomingTaskDates: {},
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
    const scheduledZoneDates =
      parsedSettings.scheduledZoneDates &&
      typeof parsedSettings.scheduledZoneDates === "object"
        ? normalizeScheduledZoneDates(parsedSettings.scheduledZoneDates)
        : defaultSettings.scheduledZoneDates;

    const upcomingTaskDates =
      parsedSettings.upcomingTaskDates &&
      typeof parsedSettings.upcomingTaskDates === "object"
        ? (parsedSettings.upcomingTaskDates as Record<string, string>)
        : defaultSettings.upcomingTaskDates;

    return {
      ...defaultSettings,
      ...parsedSettings,
      currentZoneIds,
      scheduledZoneDates,
      upcomingTaskDates,
    };
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
    zones: normalizeZones(zones),
    tasks: getTemplateTasks(template).map((task) => ({ ...task })),
    updatedAt: new Date().toISOString(),
    routineSchemaVersion: ROUTINE_SCHEMA_VERSION,
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

    const base: EditableRoutineData = {
      zones: normalizeZones(parsed.zones),
      tasks: parsed.tasks,
      updatedAt: parsed.updatedAt ?? new Date().toISOString(),
      routineSchemaVersion: parsed.routineSchemaVersion,
    };

    const migrated = migrateRoutineSchemaIfNeeded(base, template);
    if (migrated !== base) {
      saveRoutineData(migrated);
    }

    return migrated;
  } catch {
    return createRoutineDataFromTemplate(template);
  }
}

export function saveRoutineData(routineData: EditableRoutineData): void {
  if (!canUseStorage()) {
    return;
  }

  const toSave: EditableRoutineData = {
    ...routineData,
    routineSchemaVersion:
      routineData.routineSchemaVersion ?? ROUTINE_SCHEMA_VERSION,
  };

  window.localStorage.setItem(routineDataKey, JSON.stringify(toSave));
}

export function getTodayLog(tasks: Task[], settings: Settings): DailyLog {
  const date = getCleaningDate(settings.resetTime);
  const existingLog = loadDailyLog(date);

  if (existingLog) {
    const validCompletedTaskIds = existingLog.completedTaskIds.filter((taskId) =>
      tasks.some((task) => task.id === taskId),
    );
    const validAsNeeded = (existingLog.asNeededOnTodayTaskIds ?? []).filter((taskId) =>
      tasks.some((task) => task.id === taskId),
    );
    const blockCompletion = calculateCompletions(tasks, validCompletedTaskIds);

    return {
      ...existingLog,
      completedTaskIds: validCompletedTaskIds,
      asNeededOnTodayTaskIds: validAsNeeded,
      blockCompletion,
      dailyCompletion: calculateDailyCompletion(blockCompletion),
    };
  }

  const blockCompletion = calculateCompletions(tasks, []);

  return {
    date,
    completedTaskIds: [],
    asNeededOnTodayTaskIds: [],
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

function migrateRoutineSchemaIfNeeded(
  routine: EditableRoutineData,
  template: RoutineTemplate,
): EditableRoutineData {
  const currentVersion = routine.routineSchemaVersion ?? 0;

  if (currentVersion >= ROUTINE_SCHEMA_VERSION) {
    return routine;
  }

  const allowedIds = new Set(template.taskIds);
  const kitchenCanon = seedTasks.filter(
    (task) => task.zoneId === "kitchen" && allowedIds.has(task.id),
  );
  const entryCanon = seedTasks.filter(
    (task) => task.zoneId === "entry" && allowedIds.has(task.id),
  );
  const rest = routine.tasks.filter(
    (task) => task.zoneId !== "kitchen" && task.zoneId !== "entry",
  );

  return {
    ...routine,
    tasks: [
      ...rest,
      ...kitchenCanon.map((task) => ({ ...task })),
      ...entryCanon.map((task) => ({ ...task })),
    ],
    updatedAt: new Date().toISOString(),
    routineSchemaVersion: ROUTINE_SCHEMA_VERSION,
  };
}

function canUseStorage(): boolean {
  return typeof window !== "undefined" && "localStorage" in window;
}

function normalizeZones(zones: Zone[]): Zone[] {
  return zones.map((zone) => ({
    ...zone,
    frequency: isZoneFrequency(zone.frequency) ? zone.frequency : "daily",
  }));
}

function isZoneFrequency(value: unknown): value is ZoneFrequency {
  return (
    value === "daily" ||
    value === "weekly" ||
    value === "monthly" ||
    value === "once"
  );
}

function normalizeScheduledZoneDates(
  scheduledZoneDates: Record<string, unknown>,
): Record<string, string[]> {
  return Object.fromEntries(
    Object.entries(scheduledZoneDates).map(([zoneId, dates]) => [
      zoneId,
      Array.isArray(dates)
        ? Array.from(
            new Set(
              dates.filter(
                (date): date is string =>
                  typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date),
              ),
            ),
          )
        : [],
    ]),
  );
}
