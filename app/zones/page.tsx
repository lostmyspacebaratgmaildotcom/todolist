"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import type {
  Task,
  TaskCadence,
  ZoneScheduleCadenceContext,
} from "@/lib/types";
import { getCleaningDate, getLocalCalendarDate } from "@/lib/date";
import { getZoneDailyResetTasks, sortTasks } from "@/lib/progress";
import { useCleaningApp } from "@/lib/useCleaningApp";

function readCadenceSchedulePick(
  map: Record<string, string> | undefined,
  zoneId: string,
  context: ZoneScheduleCadenceContext,
): string | null {
  const raw = map?.[`${zoneId}:${context}`];
  if (typeof raw === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }

  return null;
}

function readWeeklySchedulePick(
  map: Record<string, string> | undefined,
  zoneId: string,
): string | null {
  const direct = readCadenceSchedulePick(map, zoneId, "weekly");
  if (direct) {
    return direct;
  }

  return readCadenceSchedulePick(map, "kitchen", "weekly");
}

export default function ZonesPage() {
  const {
    zones,
    selectedZoneIds,
    routineTasks,
    dailyLog,
    settings,
    scheduleZoneForDate,
    addAsNeededToToday,
    removeAsNeededFromToday,
    asNeededForCalendarTodayIds,
  } = useCleaningApp();

  const completedTaskIds = new Set(dailyLog?.completedTaskIds ?? []);
  const asNeededOnTodayIds = asNeededForCalendarTodayIds;

  const [expandedCadence, setExpandedCadence] = useState<{
    zoneId: string;
    cadence: TaskCadence;
  } | null>(null);
  const [scheduleTargetZoneId, setScheduleTargetZoneId] = useState<string | null>(
    null,
  );
  const [scheduleTargetCadence, setScheduleTargetCadence] =
    useState<ZoneScheduleCadenceContext | null>(null);
  const [scheduleDateValue, setScheduleDateValue] = useState("");

  function openScheduleDialog(zoneId: string, cadence: ZoneScheduleCadenceContext) {
    setScheduleTargetZoneId(zoneId);
    setScheduleTargetCadence(cadence);
    const savedPick =
      cadence === "weekly"
        ? readWeeklySchedulePick(settings.lastZoneScheduleByCadence, zoneId)
        : readCadenceSchedulePick(
            settings.lastZoneScheduleByCadence,
            zoneId,
            cadence,
          );
    setScheduleDateValue(savedPick ?? getLocalCalendarDate());
  }

  function toggleCadence(zoneId: string, cadence: TaskCadence) {
    if (
      expandedCadence?.zoneId === zoneId &&
      expandedCadence?.cadence === cadence
    ) {
      setExpandedCadence(null);
    } else {
      setExpandedCadence({ zoneId, cadence });
    }
  }

  return (
    <AppShell>
      <PageHeader
        eyebrow="Zones"
        title="Your zones"
        description="Spaces you maintain."
        action={
          <Link
            href="/manage"
            className="rounded-2xl bg-emerald-950 px-4 py-3 text-sm font-black text-white transition hover:bg-emerald-900"
          >
            Manage
          </Link>
        }
      />

      <div className="space-y-4">
        {zones.map((zone) => {
          const isSelected = selectedZoneIds.includes(zone.id);
          const zoneTasks = routineTasks.filter(
            (task) => task.zoneId === zone.id,
          );
          const dailyTasks = zoneTasks.filter(
            (t) => !t.cadence || t.cadence === "daily",
          );
          const dailyResetTasks = getZoneDailyResetTasks(routineTasks, zone.id);
          const monthlyTasks = zoneTasks.filter((t) => t.cadence === "monthly");
          const seasonalTasks = zoneTasks.filter(
            (t) => t.cadence === "seasonal",
          );
          const adHocTasks = zoneTasks.filter((t) => t.cadence === "as_needed");
          const weeklyTasks = sortTasks(
            zoneTasks.filter((t) => t.cadence === "weekly"),
          );
          const dailyMinutes = dailyTasks.reduce(
            (s, t) => s + t.estimatedMinutes,
            0,
          );

          const cleaningDate = getCleaningDate(settings.resetTime);
          const zoneScheduledDates = settings.scheduledZoneDates?.[zone.id] ?? [];
          const futureScheduledDates = zoneScheduledDates.filter(
            (date) => date > cleaningDate,
          );
          const nextFutureSchedule =
            [...futureScheduledDates].sort()[0] ?? null;
          const scheduledForTodayNotStarted =
            zoneScheduledDates.includes(cleaningDate);
          const showScheduledZoneState =
            Boolean(nextFutureSchedule) || scheduledForTodayNotStarted;

          const upcomingDates = settings.upcomingTaskDates ?? {};
          const monthlyUpcomingScheduled = cadenceTasksQueuedForLater(
            monthlyTasks,
            cleaningDate,
            upcomingDates,
          );
          const seasonalUpcomingScheduled = cadenceTasksQueuedForLater(
            seasonalTasks,
            cleaningDate,
            upcomingDates,
          );

          const byCadence = settings.lastZoneScheduleByCadence;
          const lastMonthlyPick = readCadenceSchedulePick(byCadence, zone.id, "monthly");
          const lastSeasonalPick = readCadenceSchedulePick(byCadence, zone.id, "seasonal");
          const lastZonePick = readCadenceSchedulePick(byCadence, zone.id, "zone");
          const lastWeeklyPick = readWeeklySchedulePick(byCadence, zone.id);

          const zoneScheduledSummaryIso = showScheduledZoneState
            ? lastZonePick ?? nextFutureSchedule ?? cleaningDate
            : null;
          const earliestMonthlyDue = getEarliestQueuedDueDate(
            monthlyTasks,
            upcomingDates,
            cleaningDate,
          );
          const earliestSeasonalDue = getEarliestQueuedDueDate(
            seasonalTasks,
            upcomingDates,
            cleaningDate,
          );

          return (
            <Fragment key={zone.id}>
            <article
              className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-stone-200"
            >
              <div className="min-w-0">
                <h2 className="text-xl font-black text-stone-950">
                  {zone.name}
                </h2>
                {!(
                  showScheduledZoneState && zoneScheduledSummaryIso
                ) ? (
                  <p className="mt-1 text-sm font-semibold text-stone-600">
                    {dailyTasks.length} task
                    {dailyTasks.length === 1 ? "" : "s"} today,{" "}
                    {dailyMinutes} min
                  </p>
                ) : null}
              </div>

              <div className="mt-4 space-y-2">
                    {dailyResetTasks.length > 0 ? (
                    <CadenceRow
                      label="Daily reset"
                      status="Active"
                      tasks={dailyResetTasks}
                      isExpanded={
                        expandedCadence?.zoneId === zone.id &&
                        expandedCadence?.cadence === "daily"
                      }
                      showViewTasks={true}
                      onToggle={() => toggleCadence(zone.id, "daily")}
                      completedTaskIds={completedTaskIds}
                    />
                    ) : null}
                    {weeklyTasks.length > 0 ? (
                      <CadenceRow
                        label="Weekly care"
                        status={
                          lastWeeklyPick
                            ? scheduledOnBlurb(lastWeeklyPick)
                            : "Due this week"
                        }
                        tasks={weeklyTasks}
                        isExpanded={
                          expandedCadence?.zoneId === zone.id &&
                          expandedCadence?.cadence === "weekly"
                        }
                        showViewTasks={isSelected}
                        onToggle={() => toggleCadence(zone.id, "weekly")}
                        completedTaskIds={completedTaskIds}
                        onSchedule={() => openScheduleDialog(zone.id, "weekly")}
                        scheduleAriaLabel="Schedule weekly care"
                      />
                    ) : null}
                    {monthlyTasks.length > 0 || seasonalTasks.length > 0 ? (
                      <div className="space-y-2">
                        {monthlyTasks.length > 0 ? (
                          <CadenceRow
                            label="Monthly care"
                            status={
                              lastMonthlyPick
                                ? scheduledOnBlurb(lastMonthlyPick)
                                : monthlyUpcomingScheduled && earliestMonthlyDue
                                  ? scheduledOnBlurb(earliestMonthlyDue)
                                  : "Due this month"
                            }
                            tasks={monthlyTasks}
                            isExpanded={
                              expandedCadence?.zoneId === zone.id &&
                              expandedCadence?.cadence === "monthly"
                            }
                            showViewTasks={isSelected}
                            onToggle={() => toggleCadence(zone.id, "monthly")}
                            completedTaskIds={completedTaskIds}
                            onSchedule={() => openScheduleDialog(zone.id, "monthly")}
                            scheduleAriaLabel={`Schedule ${zone.name}`}
                          />
                        ) : null}
                        {seasonalTasks.length > 0 ? (
                          <CadenceRow
                            label="Seasonal projects"
                            status={
                              lastSeasonalPick
                                ? scheduledOnBlurb(lastSeasonalPick)
                                : seasonalUpcomingScheduled && earliestSeasonalDue
                                  ? scheduledOnBlurb(earliestSeasonalDue)
                                  : "Due this quarter"
                            }
                            tasks={seasonalTasks}
                            isExpanded={
                              expandedCadence?.zoneId === zone.id &&
                              expandedCadence?.cadence === "seasonal"
                            }
                            showViewTasks={isSelected}
                            onToggle={() => toggleCadence(zone.id, "seasonal")}
                            completedTaskIds={completedTaskIds}
                            onSchedule={() => openScheduleDialog(zone.id, "seasonal")}
                            scheduleAriaLabel={`Schedule ${zone.name}`}
                          />
                        ) : null}
                      </div>
                    ) : null}
                    {adHocTasks.length > 0 ? (
                      <CadenceRow
                        label="As needed"
                        status="When you notice"
                        tasks={adHocTasks}
                        isExpanded={
                          expandedCadence?.zoneId === zone.id &&
                          expandedCadence?.cadence === "as_needed"
                        }
                        showViewTasks={isSelected}
                        onToggle={() => toggleCadence(zone.id, "as_needed")}
                        completedTaskIds={completedTaskIds}
                        onAddAsNeededToToday={addAsNeededToToday}
                        onRemoveAsNeededFromToday={removeAsNeededFromToday}
                        asNeededOnTodayIds={asNeededOnTodayIds}
                      />
                    ) : null}
                  </div>
            </article>
            </Fragment>
          );
        })}
      </div>

      {scheduleTargetZoneId ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setScheduleTargetZoneId(null);
              setScheduleTargetCadence(null);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="schedule-dialog-title"
            className="w-full max-w-sm rounded-[2rem] bg-white p-5 shadow-xl ring-1 ring-stone-200"
            onClick={(event) => event.stopPropagation()}
          >
            <h2
              id="schedule-dialog-title"
              className="text-lg font-black text-stone-950"
            >
              Schedule{" "}
              {zones.find((candidate) => candidate.id === scheduleTargetZoneId)
                ?.name ?? "zone"}
            </h2>
            <p className="mt-1 text-sm font-semibold text-stone-500">
              Choose day, month, and year for this reset.
            </p>
            <label
              htmlFor="zone-schedule-date"
              className="mt-4 block text-xs font-bold uppercase tracking-[0.18em] text-emerald-800"
            >
              Date
            </label>
            <input
              id="zone-schedule-date"
              type="date"
              value={scheduleDateValue}
              onChange={(event) => setScheduleDateValue(event.target.value)}
              className="mt-2 min-h-12 w-full rounded-2xl border border-stone-200 bg-stone-50 px-3 text-base font-bold text-stone-900 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700"
            />
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setScheduleTargetZoneId(null);
                  setScheduleTargetCadence(null);
                }}
                className="min-h-11 rounded-2xl bg-stone-100 px-3 text-sm font-black text-stone-700 transition hover:bg-stone-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  scheduleZoneForDate(
                    scheduleTargetZoneId,
                    scheduleDateValue,
                    scheduleTargetCadence ?? "zone",
                  );
                  setScheduleTargetZoneId(null);
                  setScheduleTargetCadence(null);
                }}
                disabled={!/^\d{4}-\d{2}-\d{2}$/.test(scheduleDateValue)}
                className="min-h-11 rounded-2xl bg-emerald-950 px-3 text-sm font-black text-white transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:bg-stone-200 disabled:text-stone-500"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}


