"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  defaultZoneId,
  routineBlocks,
  templates,
  zones as defaultZones,
} from "./data";
import { getCleaningDate } from "./date";
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
  const currentZone = useMemo(
    () =>
      routineData.zones.find((zone) => zone.id === settings.currentZoneId) ??
      routineData.zones[0] ??
      defaultZones[0],
    [routineData.zones, settings.currentZoneId],
  );

  useEffect(() => {
    const storedSettings = loadSettings();
    const storedTemplate = getTemplateById(storedSettings.selectedTemplateId);
    const storedRoutineData = loadRoutineData(storedTemplate);
    const normalizedSettings = normalizeSettings(storedSettings, storedRoutineData.zones);

    setSettings(normalizedSettings);
    setRoutineData(storedRoutineData);
    setDailyLog(getTodayLog(storedRoutineData.tasks, normalizedSettings));
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    setDailyLog((currentLog) => {
      const expectedDate = getCleaningDate(settings.resetTime);

      if (currentLog?.date === expectedDate) {
        return currentLog;
      }

      return getTodayLog(routineData.tasks, settings);
    });
  }, [isReady, routineData.tasks, settings]);

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
        const date = getCleaningDate(nextSettings.resetTime);
        const blockCompletion = calculateCompletions(nextRoutineData.tasks, []);
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
        const activeTaskIds = new Set(nextTasks.map((task) => task.id));
        const completedTaskIds = baseLog.completedTaskIds.filter((taskId) =>
          activeTaskIds.has(taskId),
        );
        const blockCompletion = calculateCompletions(nextTasks, completedTaskIds);
        const nextLog: DailyLog = {
          ...baseLog,
          completedTaskIds,
          blockCompletion,
          dailyCompletion: calculateDailyCompletion(blockCompletion),
          updatedAt: new Date().toISOString(),
        };

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
          routineData.tasks,
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
    [routineData.tasks],
  );

  const resetToday = useCallback(() => {
    const blockCompletion = calculateCompletions(routineData.tasks, []);
    const nextLog: DailyLog = {
      date: getCleaningDate(settings.resetTime),
      completedTaskIds: [],
      blockCompletion,
      dailyCompletion: calculateDailyCompletion(blockCompletion),
      updatedAt: new Date().toISOString(),
    };

    saveDailyLog(nextLog);
    setDailyLog(nextLog);
  }, [routineData.tasks, settings.resetTime]);

  const addZone = useCallback(
    (input: { name: string; description: string }) => {
      const name = input.name.trim();

      if (!name) {
        return;
      }

      const nextZone: Zone = {
        id: createLocalId("zone"),
        name,
        description:
          input.description.trim() ||
          "A custom apartment zone for your local routine.",
        sortOrder: routineData.zones.length + 1,
        active: true,
        suggestedTasks: [],
      };
      const nextRoutineData = {
        ...routineData,
        zones: [...routineData.zones, nextZone],
        updatedAt: new Date().toISOString(),
      };
      const nextSettings = normalizeSettings(
        { ...settings, currentZoneId: nextZone.id },
        nextRoutineData.zones,
      );

      saveRoutineData(nextRoutineData);
      saveSettings(nextSettings);
      setRoutineData(nextRoutineData);
      setSettings(nextSettings);
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

      saveRoutineData(nextRoutineData);
      saveSettings(nextSettings);
      setRoutineData(nextRoutineData);
      setSettings(nextSettings);
      reconcileDailyLogForTasks(nextTasks);
    },
    [reconcileDailyLogForTasks, routineData, settings],
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
      reconcileDailyLogForTasks(nextTasks);
    },
    [reconcileDailyLogForTasks, routineData],
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
      reconcileDailyLogForTasks(nextTasks);
    },
    [reconcileDailyLogForTasks, routineData],
  );

  const clearAllLocalData = useCallback(() => {
    clearLocalData();
    const nextSettings = defaultSettings;
    const nextRoutineData = createRoutineDataFromTemplate(
      getTemplateById(nextSettings.selectedTemplateId),
    );
    const nextLog = getTodayLog(nextRoutineData.tasks, nextSettings);

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
    currentZone,
    routineBlocks,
    updateSettings,
    startTemplate,
    setTaskCompleted,
    resetToday,
    addZone,
    deleteZone,
    addTask,
    deleteTask,
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
  const currentZoneId = zones.some((zone) => zone.id === settings.currentZoneId)
    ? settings.currentZoneId
    : (zones[0]?.id ?? defaultZoneId);

  return {
    ...defaultSettings,
    ...settings,
    selectedTemplateId,
    currentZoneId,
  };
}

function createLocalId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
