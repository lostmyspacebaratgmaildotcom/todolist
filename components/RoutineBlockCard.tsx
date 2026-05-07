import { calculateBlockCompletion } from "@/lib/progress";
import type { RoutineBlockId, Task } from "@/lib/types";

type RoutineBlockCardProps = {
  id: RoutineBlockId;
  name: string;
  tasks: Task[];
  completedTaskIds: string[];
  current?: boolean;
  onTaskChange: (taskId: string, completed: boolean) => void;
};

const completionCopy: Record<RoutineBlockId, string> = {
  morning: "Morning complete.",
  afternoon: "Afternoon complete.",
  evening: "Evening complete.",
};

export function RoutineBlockCard({
  id,
  name,
  tasks,
  completedTaskIds,
  current = false,
  onTaskChange,
}: RoutineBlockCardProps) {
  const completion = calculateBlockCompletion(tasks, completedTaskIds);
  const totalMinutes = tasks.reduce((sum, task) => sum + task.estimatedMinutes, 0);

  return (
    <section
      aria-labelledby={`${id}-title`}
      className={`rounded-[2rem] bg-white p-4 shadow-sm ring-1 ${
        current ? "ring-emerald-300" : "ring-stone-200"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 id={`${id}-title`} className="text-xl font-black text-stone-950">
              {name}
            </h2>
            {current ? (
              <span className="rounded-full bg-emerald-100 px-2 py-1 text-[0.65rem] font-bold uppercase tracking-wide text-emerald-800">
                Now
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-stone-500">{totalMinutes} minutes total</p>
        </div>
        <div className="min-w-20 rounded-2xl bg-emerald-950 px-3 py-2 text-center text-white">
          <p className="text-2xl font-black leading-none">{completion}%</p>
          <p className="mt-1 text-[0.65rem] font-bold uppercase tracking-wide text-emerald-100">
            Done
          </p>
        </div>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-stone-100">
        <div
          className="h-full rounded-full bg-emerald-500 transition-[width] motion-reduce:transition-none"
          style={{ width: `${completion}%` }}
        />
      </div>

      {completion === 100 ? (
        <p className="mt-4 rounded-2xl bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-900">
          {completionCopy[id]}
        </p>
      ) : null}

      <ul className="mt-4 space-y-3">
        {tasks.map((task) => {
          const checked = completedTaskIds.includes(task.id);

          return (
            <li key={task.id}>
              <label
                className={`flex min-h-14 cursor-pointer items-start gap-3 rounded-2xl border p-3 transition ${
                  checked
                    ? "border-emerald-200 bg-emerald-50"
                    : "border-stone-200 bg-stone-50 hover:border-stone-300"
                }`}
              >
                <input
                  type="checkbox"
                  className="mt-1 h-5 w-5 rounded border-stone-300 text-emerald-700 focus:ring-emerald-700"
                  checked={checked}
                  onChange={(event) => onTaskChange(task.id, event.target.checked)}
                />
                <span className="flex-1">
                  <span
                    className={`block text-sm font-bold ${
                      checked ? "text-emerald-950 line-through decoration-emerald-600" : "text-stone-900"
                    }`}
                  >
                    {task.title}
                  </span>
                  <span className="mt-1 block text-xs text-stone-500">
                    {task.estimatedMinutes} min
                  </span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