function formatDdMmYy(isoDate: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
    return "";
  }

  const [yearStr, monthStr, dayStr] = isoDate.split("-");

  return `${dayStr}.${monthStr}.${yearStr.slice(-2)}`;
}

function scheduledOnBlurb(isoDate: string): string {
  const formatted = formatDdMmYy(isoDate);

  if (!formatted) {
    return "SCHEDULED ON";
  }

  return `SCHEDULED ON ${formatted}`;
}

function getEarliestQueuedDueDate(
  tasks: Task[],
  upcomingDates: Record<string, string>,
  cleaningDate: string,
): string | null {
  const dates = tasks
    .map((task) => upcomingDates[task.id])
    .filter((d): d is string => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d))
    .filter((d) => d > cleaningDate)
    .sort();

  return dates[0] ?? null;
}

function cadenceTasksQueuedForLater(
  tasks: Task[],
  cleaningDate: string,
  upcomingDates: Record<string, string>,
): boolean {
  if (tasks.length === 0) {
    return false;
  }

  return tasks.every((task) => {
    const due = upcomingDates[task.id];
    if (typeof due !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(due)) {
      return false;
    }

    return cleaningDate < due;
  });
}

function ZoneScheduleIconButton({
  ariaLabel,
  onClick,
  layout,
}: {
  ariaLabel: string;
  onClick: () => void;
  layout: "compact" | "full";
}) {
  const buttonClass =
    layout === "full"
      ? "flex min-h-11 w-full items-center justify-center rounded-2xl bg-stone-100 text-stone-800 ring-1 ring-stone-200 transition hover:bg-stone-200"
      : "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-stone-600 ring-1 ring-stone-200 transition hover:bg-stone-100 hover:text-stone-900";

  const iconClass = layout === "full" ? "h-5 w-5" : "h-3.5 w-3.5";

  return (
    <button type="button" onClick={onClick} aria-label={ariaLabel} className={buttonClass}>
      <svg
        aria-hidden="true"
        className={iconClass}
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        viewBox="0 0 24 24"
      >
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 11h18" />
      </svg>
    </button>
  );
}

