"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { defaultZoneId, templates, zones } from "./data";
import { getCleaningDate } from "./date";
import { calculateCompletions, calculateDailyCompletion } from "./progress";
import {
  clearLocalData,
  defaultSettings,
  getTodayLog,
  loadSettings,
  saveDailyLog,
  saveSettings,
} from "./storage";
import type { DailyLog, RoutineTemplate, Settings } from "./types";

export function useCleaningApp() {
  const [isReady, setIsReady] = useState(false);
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [dailyLog, setDailyLog] = useState<DailyLog | null>(null);

  const template = useMemo(
    () => getTemplateById(settings.selectedTemplateId),
    [settings.selectedTemplateId],
  );
  const currentZone = useMemo(
    () => zones.find((zone) => zone.id === settings.currentZoneId) ?? zones[0],
    [settings.currentZoneId],
  );

  useEffect(() => {
    const storedSettings = normalizeSettings(loadSettings());
    const storedTemplate = getTemplateById(storedSettings.selectedTemplateId);

    setSettings(storedSettings);
    setDailyLog(getTodayLog(storedTemplate, storedSettings));
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

      return getTodayLog(template, settings);
    });
  }, [isReady, settings, template]);

  const updateSettings = useCallback((updates: Partial<Settings>) => {
    setSettings((currentSettings) => {
      const nextSettings = normalizeSettings({ ...currentSettings, ...updates });
      saveSettings(nextSettings);
      return nextSettings;
    });
  }, []);

  const startTemplate = useCallback((templateId: string) => {
    const nextTemplate = getTemplateById(templateId);

    setSettings((currentSettings) => {
      const nextSettings = normalizeSettings({
        ...currentSettings,
        selectedTemplateId: nextTemplate.id,
        firstRunComplete: true,
      });
      const date = getCleaningDate(nextSettings.resetTime);
      const blockCompletion = calculateCompletions(nextTemplate, []);
      const nextLog: DailyLog = {
        date,
        completedTaskIds: [],
        blockCompletion,
        dailyCompletion: calculateDailyCompletion(blockCompletion),
        updatedAt: new Date().toISOString(),
      };

      saveSettings(nextSettings);
      saveDailyLog(nextLog);
      setDailyLog(nextLog);

      return nextSettings;
    });
  }, []);

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
        const blockCompletion = calculateCompletions(template, completedTaskIds);
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
    [template],
  );

  const resetToday = useCallback(() => {
    const blockCompletion = calculateCompletions(template, []);
    const nextLog: DailyLog = {
      date: getCleaningDate(settings.resetTime),
      completedTaskIds: [],
      blockCompletion,
      dailyCompletion: calculateDailyCompletion(blockCompletion),
      updatedAt: new Date().toISOString(),
    };

    saveDailyLog(nextLog);
    setDailyLog(nextLog);
  }, [settings.resetTime, template]);

  const clearAllLocalData = useCallback(() => {
    clearLocalData();
    const nextSettings = defaultSettings;
    const nextTemplate = getTemplateById(nextSettings.selectedTemplateId);
    const nextLog = getTodayLog(nextTemplate, nextSettings);

    setSettings(nextSettings);
    setDailyLog(nextLog);
    setIsReady(true);
  }, []);

  return {
    isReady,
    settings,
    dailyLog,
    template,
    templates,
    zones,
    currentZone,
    updateSettings,
    startTemplate,
    setTaskCompleted,
    resetToday,
    clearAllLocalData,
  };
}

function getTemplateById(templateId: string): RoutineTemplate {
  return templates.find((candidate) => candidate.id === templateId) ?? templates[0];
}

function normalizeSettings(settings: Settings): Settings {
  const selectedTemplateId = templates.some((template) => template.id === settings.selectedTemplateId)
    ? settings.selectedTemplateId
    : defaultSettings.selectedTemplateId;
  const currentZoneId = zones.some((zone) => zone.id === settings.currentZoneId)
    ? settings.currentZoneId
    : defaultZoneId;

  return {
    ...defaultSettings,
    ...settings,
    selectedTemplateId,
    currentZoneId,
  };
}
