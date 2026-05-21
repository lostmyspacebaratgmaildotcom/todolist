export type RoutineBlockId = "morning" | "afternoon" | "evening";

export type ApartmentType = "studio" | "one-bedroom" | "shared";

export type ZoneFrequency = "daily" | "weekly" | "monthly" | "once";

export type TaskCadence = "daily" | "weekly" | "monthly" | "seasonal" | "as_needed";

export type Task = {
  id: string;
  title: string;
  zoneId?: string;
  block: RoutineBlockId;
  cadence?: TaskCadence;
  estimatedMinutes: number;
  required: boolean;
  sortOrder: number;
  active: boolean;
  /** Shown under "Today in this zone" on Manage when set */
  spotlightToday?: boolean;
  /** Daily task excluded from the "Daily reset" list (shown only in Today preview) */
  dailyPreviewOnly?: boolean;
};

export type RoutineBlock = {
  id: RoutineBlockId;
  name: string;
  taskIds: string[];
};

export type Zone = {
  id: string;
  name: string;
  description: string;
  frequency: ZoneFrequency;
  sortOrder: number;
  active: boolean;
  suggestedTasks: string[];
};

export type RoutineTemplate = {
  id: string;
  name: string;
  description: string;
  apartmentType: ApartmentType;
  taskIds: string[];
  highlights: string[];
};

export type BlockCompletion = Record<RoutineBlockId, number>;

export type DailyLog = {
  date: string;
  completedTaskIds: string[];
  blockCompletion: BlockCompletion;
  dailyCompletion?: number;
  updatedAt: string;
};

export type Settings = {
  selectedTemplateId: string;
  resetTime: string;
  currentZoneIds: string[];
  currentZoneId: string;
  scheduledZoneDates: Record<string, string[]>;
  /** zoneId -> calendar quarter key (YYYY-Q1..Q4) when seasonal projects were skipped */
  seasonalSkips: Record<string, string>;
  firstRunComplete: boolean;
  lastAutoZoneDate?: string;
};

export type EditableRoutineData = {
  zones: Zone[];
  tasks: Task[];
  updatedAt: string;
};