function CadenceRow({
  label,
  status,
  tasks,
  isExpanded,
  showViewTasks,
  onToggle,
  completedTaskIds,
  onAddAsNeededToToday,
  onRemoveAsNeededFromToday,
  asNeededOnTodayIds,
  onSchedule,
  scheduleAriaLabel,
}: {
  label: string;
  status: string;
  tasks: Task[];
  isExpanded: boolean;
  showViewTasks: boolean;
  onToggle: () => void;
  completedTaskIds: Set<string>;
  onAddAsNeededToToday?: (taskId: string) => void;
  onRemoveAsNeededFromToday?: (taskId: string) => void;
  asNeededOnTodayIds?: Set<string>;
  onSchedule?: () => void;
  scheduleAriaLabel?: string;
}) {
  return (
    <div className="rounded-2xl bg-stone-50 px-3 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-black text-stone-800">{label}</span>
          <span
            className={`${
              status.startsWith("SCHEDULED ON") ||
              status === "Active" ||
              status === "When you notice"
                ? "rounded-2xl px-2 py-1 text-[0.65rem] leading-snug"
                : "rounded-full px-2 py-0.5 text-[0.6rem]"
            } font-bold tracking-wide ${
              status.startsWith("SCHEDULED ON") ||
              status === "Active" ||
              status === "When you notice"
                ? "normal-case"
                : "uppercase"
            } ${cadenceStatusStyle(status)}`}
          >
            {status}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {onSchedule ? (
            <ZoneScheduleIconButton
              layout="compact"
              ariaLabel={scheduleAriaLabel ?? "Schedule this zone"}
              onClick={onSchedule}
            />
          ) : null}
          {showViewTasks ? (
            <button
              type="button"
              onClick={onToggle}
              aria-label={isExpanded ? "Hide tasks" : "View tasks"}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-stone-500 transition hover:bg-stone-200"
            >
              <svg
                aria-hidden="true"
                className="h-3.5 w-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                viewBox="0 0 24 24"
              >
                {isExpanded ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                )}
              </svg>
            </button>
          ) : null}
        </div>
      </div>
      {isExpanded ? (
        <ul className="mt-2 space-y-1.5">
          {tasks.map((task) => {
            const isDone = completedTaskIds.has(task.id);
            const onToday = Boolean(asNeededOnTodayIds?.has(task.id));
            const rowBase = `rounded-xl px-2.5 py-1.5 ${isDone ? "bg-emerald-100" : "bg-white"}`;
            const titleClass = `min-w-0 text-sm font-semibold ${isDone ? "text-emerald-700 line-through" : "text-stone-700"}`;

            if (onAddAsNeededToToday) {
              return (
                <li
                  key={task.id}
                  className={`grid grid-cols-[minmax(0,1fr)_1.75rem_3.75rem] items-center gap-x-2 gap-y-0.5 ${rowBase}`}
                >
                  <span className={titleClass}>{task.title}</span>
                  <div className="flex h-7 items-center justify-center justify-self-center">
                    <button
                      type="button"
                      onClick={() =>
                        onToday
                          ? onRemoveAsNeededFromToday?.(task.id)
                          : onAddAsNeededToToday(task.id)
                      }
                      aria-label={
                        onToday
                          ? `Remove ${task.title} from today`
                          : `Add ${task.title} to today`
                      }
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ring-1 transition ${
                        onToday
                          ? "bg-emerald-100 text-emerald-700 ring-emerald-200 hover:bg-emerald-200"
                          : "bg-white text-emerald-800 ring-emerald-200 hover:bg-emerald-50"
                      }`}
                    >
                      {onToday ? (
                        <svg
                          aria-hidden="true"
                          className="h-3 w-3"
                          fill="none"
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2.5"
                          viewBox="0 0 24 24"
                        >
                          <path d="M20 6 9 17l-5-5" />
                        </svg>
                      ) : (
                        <svg
                          aria-hidden="true"
                          className="h-3 w-3"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M8 6v12l9-6z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  <span className="text-right text-xs font-semibold tabular-nums text-stone-400">
                    {task.estimatedMinutes} min
                  </span>
                </li>
              );
            }

            return (
              <li
                key={task.id}
                className={`flex items-center justify-between gap-2 ${rowBase}`}
              >
                <span className={`min-w-0 flex-1 ${titleClass}`}>{task.title}</span>
                <span className="shrink-0 text-xs font-semibold tabular-nums text-stone-400">
                  {task.estimatedMinutes} min
                </span>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

function cadenceStatusStyle(status: string): string {
  if (status.startsWith("SCHEDULED ON")) {
    return "bg-violet-100 text-violet-900";
  }

  switch (status) {
    case "Active":
      return "bg-emerald-100 text-emerald-800";
    case "Done today":
      return "bg-emerald-100 text-emerald-800";
    case "Due today":
      return "bg-amber-100 text-amber-800";
    case "Due this week":
      return "bg-sky-100 text-sky-800";
    case "Due this month":
      return "bg-violet-100 text-violet-800";
    case "Due this quarter":
      return "bg-orange-100 text-orange-800";
    case "When you notice":
      return "bg-stone-100 text-stone-600";
    default:
      return "bg-stone-100 text-stone-600";
  }
}
