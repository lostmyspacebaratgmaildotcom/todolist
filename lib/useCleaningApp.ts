"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  defaultZoneId,
  routineBlocks,
  templates,
  zones as defaultZones,
} from "./data";
import { formatLocalDate, getCleaningDate } from "./date";
import { mergeMissingUpcomingDates, nextUpcomingDateAfterComplete } from "./upcoming";
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
  ZoneScheduleCadenceContext,
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
    () =>
      filterTasksForToday(
        routineData.tasks,
        selectedZoneIds,
        buildTodayFilterCtx(settings, dailyLog),
      ),
    [routineData.tasks, selectedZoneIds, settings, dailyLog],
  );

  useEffect(() => {
    const storedSettings = loadSettings();
    const storedTemplate = getTemplateById(storedSettings.selectedTemplateId);
    const storedRoutineData = loadRoutineData(storedTemplate);
    let normalizedSettings = normalizeSettings(storedSettings, storedRoutineData.zones);
    const cleaningDate = getCleaningDate(normalizedSettings.resetTime);
    const mergedUpcoming = mergeMissingUpcomingDates(
      normalizedSettings.upcomingTaskDates ?? {},
      storedRoutineData.tasks,
      new Set(storedTemplate.taskIds),
      cleaningDate,
    );
    normalizedSettings = normalizeSettings(
      { ...normalizedSettings, upcomingTaskDates: mergedUpcoming },
      storedRoutineData.zones,
    );
    saveSettings(normalizedSettings);

    setSettings(normalizedSettings);
    setRoutineData(storedRoutineData);
    setDailyLog(
      getTodayLog(
        filterTasksForToday(
          storedRoutineData.tasks,
          normalizedSettings.currentZoneIds,
          buildTodayFilterCtx(normalizedSettings, null),
        ),
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
      const filteredTasks = filterTasksForToday(
        routineData.tasks,
        selectedZoneIds,
        buildTodayFilterCtx(settings, currentLog),
      );

      if (currentLog?.date === expectedDate) {
        const nextLog = recalculateLogForTasks(currentLog, filteredTasks);
        saveDailyLog(nextLog);
        return nextLog;
      }

      return getTodayLog(
        tasksEligibleForDailyLog(routineData.tasks, selectedZoneIds),
        settings,
      );
    });
  }, [isReady, settings, routineData.tasks, selectedZoneIds]);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    const autoSelectDailyZones = () => {
      const expectedDate = getCleaningDate(settings.resetTime);

      if (settings.lastAutoZoneDate === expectedDate) {
        return;
      }

      const nextSettings = normalizeSettings(
        {
          ...settings,
          currentZoneIds:
            settings.lastAutoZoneDate !== undefined
              ? []
              : settings.currentZoneIds,
          lastAutoZoneDate: expectedDate,
        },
        routineData.zones,
      );

      saveSettings(nextSettings);
      setSettings(nextSettings);
    };

    autoSelectDailyZones();

    const intervalId = setInterval(() => {
      autoSelectDailyZones();

      setDailyLog((currentLog) => {
        const expectedDate = getCleaningDate(settings.resetTime);

        if (!currentLog || currentLog.date === expectedDate) {
          return currentLog;
        }

        return getTodayLog(
          tasksEligibleForDailyLog(routineData.tasks, selectedZoneIds),
          settings,
        );
      });
    }, 30_000);

    return () => clearInterval(intervalId);
  }, [isReady, settings, routineData.tasks, selectedZoneIds, routineData.zones]);

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

  const scheduleZoneForDate = useCallback(
    (zoneId: string, isoDate: string, context: ZoneScheduleCadenceContext = "zone") => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
        return;
      }

      setSettings((currentSettings) => {
        const today = getCleaningDate(currentSettings.resetTime);
        const forCleaningToday = isoDate === today;
        const nextZoneIds = forCleaningToday
          ? Array.from(new Set([...currentSettings.currentZoneIds, zoneId]))
          : currentSettings.currentZoneIds;

        let nextUpcomingTaskDates = currentSettings.upcomingTaskDates ?? {};
        if (forCleaningToday) {
          const mergedUpcoming = { ...nextUpcomingTaskDates };
          for (const task of routineData.tasks) {
            if (!task.active || task.zoneId !== zoneId) {
              continue;
            }
            const cadence = task.cadence ?? "daily";
            const shouldSetDueToday =
              (context === "monthly" && cadence === "monthly") ||
              (context === "seasonal" && cadence === "seasonal") ||
              (context === "zone" && (cadence === "monthly" || cadence === "seasonal"));
            if (shouldSetDueToday) {
              mergedUpcoming[task.id] = isoDate;
            }
          }
          nextUpcomingTaskDates = mergedUpcoming;
        }

        const nextSettings = normalizeSettings(
          {
            ...currentSettings,
            ...(forCleaningToday
              ? {
                  currentZoneId: nextZoneIds[0] ?? currentSettings.currentZoneId,
                  currentZoneIds: nextZoneIds,
                  upcomingTaskDates: nextUpcomingTaskDates,
                }
              : {}),
            scheduledZoneDates: addScheduledZoneDate(
              currentSettings.scheduledZoneDates,
              zoneId,
              isoDate,
            ),
            lastZoneScheduleByCadence: {
              ...(currentSettings.lastZoneScheduleByCadence ?? {}),
              [zoneScheduleCadenceKey(zoneId, context)]: isoDate,
            },
          },
          routineData.zones,
        );
        saveSettings(nextSettings);
        return nextSettings;
      });
    },
    [routineData.tasks, routineData.zones],
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
        let nextSettings = normalizeSettings(
          {
            ...currentSettings,
            selectedTemplateId: nextTemplate.id,
            firstRunComplete: true,
          },
          nextRoutineData.zones,
        );
        const cleaningDate = getCleaningDate(nextSettings.resetTime);
        const mergedUpcoming = mergeMissingUpcomingDates(
          {},
          nextRoutineData.tasks,
          new Set(nextTemplate.taskIds),
          cleaningDate,
        );
        nextSettings = normalizeSettings(
          { ...nextSettings, upcomingTaskDates: mergedUpcoming },
          nextRoutineData.zones,
        );
        const nextTodayTasks = filterTasksForToday(
          nextRoutineData.tasks,
          nextSettings.currentZoneIds,
          buildTodayFilterCtx(nextSettings, null),
        );
        const date = getCleaningDate(nextSettings.resetTime);
        const blockCompletion = calculateCompletions(nextTodayTasks, []);
        const nextLog: DailyLog = {
          date,
          completedTaskIds: [],
          asNeededOnTodayTaskIds: [],
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
        const ctx = buildTodayFilterCtx(settings, currentLog);
        const filtered = filterTasksForToday(
          nextTasks,
          settings.currentZoneIds,
          ctx,
        );
        const baseLog = currentLog ?? getTodayLog(filtered, settings);
        const nextLog = recalculateLogForTasks(baseLog, filtered);

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

        if (completed) {
          const task = routineData.tasks.find((candidate) => candidate.id === taskId);
          if (task && (task.cadence === "monthly" || task.cadence === "seasonal")) {
            const nextDue = nextUpcomingDateAfterComplete(task, currentLog.date);
            if (nextDue) {
              queueMicrotask(() => {
                setSettings((currentSettings) =>
                  normalizeSettings(
                    {
                      ...currentSettings,
                      upcomingTaskDates: {
                        ...(currentSettings.upcomingTaskDates ?? {}),
                        [taskId]: nextDue,
                      },
                    },
                    routineData.zones,
                  ),
                );
              });
            }
          }
        }

        return nextLog;
      });
    },
    [routineData.tasks, routineData.zones, todayTasks],
  );

  const resetToday = useCallback(() => {
    const blockCompletion = calculateCompletions(todayTasks, []);
    const nextLog: DailyLog = {
      date: getCleaningDate(settings.resetTime),
      completedTaskIds: [],
      asNeededOnTodayTaskIds: [],
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
      const remainingLastByCadence = {
        ...(nextSettings.lastZoneScheduleByCadence ?? {}),
      };
      for (const key of Object.keys(remainingLastByCadence)) {
        if (key.startsWith(`${zoneId}:`)) {
          delete remainingLastByCadence[key];
        }
      }
      const settingsWithoutDeletedZone = {
        ...nextSettings,
        scheduledZoneDates: remainingScheduledZoneDates,
        lastZoneScheduleByCadence: remainingLastByCadence,
      };

      saveRoutineData(nextRoutineData);
      saveSettings(settingsWithoutDeletedZone);
      setRoutineData(nextRoutineData);
      setSettings(settingsWithoutDeletedZone);
      reconcileDailyLogForTasks(nextTasks);
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
      cadence?: Task["cadence"];
    }) => {
      const title = input.title.trim();

      if (!title) {
        return;
      }

      const blockTasks = routineData.tasks.filter(
        (task) => task.block === input.block,
      );
      const cadence = input.cadence || "daily";
      const nextTask: Task = {
        id: createLocalId("task"),
        title,
        zoneId: input.zoneId || undefined,
        block: input.block,
        cadence,
        estimatedMinutes: Math.max(1, Math.round(input.estimatedMinutes || 1)),
        required: cadence !== "as_needed",
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
      reconcileDailyLogForTasks(nextTasks);
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
      setSettings((currentSettings) => {
        const nextUpcoming = { ...(currentSettings.upcomingTaskDates ?? {}) };
        delete nextUpcoming[taskId];

        return normalizeSettings(
          { ...currentSettings, upcomingTaskDates: nextUpcoming },
          routineData.zones,
        );
      });
      reconcileDailyLogForTasks(nextTasks);
    },
    [reconcileDailyLogForTasks, routineData, settings],
  );

  const updateTask = useCallback(
    (
      taskId: string,
      input: {
        title: string;
        block: RoutineBlockId;
        estimatedMinutes: number;
        zoneId?: string;
        cadence?: Task["cadence"];
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
      const nextCadence = input.cadence ?? taskToUpdate.cadence ?? "daily";
      const nextTasks = routineData.tasks.map((task) =>
        task.id === taskId
          ? {
              ...task,
              title,
              block: input.block,
              cadence: nextCadence,
              zoneId: input.zoneId || undefined,
              estimatedMinutes: Math.max(1, Math.round(input.estimatedMinutes || 1)),
              sortOrder: nextSortOrder,
              required: nextCadence !== "as_needed",
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
      reconcileDailyLogForTasks(nextTasks);
    },
    [reconcileDailyLogForTasks, routineData, settings.currentZoneIds],
  );

  const addAsNeededToToday = useCallback(
    (taskId: string) => {
      setDailyLog((currentLog) => {
        if (!currentLog) {
          return currentLog;
        }

        const existing = new Set(currentLog.asNeededOnTodayTaskIds ?? []);
        if (existing.has(taskId)) {
          return currentLog;
        }

        existing.add(taskId);
        const nextLog: DailyLog = {
          ...currentLog,
          asNeededOnTodayTaskIds: Array.from(existing),
          updatedAt: new Date().toISOString(),
        };
        const filtered = filterTasksForToday(
          routineData.tasks,
          settings.currentZoneIds,
          buildTodayFilterCtx(settings, nextLog),
        );
        const withBlocks = recalculateLogForTasks(nextLog, filtered);

        saveDailyLog(withBlocks);

        return withBlocks;
      });
    },
    [routineData.tasks, settings],
  );

  const updateUpcomingTaskDate = useCallback(
    (taskId: string, isoDate: string) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
        return;
      }

      setSettings((currentSettings) =>
        normalizeSettings(
          {
            ...currentSettings,
            upcomingTaskDates: {
              ...(currentSettings.upcomingTaskDates ?? {}),
              [taskId]: isoDate,
            },
          },
          routineData.zones,
        ),
      );
    },
    [routineData.zones],
  );

  const clearAllLocalData = useCallback(() => {
    clearLocalData();
    const nextSettings = defaultSettings;
    const nextRoutineData = createRoutineDataFromTemplate(
      getTemplateById(nextSettings.selectedTemplateId),
    );
    const nextLog = getTodayLog(
      filterTasksForToday(
        nextRoutineData.tasks,
        nextSettings.currentZoneIds,
        buildTodayFilterCtx(nextSettings, null),
      ),
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
    scheduleZoneForDate,
    removeZoneTomorrow,
    startTemplate,
    setTaskCompleted,
    addAsNeededToToday,
    updateUpcomingTaskDate,
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

function zoneScheduleCadenceKey(
  zoneId: string,
  context: ZoneScheduleCadenceContext,
): string {
  return `${zoneId}:${context}`;
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

  const upcomingTaskDates = Object.fromEntries(
    Object.entries(settings.upcomingTaskDates ?? {}).filter(
      ([, date]) => typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date),
    ),
  );

  const mergedLastByCadence: Record<string, string> = {
    ...(settings.lastZoneScheduleByCadence ?? {}),
  };

  const legacyLast = (
    settings as Partial<{ lastZoneScheduleDate?: Record<string, string> }>
  ).lastZoneScheduleDate;

  if (legacyLast) {
    for (const [legacyZoneId, date] of Object.entries(legacyLast)) {
      if (!validZoneIds.has(legacyZoneId)) {
        continue;
      }

      const key = zoneScheduleCadenceKey(legacyZoneId, "zone");
      if (
        !mergedLastByCadence[key] &&
        typeof date === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(date)
      ) {
        mergedLastByCadence[key] = date;
      }
    }
  }

  const lastZoneScheduleByCadence = Object.fromEntries(
    Object.entries(mergedLastByCadence).filter(([key, date]) => {
      const match = /^([^:]+):(monthly|seasonal|zone)$/.exec(key);
      if (!match) {
        return false;
      }

      const zoneId = match[1];
      const context = match[2];

      if (!validZoneIds.has(zoneId)) {
        return false;
      }

      if (context !== "monthly" && context !== "seasonal" && context !== "zone") {
        return false;
      }

      return typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date);
    }),
  );

  const settingsWithoutLegacySchedulePick = { ...settings } as Settings & {
    lastZoneScheduleDate?: Record<string, string>;
  };
  delete (settingsWithoutLegacySchedulePick as { lastZoneScheduleDate?: unknown })
    .lastZoneScheduleDate;

  return {
    ...defaultSettings,
    ...settingsWithoutLegacySchedulePick,
    selectedTemplateId,
    currentZoneIds,
    currentZoneId,
    scheduledZoneDates,
    upcomingTaskDates,
    lastZoneScheduleByCadence,
  };
}

type TodayFilterContext = {
  cleaningDate: string;
  upcomingTaskDates: Record<string, string>;
  asNeededOnTodayTaskIds: string[];
};

function buildTodayFilterCtx(
  settings: Settings,
  dailyLog: DailyLog | null,
): TodayFilterContext {
  return {
    cleaningDate: getCleaningDate(settings.resetTime),
    upcomingTaskDates: settings.upcomingTaskDates ?? {},
    asNeededOnTodayTaskIds: dailyLog?.asNeededOnTodayTaskIds ?? [],
  };
}

function createLocalId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function uniqueZoneIds(zoneIds: string[], validZoneIds: Set<string>): string[] {
  return Array.from(new Set(zoneIds.filter((zoneId) => validZoneIds.has(zoneId))));
}


/** Tasks in selected zones (any cadence) for validating stored log ids in getTodayLog. */
function tasksEligibleForDailyLog(tasks: Task[], selectedZoneIds: string[]): Task[] {
  const zoneSet = new Set(selectedZoneIds);

  return tasks.filter(
    (task) => task.active && task.zoneId && zoneSet.has(task.zoneId),
  );
}

function filterTasksForToday(
  tasks: Task[],
  selectedZoneIds: string[],
  ctx: TodayFilterContext,
): Task[] {
  const selectedZones = new Set(selectedZoneIds);
  const asNeededToday = new Set(ctx.asNeededOnTodayTaskIds);

  return tasks.filter((task) => {
    if (!task.active || !task.zoneId || !selectedZones.has(task.zoneId)) {
      return false;
    }

    const cadence = task.cadence ?? "daily";

    if (cadence === "daily") {
      return true;
    }

    if (cadence === "weekly") {
      return false;
    }

    if (cadence === "monthly" || cadence === "seasonal") {
      const due = ctx.upcomingTaskDates[task.id];
      if (!due) {
        return false;
      }

      return ctx.cleaningDate >= due;
    }

    if (cadence === "as_needed") {
      return asNeededToday.has(task.id);
    }

    return false;
  });
}

function recalculateLogForTasks(log: DailyLog, tasks: Task[]): DailyLog {
  const activeTaskIds = new Set(tasks.map((task) => task.id));
  const completedTaskIds = log.completedTaskIds.filter((taskId) =>
    activeTaskIds.has(taskId),
  );
  const asNeededOnTodayTaskIds = (log.asNeededOnTodayTaskIds ?? []).filter((taskId) =>
    activeTaskIds.has(taskId),
  );
  const blockCompletion = calculateCompletions(tasks, completedTaskIds);

  return {
    ...log,
    completedTaskIds,
    asNeededOnTodayTaskIds,
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
