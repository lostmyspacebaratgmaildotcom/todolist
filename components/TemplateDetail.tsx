"use client";

import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { routineBlocks } from "@/lib/data";
import { getTasksForBlock } from "@/lib/progress";
import type { RoutineTemplate } from "@/lib/types";
import { useCleaningApp } from "@/lib/useCleaningApp";

export function TemplateDetail({ template }: { template: RoutineTemplate }) {
  const router = useRouter();
  const { startTemplate } = useCleaningApp();

  return (
    <AppShell>
      <PageHeader
        eyebrow="Public template"
        title={template.name}
        description={template.description}
      />

      <section className="mb-4 rounded-[2rem] bg-white p-4 shadow-sm ring-1 ring-stone-200">
        <div className="flex flex-wrap gap-2">
          {template.highlights.map((highlight) => (
            <span
              key={highlight}
              className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800"
            >
              {highlight}
            </span>
          ))}
        </div>
        <button
          type="button"
          onClick={() => {
            startTemplate(template.id);
            router.push("/today");
          }}
          className="mt-5 min-h-14 w-full rounded-2xl bg-emerald-950 px-5 text-base font-black text-white transition hover:bg-emerald-900"
        >
          Start this template
        </button>
      </section>

      <div className="space-y-4">
        {routineBlocks.map((block) => {
          const blockTasks = getTasksForBlock(template, block.id);
          const minutes = blockTasks.reduce((sum, task) => sum + task.estimatedMinutes, 0);

          return (
            <section
              key={block.id}
              className="rounded-[2rem] bg-white p-4 shadow-sm ring-1 ring-stone-200"
            >
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-black text-stone-950">{block.name}</h2>
                <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-bold text-stone-700">
                  {minutes} min
                </span>
              </div>
              <ul className="mt-4 space-y-2">
                {blockTasks.map((task) => (
                  <li
                    key={task.id}
                    className="flex items-center justify-between gap-3 rounded-2xl bg-stone-50 px-3 py-2"
                  >
                    <span className="text-sm font-bold text-stone-800">{task.title}</span>
                    <span className="text-xs font-semibold text-stone-500">
                      {task.estimatedMinutes}m
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </AppShell>
  );
}
