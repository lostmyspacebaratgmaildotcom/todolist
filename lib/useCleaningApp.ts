"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  defaultZoneId,
  routineBlocks,
  templates,
  zones as defaultZones,
} from "./data";
import { formatLocalDate, getCleaningDate } from "./date";
import { calculateCompletions, calculateDailyCompletion } from "./progress";
import {
  clearLocalData,
  createRoutineDataFromTemplate,
  defaultSettings,
  getTodayLog,
  loadRoutineData,
  loadSettings,
  saveDailyLog,
  saveRoutineData,
  saveSettings,
} from "./storage";
import type {
  DailyLog,
  EditableRoutineData,
  RoutineBlockId,
  RoutineTemplate,
  Settings,
  Task,
  Zone,
} from "./types";

export function useCleaningApp() {
  const [isReady, setIsReady] = useState(false);
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [routineData, setRoutineData] = useState<EditableRoutineData>(() =>
    createRoutineDataFromTemplate(getTemplateById(defaultSettings.selectedTemplateId)),
  );
  const [dailyLog, setDailyLog] = useState<DailyLog | null>(null);

  const template = useMemo(
    () => getTemplateById(settings.selectedTemplateId),
    [settings.selectedTemplateId],
  );
  const selectedZoneIds = useMemo(
    () =>
      settings.currentZoneIds.filter((zoneId) =>
        routineData.zones.some((zone) => zone.id === zoneId),
      ),
    [routineData.zones, settings.currentZoneIds],
  );
  const selectedZones = useMemo(
    () => routineData.zones.filter((zone) => selectedZoneIds.includes(zone.id)),
    [routineData.zones, selectedZoneIds],
  );
  const currentZone = useMemo(
    () =>
      selectedZones[0] ??
      routineData.zones.find((zone) => zone.id === settings.currentZoneId) ??
      routineData.zones[0] ??
      defaultZones[0],
    [routineData.zones, selectedZones, settings.currentZoneId],
  );
  const todayTasks = useMemo(
    () => filterTasksForToday(routineData.tasks, selectedZoneIds),
    [routineData.tasks, selectedZoneIds],
  );

  useEffect(() => {
    const storedSettings = loadSettings();
    const storedTemplate = getTemplateById(storedSettings.selectedTemplateId);
    const storedRoutineData = loadRoutineData(storedTemplate);
    const normalizedSettings = normalizeSettings(storedSettings, storedRoutineData.zones);

    setSettings(normalizedSettings);
    setRoutineData(storedRoutineData);
    setDailyLog(
      getTodayLog(
        filterTasksForToday(storedRoutineData.tasks, normalizedSettings.currentZoneIds),
        normalizedSettings,
      ),
    );
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    setDailyLog((currentLog) => {
      const expectedDate = getCleaningDate(settings.resetTime);

      if (currentLog?.date === expectedDate) {
        const nextLog = recalculateLogForTasks(currentLog, todayTasks);
        saveDailyLog(nextLog);
        return nextLog;
      }

      return getTodayLog(todayTasks, settings);
    });
  }, [isReady, settings, todayTasks]);

  const updateSettings = useCallback(
    (updates: Partial<Settings>) => {
      setSettings((currentSettings) => {
        const nextSettings = normalizeSettings(
          { ...currentSettings, ...updates },
          routineData.zones,
        );
        saveSettings(nextSettings);
        return nextSettings;
      });
    },
    [routineData.zones],
  );

  const addZoneToday = useCallback(
    (zoneId: string) => {
      setSettings((currentSettings) => {
        const today = getCleaningDate(currentSettings.resetTime);
        const nextZoneIds = Array.from(
          new Set([...currentSettings.currentZoneIds, zoneId]),
        );
        const nextScheduledZoneDates = addScheduledZoneDate(
          currentSettings.scheduledZoneDates,
          zoneId,
          today,
        );
        const nextSettings = normalizeSettings(
          {
            ...currentSettings,
            currentZoneId: nextZoneIds[0] ?? currentSettings.currentZoneId,
            currentZoneIds: nextZoneIds,
            scheduledZoneDates: nextScheduledZoneDates,
          },
          routineData.zones,
        );

        saveSettings(nextSettings);

        return nextSettings;
      });
    },
    [routineData.zones],
  );

  const scheduleZoneTomorrow = useCallback(
    (zoneId: string) => {
      setSettings((currentSettings) => {
        const tomorrow = addDaysToDateString(
          getCleaningDate(currentSettings.resetTime),
          1,
        );
        const nextSettings = normalizeSettings(
          {
            ...currentSettings,
            scheduledZoneDates: addScheduledZoneDate(
              currentSettings.scheduledZoneDates,
              zoneId,
              tomorrow,
            ),
          },
          routineData.zones,
        );

        saveSettings(nextSettings);

        return nextSettings;
      });
    },
    [routineData.zones],
  );

  const removeZoneTomorrow = useCallback(
    (zoneId: string) => {
      setSettings((currentSettings) => {
        const tomorrow = addDaysToDateString(
          getCleaningDate(currentSettings.resetTime),
          1,
        );
        const nextSettings = normalizeSettings(
          {
            ...currentSettings,
            scheduledZoneDates: removeScheduledZoneDate(
              currentSettings.scheduledZoneDates,
              zoneId,
              tomorrow,
            ),
          },
          routineData.zones,
        );

        saveSettings(nextSettings);

        return nextSettings;
      });
    },
    [routineData.zones],
  );

  const removeZoneToday = useCallback(
    (zoneId: string) => {
      setSettings((currentSettings) => {
        const today = getCleaningDate(currentSettings.resetTime);
        const nextZoneIds = currentSettings.currentZoneIds.filter(
          (currentZoneId) => currentZoneId !== zoneId,
        );
        const nextScheduledZoneDates = removeScheduledZoneDate(
          currentSettings.scheduledZoneDates,
          zoneId,
          today,
        );
        const nextSettings = normalizeSettings(
          {
            ...currentSettings,
            currentZoneId: nextZoneIds[0] ?? currentSettings.currentZoneId,
            currentZoneIds: nextZoneIds,
            scheduledZoneDates: nextScheduledZoneDates,
          },
          routineData.zones,
        );

        saveSettings(nextSettings);

        return nextSettings;
      });
    },
    [routineData.zones],
  );

  const startTemplate = useCallback(
    (templateId: string) => {
      const nextTemplate = getTemplateById(templateId);

      setSettings((currentSettings) => {
        const nextRoutineData = createRoutineDataFromTemplate(
          nextTemplate,
          routineData.zones,
        );
        const nextSettings = normalizeSettings(
          {
            ...currentSettings,
            selectedTemplateId: nextTemplate.id,
            firstRunComplete: true,
          },
          nextRoutineData.zones,
        );
        const nextTodayTasks = filterTasksForToday(
          nextRoutineData.tasks,
          nextSettings.currentZoneIds,
        );
        const date = getCleaningDate(nextSettings.resetTime);
        const blockCompletion = calculateCompletions(nextTodayTasks, []);
        const nextLog: DailyLog = {
          date,
          completedTaskIds: [],
          blockCompletion,
          dailyCompletion: calculateDailyCompletion(blockCompletion),
          updatedAt: new Date().toISOString(),
        };

        saveSettings(nextSettings);
        saveRoutineData(nextRoutineData);
        saveDailyLog(nextLog);
        setRoutineData(nextRoutineData);
        setDailyLog(nextLog);

        return nextSettings;
      });
    },
    [routineData.zones],
  );

  const reconcileDailyLogForTasks = useCallback(
    (nextTasks: Task[]) => {
      setDailyLog((currentLog) => {
        const baseLog = currentLog ?? getTodayLog(nextTasks, settings);
        const nextLog = recalculateLogForTasks(baseLog, nextTasks);

        saveDailyLog(nextLog);

        return nextLog;
      });
    },
    [settings],
  );

  const setTaskCompleted = useCallback(
    (taskId: string, completed: boolean) => {
      setDailyLog((currentLog) => {
        if (!currentLog) {
          return currentLog;
        }

        const completedSet = new Set(currentLog.completedTaskIds);

        if (completed) {
          completedSet.add(taskId);
        } else {
          completedSet.delete(taskId);
        }

        const completedTaskIds = Array.from(completedSet);
        const blockCompletion = calculateCompletions(
          todayTasks,
          completedTaskIds,
        );
        const nextLog: DailyLog = {
          ...currentLog,
          completedTaskIds,
          blockCompletion,
          dailyCompletion: calculateDailyCompletion(blockCompletion),
          updatedAt: new Date().toISOString(),
        };

        saveDailyLog(nextLog);

        return nextLog;
      });
    },
    [todayTasks],
  );

  const resetToday = useCallback(() => {
    const blockCompletion = calculateCompletions(todayTasks, []);
    const nextLog: DailyLog = {
      date: getCleaningDate(settings.resetTime),
      completedTaskIds: [],
      blockCompletion,
      dailyCompletion: calculateDailyCompletion(blockCompletion),
      updatedAt: new Date().toISOString(),
    };

    saveDailyLog(nextLog);
    setDailyLog(nextLog);
  }, [settings.resetTime, todayTasks]);

  const addZone = useCallback(
    (input: { name: string; description: string; frequency: Zone["frequency"] }) => {
      const name = input.name.trim();

      if (!name) {
        return null;
      }

      const nextZone: Zone = {
        id: createLocalId("zone"),
        name,
        description:
          input.description.trim() ||
          "A custom apartment zone for your local routine.",
        frequency: input.frequency,
        sortOrder: routineData.zones.length + 1,
        active: true,
        suggestedTasks: [],
      };
      const nextRoutineData = {
        ...routineData,
        zones: [...routineData.zones, nextZone],
        updatedAt: new Date().toISOString(),
      };
      const nextSettings = normalizeSettings(settings, nextRoutineData.zones);

      saveRoutineData(nextRoutineData);
      saveSettings(nextSettings);
      setRoutineData(nextRoutineData);
      setSettings(nextSettings);

      return nextZone.id;
    },
    [routineData, settings],
  );

  const deleteZone = useCallback(
    (zoneId: string) => {
      if (routineData.zones.length <= 1) {
        return;
      }

      const remainingZones = routineData.zones
        .filter((zone) => zone.id !== zoneId)
        .map((zone, index) => ({ ...zone, sortOrder: index + 1 }));
      const nextTasks = routineData.tasks.map((task) =>
        task.zoneId === zoneId ? { ...task, zoneId: undefined } : task,
      );
      const nextRoutineData = {
        ...routineData,
        zones: remainingZones,
        tasks: nextTasks,
        updatedAt: new Date().toISOString(),
      };
      const nextSettings = normalizeSettings(settings, remainingZones);
      const remainingScheduledZoneDates = { ...nextSettings.scheduledZoneDates };
      delete remainingScheduledZoneDates[zoneId];
      const nextTodayTasks = filterTasksForToday(
        nextTasks,
        nextSettings.currentZoneIds,
      );
      const settingsWithoutDeletedZone = {
        ...nextSettings,
        scheduledZoneDates: remainingScheduledZoneDates,
      };

      saveRoutineData(nextRoutineData);
      saveSettings(settingsWithoutDeletedZone);
      setRoutineData(nextRoutineData);
      setSettings(settingsWithoutDeletedZone);
      reconcileDailyLogForTasks(nextTodayTasks);
    },
    [reconcileDailyLogForTasks, routineData, settings],
  );

  const updateZone = useCallback(
    (
      zoneId: string,
      input: {
        name: string;
        description: string;
        frequency: Zone["frequency"];
      },
    ) => {
      const name = input.name.trim();

      if (!name) {
        return;
      }

      const zoneToUpdate = routineData.zones.find((zone) => zone.id === zoneId);

      if (!zoneToUpdate) {
        return;
      }

      const nextRoutineData = {
        ...routineData,
        zones: routineData.zones.map((zone) =>
          zone.id === zoneId
            ? {
                ...zone,
                name,
                description:
                  input.description.trim() ||
                  "A custom apartment zone for your local routine.",
                frequency: input.frequency,
              }
            : zone,
        ),
        updatedAt: new Date().toISOString(),
      };

      saveRoutineData(nextRoutineData);
      setRoutineData(nextRoutineData);
    },
    [routineData],
  );

  const addTask = useCallback(
    (input: {
      title: string;
      block: RoutineBlockId;
      estimatedMinutes: number;
      zoneId?: string;
    }) => {
      const title = input.title.trim();

      if (!title) {
        return;
      }

      const blockTasks = routineData.tasks.filter(
        (task) => task.block === input.block,
      );
      const nextTask: Task = {
        id: createLocalId("task"),
        title,
        zoneId: input.zoneId || undefined,
        block: input.block,
        estimatedMinutes: Math.max(1, Math.round(input.estimatedMinutes || 1)),
        required: true,
        sortOrder:
          blockTasks.reduce((max, task) => Math.max(max, task.sortOrder), 0) + 1,
        active: true,
      };
      const nextTasks = [...routineData.tasks, nextTask];
      const nextRoutineData = {
        ...routineData,
        tasks: nextTasks,
        updatedAt: new Date().toISOString(),
      };

      saveRoutineData(nextRoutineData);
      setRoutineData(nextRoutineData);
      reconcileDailyLogForTasks(
        filterTasksForToday(nextTasks, settings.currentZoneIds),
      );
    },
    [reconcileDailyLogForTasks, routineData, settings.currentZoneIds],
  );

  const deleteTask = useCallback(
    (taskId: string) => {
      const nextTasks = routineData.tasks.filter((task) => task.id !== taskId);
      const nextRoutineData = {
        ...routineData,
        tasks: nextTasks,
        updatedAt: new Date().toISOString(),
      };

      saveRoutineData(nextRoutineData);
      setRoutineData(nextRoutineData);
      reconcileDailyLogForTasks(
        filterTasksForToday(nextTasks, settings.currentZoneIds),
      );
    },
    [reconcileDailyLogForTasks, routineData, settings.currentZoneIds],
  );

  const updateTask = useCallback(
    (
      taskId: string,
      input: {
        title: string;
        block: RoutineBlockId;
        estimatedMinutes: number;
        zoneId?: string;
      },
    ) => {
      const title = input.title.trim();

      if (!title) {
        return;
      }

      const taskToUpdate = routineData.tasks.find((task) => task.id === taskId);

      if (!taskToUpdate) {
        return;
      }

      const blockChanged = taskToUpdate.block !== input.block;
      const nextSortOrder = blockChanged
        ? routineData.tasks
            .filter((task) => task.block === input.block && task.id !== taskId)
            .reduce((max, task) => Math.max(max, task.sortOrder), 0) + 1
        : taskToUpdate.sortOrder;
      const nextTasks = routineData.tasks.map((task) =>
        task.id === taskId
          ? {
              ...task,
              title,
              block: input.block,
              zoneId: input.zoneId || undefined,
              estimatedMinutes: Math.max(1, Math.round(input.estimatedMinutes || 1)),
              sortOrder: nextSortOrder,
            }
          : task,
      );
      const nextRoutineData = {
        ...routineData,
        tasks: nextTasks,
        updatedAt: new Date().toISOString(),
      };

      saveRoutineData(nextRoutineData);
      setRoutineData(nextRoutineData);
      reconcileDailyLogForTasks(
        filterTasksForToday(nextTasks, settings.currentZoneIds),
      );
    },
    [reconcileDailyLogForTasks, routineData, settings.currentZoneIds],
  );

  const clearAllLocalData = useCallback(() => {
    clearLocalData();
    const nextSettings = defaultSettings;
    const nextRoutineData = createRoutineDataFromTemplate(
      getTemplateById(nextSettings.selectedTemplateId),
    );
    const nextLog = getTodayLog(
      filterTasksForToday(nextRoutineData.tasks, nextSettings.currentZoneIds),
      nextSettings,
    );

    setSettings(nextSettings);
    setRoutineData(nextRoutineData);
    setDailyLog(nextLog);
    setIsReady(true);
  }, []);

  return {
    isReady,
    settings,
    dailyLog,
    template,
    templates,
    zones: routineData.zones,
    routineTasks: routineData.tasks,
    todayTasks,
    selectedZoneIds,
    selectedZones,
    currentZone,
    routineBlocks,
    updateSettings,
    addZoneToday,
    removeZoneToday,
    scheduleZoneTomorrow,
    removeZoneTomorrow,
    startTemplate,
    setTaskCompleted,
    resetToday,
    addZone,
    deleteZone,
    updateZone,
    addTask,
    deleteTask,
    updateTask,
    clearAllLocalData,
  };
}

