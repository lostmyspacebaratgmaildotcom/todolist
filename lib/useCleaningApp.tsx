"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  defaultZoneId,
  routineBlocks,
  templates,
  zones as defaultZones,
} from "./data";
import { formatLocalDate, getCleaningDate, getLocalCalendarDate } from "./date";
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

/** Legacy weekly pick key before per-zone weekly schedules (`{zoneId}:weekly`). Used as read fallback and migration source. */
const LEGACY_WEEKLY_SCHEDULE_ZONE_ID = "kitchen";

function useCleaningAppState() {
  const [isReady, setIsReady] = useState(false);
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [routineData, setRoutineData] = useState<EditableRoutineData>(() =>
    createRoutineDataFromTemplate(getTemplateById(defaultSettings.selectedTemplateId)),
  );
  const [dailyLog, setDailyLog] = useState<DailyLog | null>(null);
  const [calendarDay, setCalendarDay] = useState(() => getLocalCalendarDate());
  const [asNeededLocalPins, setAsNeededLocalPins] = useState<Set<string>>(() => new Set());

  const settingsRef = useRef(settings);
  const routineRef = useRef(routineData);
  const lastCleaningDateRef = useRef<string | null>(null);
  /** Tracks reset time across layout sync so we can tell a routine-day change caused by reset vs calendar rollover. */
  const lastResetTimeForLogRef = useRef<string | null>(null);

  useEffect(() => {
    settingsRef.current = settings;
    routineRef.current = routineData;
  }, [settings, routineData]);

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
        buildTodayFilterCtx(settings, dailyLog, routineData.zones),
      ),
    [routineData.tasks, routineData.zones, selectedZoneIds, settings, dailyLog, calendarDay],
  );

  useEffect(() => {
    const tick = () => {
      const next = getLocalCalendarDate();
      setCalendarDay((prev) => (prev === next ? prev : next));
    };
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    setAsNeededLocalPins(new Set());
  }, [calendarDay]);

  useEffect(() => {
    const cal = getLocalCalendarDate();
    setAsNeededLocalPins((prev) => {
      if (prev.size === 0) {
        return prev;
      }

      const upcoming = settings.upcomingTaskDates ?? {};
      const next = new Set(prev);
      for (const id of prev) {
        if (upcoming[id] === cal) {
          next.delete(id);
        }
      }

      return next.size === prev.size ? prev : next;
    });
  }, [settings.upcomingTaskDates, calendarDay]);

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
          buildTodayFilterCtx(normalizedSettings, null, storedRoutineData.zones),
        ),
        normalizedSettings,
      ),
    );
    setIsReady(true);
  }, []);

  useLayoutEffect(() => {
    if (!isReady) {
      return;
    }

    const prevResetTime = lastResetTimeForLogRef.current;
    const resetTimeShiftedRoutineDay =
      prevResetTime !== null && prevResetTime !== settings.resetTime;

    let workingSettings = settings;

    if (resetTimeShiftedRoutineDay) {
      const oldCleaningDay = getCleaningDate(prevResetTime);
      const newCleaningDay = getCleaningDate(settings.resetTime);
      if (oldCleaningDay !== newCleaningDay) {
        const remappedScheduled = remapScheduledZoneDatesForCleaningDayShift(
          settings.scheduledZoneDates,
          oldCleaningDay,
          newCleaningDay,
        );
        if (remappedScheduled !== settings.scheduledZoneDates) {
          workingSettings = normalizeSettings(
            { ...settings, scheduledZoneDates: remappedScheduled },
            routineData.zones,
          );
          saveSettings(workingSettings);
          setSettings(workingSettings);
        }
      }
    }

    setDailyLog((currentLog) => {
      const expectedDate = getCleaningDate(workingSettings.resetTime);
      const filteredTasks = filterTasksForToday(
        routineData.tasks,
        selectedZoneIds,
        buildTodayFilterCtx(workingSettings, currentLog, routineData.zones),
      );

      if (currentLog?.date === expectedDate) {
        const nextLog = recalculateLogForTasks(currentLog, filteredTasks);
        saveDailyLog(nextLog);
        return nextLog;
      }

      const ctxForNewRoutineDay = buildTodayFilterCtx(
        workingSettings,
        resetTimeShiftedRoutineDay ? currentLog : null,
        routineData.zones,
      );
      const filteredForNewRoutineDay = filterTasksForToday(
        routineData.tasks,
        selectedZoneIds,
        ctxForNewRoutineDay,
      );

      let nextLog: DailyLog;
      if (resetTimeShiftedRoutineDay && currentLog) {
        nextLog = recalculateLogForTasks(
          {
            ...currentLog,
            date: expectedDate,
            updatedAt: new Date().toISOString(),
          },
          filteredForNewRoutineDay,
        );
      } else {
        nextLog = getTodayLog(filteredForNewRoutineDay, workingSettings);
      }

      saveDailyLog(nextLog);
      return nextLog;
    });

    lastResetTimeForLogRef.current = settings.resetTime;
  }, [isReady, settings, routineData.tasks, routineData.zones, selectedZoneIds, calendarDay]);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    lastCleaningDateRef.current = null;

    const maybeRolloverCleaningDay = () => {
      const currentSettings = settingsRef.current;
      const zones = routineRef.current.zones;
      const tasks = routineRef.current.tasks;
      const nextCleaning = getCleaningDate(currentSettings.resetTime);
      const prevCleaning = lastCleaningDateRef.current;

      if (prevCleaning === null) {
        lastCleaningDateRef.current = nextCleaning;
        return;
      }

      if (prevCleaning === nextCleaning) {
        return;
      }

      const calendar = getLocalCalendarDate();
      const upcoming = { ...(currentSettings.upcomingTaskDates ?? {}) };
      let changedUpcoming = false;
      for (const [taskId, date] of Object.entries(upcoming)) {
        if (date === calendar) {
          delete upcoming[taskId];
          changedUpcoming = true;
        }
      }

      const lastMap = { ...(currentSettings.lastZoneScheduleByCadence ?? {}) };
      let changedLast = false;
      for (const [key, date] of Object.entries(lastMap)) {
        if (date === calendar) {
          delete lastMap[key];
          changedLast = true;
        }
      }

      let nextSettings = currentSettings;
      if (changedUpcoming || changedLast) {
        nextSettings = normalizeSettings(
          {
            ...currentSettings,
            ...(changedUpcoming ? { upcomingTaskDates: upcoming } : {}),
            ...(changedLast ? { lastZoneScheduleByCadence: lastMap } : {}),
          },
          zones,
        );
        saveSettings(nextSettings);
        setSettings(nextSettings);
      }

      setAsNeededLocalPins(new Set());

      const nextLog = getTodayLog(
        tasksEligibleForDailyLog(
          tasks,
          zones.map((zone) => zone.id),
        ),
        nextSettings,
      );
      saveDailyLog(nextLog);
      setDailyLog(nextLog);

      lastCleaningDateRef.current = nextCleaning;
    };

    maybeRolloverCleaningDay();
    const intervalId = window.setInterval(maybeRolloverCleaningDay, 5_000);

    return () => {
      window.clearInterval(intervalId);
      lastCleaningDateRef.current = null;
    };
  }, [isReady, settings.resetTime]);

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
          tasksEligibleForDailyLog(
            routineData.tasks,
            routineData.zones.map((zone) => zone.id),
          ),
          settings,
        );
      });
    }, 30_000);

    return () => clearInterval(intervalId);
  }, [isReady, settings, routineData.tasks, selectedZoneIds, routineData.zones, calendarDay]);

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
        const cleaningToday = getCleaningDate(currentSettings.resetTime);
        const calendarToday = getLocalCalendarDate();
        const reflectsOnTodayTab =
          isoDate === calendarToday || isoDate === cleaningToday;

        let nextZoneIds = currentSettings.currentZoneIds;
        if (reflectsOnTodayTab) {
          if (context === "weekly") {
            nextZoneIds = Array.from(
              new Set([...currentSettings.currentZoneIds, zoneId]),
            );
          } else {
            nextZoneIds = Array.from(
              new Set([...currentSettings.currentZoneIds, zoneId]),
            );
          }
        }

        const mergedUpcoming = {
          ...(currentSettings.upcomingTaskDates ?? {}),
        };
        let changedUpcoming = false;
        if (context === "weekly") {
          for (const task of routineData.tasks) {
            if (!task.active || task.cadence !== "weekly" || task.zoneId !== zoneId) {
              continue;
            }
            mergedUpcoming[task.id] = isoDate;
            changedUpcoming = true;
          }
        } else {
          for (const task of routineData.tasks) {
            if (!task.active || task.zoneId !== zoneId) {
              continue;
            }
            const cadence = task.cadence ?? "daily";
            const shouldSyncDueWithSchedule =
              (context === "monthly" && cadence === "monthly") ||
              (context === "seasonal" && cadence === "seasonal") ||
              (context === "zone" && (cadence === "monthly" || cadence === "seasonal"));
            if (shouldSyncDueWithSchedule) {
              mergedUpcoming[task.id] = isoDate;
              changedUpcoming = true;
            }
          }
        }

        const nextSettings = normalizeSettings(
          {
            ...currentSettings,
            ...(reflectsOnTodayTab
              ? {
                  currentZoneId: nextZoneIds[0] ?? currentSettings.currentZoneId,
                  currentZoneIds: nextZoneIds,
                }
              : {}),
            ...(changedUpcoming ? { upcomingTaskDates: mergedUpcoming } : {}),
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
          buildTodayFilterCtx(nextSettings, null, nextRoutineData.zones),
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
        const ctx = buildTodayFilterCtx(settings, currentLog, routineData.zones);
        const filtered = filterTasksForToday(
          nextTasks,
          selectedZoneIds,
          ctx,
        );
        const baseLog = currentLog ?? getTodayLog(filtered, settings);
        const nextLog = recalculateLogForTasks(baseLog, filtered);

        saveDailyLog(nextLog);

        return nextLog;
      });
    },
    [routineData.tasks, routineData.zones, selectedZoneIds, settings, calendarDay],
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
    const cal = getLocalCalendarDate();
    setSettings((currentSettings) => {
      const upcoming = { ...(currentSettings.upcomingTaskDates ?? {}) };
      let changed = false;
      for (const task of routineData.tasks) {
        if (task.cadence === "as_needed" && upcoming[task.id] === cal) {
          delete upcoming[task.id];
          changed = true;
        }
      }

      if (!changed) {
        return currentSettings;
      }

      return normalizeSettings(
        { ...currentSettings, upcomingTaskDates: upcoming },
        routineData.zones,
      );
    });

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
  }, [routineData.tasks, routineData.zones, settings.resetTime, todayTasks]);

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
      const calendarToday = getLocalCalendarDate();
      const taskMeta = routineData.tasks.find((candidate) => candidate.id === taskId);
      const zoneId = taskMeta?.zoneId;

      setAsNeededLocalPins((prev) => {
        const next = new Set(prev);
        next.add(taskId);
        return next;
      });

      setSettings((currentSettings) => {
        const upcoming = currentSettings.upcomingTaskDates ?? {};
        if (upcoming[taskId] === calendarToday) {
          const nextSettings = currentSettings;
          return nextSettings;
        }

        let currentZoneIds = currentSettings.currentZoneIds;
        if (zoneId && !currentZoneIds.includes(zoneId)) {
          currentZoneIds = [...currentZoneIds, zoneId];
        }

        const nextSettings = normalizeSettings(
          {
            ...currentSettings,
            currentZoneIds,
            currentZoneId: currentZoneIds[0] ?? currentSettings.currentZoneId,
            upcomingTaskDates: {
              ...upcoming,
              [taskId]: calendarToday,
            },
          },
          routineData.zones,
        );

        saveSettings(nextSettings);

        return nextSettings;
      });

      setDailyLog((currentLog) => {
        if (!currentLog) {
          return currentLog;
        }

        const ids = currentLog.asNeededOnTodayTaskIds ?? [];
        if (!ids.includes(taskId)) {
          return currentLog;
        }

        const nextLog: DailyLog = {
          ...currentLog,
          asNeededOnTodayTaskIds: ids.filter((id) => id !== taskId),
          updatedAt: new Date().toISOString(),
        };

        saveDailyLog(nextLog);

        return nextLog;
      });
    },
    [routineData.tasks, routineData.zones],
  );

  const removeAsNeededFromToday = useCallback(
    (taskId: string) => {
      const calendarToday = getLocalCalendarDate();

      setAsNeededLocalPins((prev) => {
        if (!prev.has(taskId)) {
          return prev;
        }

        const next = new Set(prev);
        next.delete(taskId);

        return next;
      });

      setSettings((currentSettings) => {
        const upcoming = { ...(currentSettings.upcomingTaskDates ?? {}) };

        if (upcoming[taskId] !== calendarToday) {
          return currentSettings;
        }

        delete upcoming[taskId];

        const nextSettings = normalizeSettings(
          {
            ...currentSettings,
            upcomingTaskDates: upcoming,
          },
          routineData.zones,
        );

        saveSettings(nextSettings);

        return nextSettings;
      });

      setDailyLog((currentLog) => {
        if (!currentLog) {
          return currentLog;
        }

        const ids = currentLog.asNeededOnTodayTaskIds ?? [];

        if (!ids.includes(taskId)) {
          return currentLog;
        }

        const nextLog: DailyLog = {
          ...currentLog,
          asNeededOnTodayTaskIds: ids.filter((id) => id !== taskId),
          updatedAt: new Date().toISOString(),
        };

        saveDailyLog(nextLog);

        return nextLog;
      });
    },
    [routineData.zones],
  );

  const updateUpcomingTaskDate = useCallback(
    (taskId: string, isoDate: string) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
        return;
      }

      setSettings((currentSettings) => {
        const nextSettings = normalizeSettings(
          {
            ...currentSettings,
            upcomingTaskDates: {
              ...(currentSettings.upcomingTaskDates ?? {}),
              [taskId]: isoDate,
            },
          },
          routineData.zones,
        );

        saveSettings(nextSettings);

        return nextSettings;
      });
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
        buildTodayFilterCtx(nextSettings, null, nextRoutineData.zones),
      ),
      nextSettings,
    );

    setSettings(nextSettings);
    setRoutineData(nextRoutineData);
    setDailyLog(nextLog);
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    const legacy = dailyLog?.asNeededOnTodayTaskIds ?? [];
    if (legacy.length === 0) {
      return;
    }

    const cal = getLocalCalendarDate();
    setSettings((currentSettings) => {
      const upcoming = { ...(currentSettings.upcomingTaskDates ?? {}) };
      let changed = false;
      for (const id of legacy) {
        const task = routineData.tasks.find((candidate) => candidate.id === id);
        if (task?.cadence === "as_needed" && !upcoming[id]) {
          upcoming[id] = cal;
          changed = true;
        }
      }

      if (!changed) {
        return currentSettings;
      }

      return normalizeSettings(
        { ...currentSettings, upcomingTaskDates: upcoming },
        routineData.zones,
      );
    });

    setDailyLog((log) =>
      log && (log.asNeededOnTodayTaskIds?.length ?? 0) > 0
        ? {
            ...log,
            asNeededOnTodayTaskIds: [],
            updatedAt: new Date().toISOString(),
          }
        : log,
    );
  }, [
    isReady,
    calendarDay,
    routineData.tasks,
    routineData.zones,
    dailyLog?.date,
    dailyLog?.asNeededOnTodayTaskIds?.join(","),
  ]);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    const legacyKey = `${LEGACY_WEEKLY_SCHEDULE_ZONE_ID}:weekly`;
    const legacyPick = settings.lastZoneScheduleByCadence?.[legacyKey];
    if (typeof legacyPick !== "string") {
      return;
    }

    const zoneIds = new Set(
      routineData.tasks
        .filter(
          (task) => task.active && task.cadence === "weekly" && task.zoneId,
        )
        .map((task) => task.zoneId as string),
    );

    const needsBackfill = [...zoneIds].some((zoneId) => {
      const key = `${zoneId}:weekly`;
      const value = settings.lastZoneScheduleByCadence?.[key];

      return typeof value !== "string";
    });

    if (!needsBackfill) {
      return;
    }

    setSettings((currentSettings) => {
      const map = { ...(currentSettings.lastZoneScheduleByCadence ?? {}) };
      const legacy = map[legacyKey];

      if (typeof legacy !== "string") {
        return currentSettings;
      }

      let changed = false;

      for (const zoneId of zoneIds) {
        const key = `${zoneId}:weekly`;

        if (typeof map[key] !== "string") {
          map[key] = legacy;
          changed = true;
        }
      }

      if (!changed) {
        return currentSettings;
      }

      const nextSettings = normalizeSettings(
        { ...currentSettings, lastZoneScheduleByCadence: map },
        routineData.zones,
      );

      saveSettings(nextSettings);

      return nextSettings;
    });
  }, [
    isReady,
    routineData.tasks,
    routineData.zones,
    settings.lastZoneScheduleByCadence,
  ]);

  const asNeededForCalendarTodayIds = useMemo(() => {
    const cal = getLocalCalendarDate();
    const ids = new Set<string>();
    const upcoming = settings.upcomingTaskDates ?? {};

    for (const [taskId, date] of Object.entries(upcoming)) {
      if (date !== cal) {
        continue;
      }

      const task = routineData.tasks.find((candidate) => candidate.id === taskId);
      const cadence = task?.cadence ?? "daily";
      if (!task || cadence === "as_needed") {
        ids.add(taskId);
      }
    }

    for (const id of dailyLog?.asNeededOnTodayTaskIds ?? []) {
      const task = routineData.tasks.find((candidate) => candidate.id === id);
      if (task?.cadence === "as_needed") {
        ids.add(id);
      }
    }

    for (const id of asNeededLocalPins) {
      ids.add(id);
    }

    return ids;
  }, [
    asNeededLocalPins,
    calendarDay,
    dailyLog?.asNeededOnTodayTaskIds,
    routineData.tasks,
    settings.upcomingTaskDates,
  ]);

  const todayTabCalendarDate = getLocalCalendarDate();

  return {
    isReady,
    settings,
    dailyLog,
    todayTabCalendarDate,
    template,
    templates,
    zones: routineData.zones,
    routineTasks: routineData.tasks,
    todayTasks,
    asNeededForCalendarTodayIds,
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
    removeAsNeededFromToday,
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

export type CleaningAppContextValue = ReturnType<typeof useCleaningAppState>;

const CleaningAppContext = createContext<CleaningAppContextValue | null>(null);

export function CleaningAppProvider({ children }: { children: ReactNode }) {
  const value = useCleaningAppState();

  return <CleaningAppContext.Provider value={value}>{children}</CleaningAppContext.Provider>;
}

export function useCleaningApp(): CleaningAppContextValue {
  const value = useContext(CleaningAppContext);

  if (!value) {
    throw new Error("useCleaningApp must be used within CleaningAppProvider");
  }

  return value;
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
      const match = /^([^:]+):(monthly|seasonal|zone|weekly)$/.exec(key);
      if (!match) {
        return false;
      }

      const zoneId = match[1];
      const context = match[2];

      if (!validZoneIds.has(zoneId)) {
        return false;
      }

      if (
        context !== "monthly" &&
        context !== "seasonal" &&
        context !== "zone" &&
        context !== "weekly"
      ) {
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
  /** Local calendar YYYY-MM-DD (Today tab headline); not shifted by reset time. */
  calendarToday: string;
  upcomingTaskDates: Record<string, string>;
  asNeededOnTodayTaskIds: string[];
  lastZoneScheduleByCadence: Record<string, string>;
  /** Zone ids in the current routine; dailies are always eligible from these zones. */
  routineZoneIds: string[];
};

function buildTodayFilterCtx(
  settings: Settings,
  dailyLog: DailyLog | null,
  zones: Zone[],
): TodayFilterContext {
  return {
    cleaningDate: getCleaningDate(settings.resetTime),
    calendarToday: getLocalCalendarDate(),
    upcomingTaskDates: settings.upcomingTaskDates ?? {},
    asNeededOnTodayTaskIds: dailyLog?.asNeededOnTodayTaskIds ?? [],
    lastZoneScheduleByCadence: settings.lastZoneScheduleByCadence ?? {},
    routineZoneIds: zones.map((zone) => zone.id),
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
  const routineZones = new Set(ctx.routineZoneIds);
  const asNeededToday = new Set(ctx.asNeededOnTodayTaskIds);

  return tasks.filter((task) => {
    if (!task.active || !task.zoneId || !routineZones.has(task.zoneId)) {
      return false;
    }

    const cadence = task.cadence ?? "daily";

    if (cadence === "daily") {
      return true;
    }

    if (cadence === "as_needed") {
      const scheduled = ctx.upcomingTaskDates[task.id];
      if (typeof scheduled === "string" && scheduled === ctx.calendarToday) {
        return true;
      }
      if (asNeededToday.has(task.id)) {
        return selectedZones.has(task.zoneId);
      }
      return false;
    }

    if (!selectedZones.has(task.zoneId)) {
      return false;
    }

    if (cadence === "weekly") {
      const zoneId = task.zoneId;
      const pickKey =
        typeof zoneId === "string" && zoneId.length > 0
          ? `${zoneId}:weekly`
          : `${LEGACY_WEEKLY_SCHEDULE_ZONE_ID}:weekly`;
      let scheduledPick = ctx.lastZoneScheduleByCadence[pickKey];
      if (typeof scheduledPick !== "string") {
        scheduledPick =
          ctx.lastZoneScheduleByCadence[
            `${LEGACY_WEEKLY_SCHEDULE_ZONE_ID}:weekly`
          ];
      }
      if (
        typeof scheduledPick === "string" &&
        scheduledPick === ctx.calendarToday
      ) {
        return true;
      }
      const due = ctx.upcomingTaskDates[task.id];
      if (!due) {
        return false;
      }

      return ctx.cleaningDate >= due;
    }

    if (cadence === "monthly" || cadence === "seasonal") {
      const pickKey =
        cadence === "monthly"
          ? `${task.zoneId}:monthly`
          : `${task.zoneId}:seasonal`;
      const scheduledPick = ctx.lastZoneScheduleByCadence[pickKey];
      if (
        typeof scheduledPick === "string" &&
        scheduledPick === ctx.calendarToday
      ) {
        return true;
      }
      const due = ctx.upcomingTaskDates[task.id];
      if (!due) {
        return false;
      }

      return ctx.cleaningDate >= due;
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

function remapScheduledZoneDatesForCleaningDayShift(
  scheduled: Record<string, string[]> | undefined,
  oldDay: string,
  newDay: string,
): Record<string, string[]> {
  const base = scheduled ?? {};
  if (oldDay === newDay) {
    return base;
  }

  let changed = false;
  const next: Record<string, string[]> = { ...base };

  for (const [zoneId, dates] of Object.entries(base)) {
    if (!dates.includes(oldDay)) {
      continue;
    }

    changed = true;
    const mapped = Array.from(new Set(dates.map((d) => (d === oldDay ? newDay : d))));
    if (mapped.length === 0) {
      delete next[zoneId];
    } else {
      next[zoneId] = mapped;
    }
  }

  return changed ? next : base;
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
