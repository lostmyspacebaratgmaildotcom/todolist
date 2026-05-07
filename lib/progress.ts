import { routineBlocks, tasks } from "./data";
import type { BlockCompletion, RoutineBlockId, RoutineTemplate, Task } from "./types";

export function getTemplateTasks(
  template: RoutineTemplate,
  availableTasks: Task[] = tasks,
): Task[] {
  const included = new Set(template.taskIds);

  return sortTasks(
    availableTasks.filter((task) => task.active && included.has(task.id)),
  );
}

export function getTasksForBlock(
  taskList: Task[],
  blockId: RoutineBlockId,
): Task[] {
  return sortTasks(taskList.filter((task) => task.active && task.block === blockId));
}

export function getTemplateTasksForBlock(
  template: RoutineTemplate,
  blockId: RoutineBlockId,
  availableTasks: Task[] = tasks,
): Task[] {
  return getTasksForBlock(getTemplateTasks(template, availableTasks), blockId);
}

export function sortTasks(taskList: Task[]): Task[] {
  return [...taskList]
    .filter((task) => task.active)
    .sort((first, second) => {
      if (first.block === second.block) {
        return first.sortOrder - second.sortOrder;
      }

      return blockOrder(first.block) - blockOrder(second.block);
    });
}

export function calculateBlockCompletion(
  blockTasks: Task[],
  completedTaskIds: string[],
): number {
  const requiredTasks = blockTasks.filter((task) => task.required);

  if (requiredTasks.length === 0) {
    return 0;
  }

  const completedRequiredTasks = requiredTasks.filter((task) =>
    completedTaskIds.includes(task.id),
  );

  return Math.round((completedRequiredTasks.length / requiredTasks.length) * 100);
}

export function calculateCompletions(
  taskList: Task[],
  completedTaskIds: string[],
): BlockCompletion {
  return routineBlocks.reduce(
    (completion, block) => ({
      ...completion,
      [block.id]: calculateBlockCompletion(
        getTasksForBlock(taskList, block.id),
        completedTaskIds,
      ),
    }),
    { morning: 0, afternoon: 0, evening: 0 },
  );
}

export function calculateDailyCompletion(completions: BlockCompletion): number {
  const scores = Object.values(completions);
  return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
}

export function getCurrentBlockId(now = new Date()): RoutineBlockId {
  const hour = now.getHours();

  if (hour < 12) {
    return "morning";
  }

  if (hour < 18) {
    return "afternoon";
  }

  return "evening";
}

function blockOrder(blockId: RoutineBlockId): number {
  return routineBlocks.findIndex((block) => block.id === blockId);
}