function getTemplateById(templateId: string): RoutineTemplate {
  return templates.find((candidate) => candidate.id === templateId) ?? templates[0];
}

function normalizeSettings(settings: Settings, zones: Zone[]): Settings {
  const selectedTemplateId = templates.some(
    (template) => template.id === settings.selectedTemplateId,
  )
    ? settings.selectedTemplateId
    : defaultSettings.selectedTemplateId;
  const validZoneIds = new Set(zones.map((zone) => zone.id));
  const settingsWithOptionalZones = settings as Settings & {
    currentZoneIds?: string[];
  };
  const hasStoredZoneIds = Array.isArray(settingsWithOptionalZones.currentZoneIds);
  const currentZoneIds = hasStoredZoneIds
    ? uniqueZoneIds(settingsWithOptionalZones.currentZoneIds ?? [], validZoneIds)
    : uniqueZoneIds([settings.currentZoneId], validZoneIds);
  const currentZoneId =
    currentZoneIds[0] ??
    (validZoneIds.has(settings.currentZoneId)
      ? settings.currentZoneId
      : (zones[0]?.id ?? defaultZoneId));
  const scheduledZoneDates = Object.fromEntries(
    Object.entries(settings.scheduledZoneDates ?? {})
      .filter(([zoneId]) => validZoneIds.has(zoneId))
      .map(([zoneId, dates]) => [
        zoneId,
        Array.from(new Set(dates)).filter((date) =>
          /^\d{4}-\d{2}-\d{2}$/.test(date),
        ),
      ]),
  );

  return {
    ...defaultSettings,
    ...settings,
    selectedTemplateId,
    currentZoneIds,
    currentZoneId,
    scheduledZoneDates,
  };
}

function createLocalId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function uniqueZoneIds(zoneIds: string[], validZoneIds: Set<string>): string[] {
  return Array.from(new Set(zoneIds.filter((zoneId) => validZoneIds.has(zoneId))));
}

function filterTasksForToday(tasks: Task[], selectedZoneIds: string[]): Task[] {
  const selectedZones = new Set(selectedZoneIds);

  return tasks.filter((task) => task.zoneId && selectedZones.has(task.zoneId));
}

function recalculateLogForTasks(log: DailyLog, tasks: Task[]): DailyLog {
  const activeTaskIds = new Set(tasks.map((task) => task.id));
  const completedTaskIds = log.completedTaskIds.filter((taskId) =>
    activeTaskIds.has(taskId),
  );
  const blockCompletion = calculateCompletions(tasks, completedTaskIds);

  return {
    ...log,
    completedTaskIds,
    blockCompletion,
    dailyCompletion: calculateDailyCompletion(blockCompletion),
  };
}

function addScheduledZoneDate(
  scheduledZoneDates: Record<string, string[]>,
  zoneId: string,
  date: string,
): Record<string, string[]> {
  return {
    ...scheduledZoneDates,
    [zoneId]: Array.from(new Set([...(scheduledZoneDates[zoneId] ?? []), date])),
  };
}

function removeScheduledZoneDate(
  scheduledZoneDates: Record<string, string[]>,
  zoneId: string,
  date: string,
): Record<string, string[]> {
  const nextDates = (scheduledZoneDates[zoneId] ?? []).filter(
    (scheduledDate) => scheduledDate !== date,
  );

  if (nextDates.length === 0) {
    const remainingScheduledZoneDates = { ...scheduledZoneDates };
    delete remainingScheduledZoneDates[zoneId];
    return remainingScheduledZoneDates;
  }

  return {
    ...scheduledZoneDates,
    [zoneId]: nextDates,
  };
}

function addDaysToDateString(dateString: string, days: number): string {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);

  return formatLocalDate(date);
}
