import Link from "next/link";
import type { RoutineTemplate } from "@/lib/types";

type TemplateCardProps = {
  template: RoutineTemplate;
  selected: boolean;
  onStart: (templateId: string) => void;
};

export function TemplateCard({ template, selected, onStart }: TemplateCardProps) {
  return (
    <article className="rounded-[2rem] bg-white p-4 shadow-sm ring-1 ring-stone-200">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">
            {template.apartmentType.replace("-", " ")}
          </p>
          <h2 className="mt-1 text-xl font-black text-stone-950">{template.name}</h2>
        </div>
        {selected ? (
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
            Current
          </span>
        ) : null}
      </div>
      <p className="mt-3 text-sm leading-6 text-stone-600">{template.description}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {template.highlights.map((highlight) => (
          <span
            key={highlight}
            className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-700"
          >
            {highlight}
          </span>
        ))}
      </div>
      <div className="mt-5 grid grid-cols-2 gap-2">
        <Link
          href={`/templates/${template.id}`}
          className="flex min-h-12 items-center justify-center rounded-2xl border border-stone-200 px-3 text-sm font-bold text-stone-700 transition hover:bg-stone-50"
        >
          View
        </Link>
        <button
          type="button"
          onClick={() => onStart(template.id)}
          className="min-h-12 rounded-2xl bg-emerald-950 px-3 text-sm font-bold text-white transition hover:bg-emerald-900 focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:ring-offset-2"
        >
          Start
        </button>
      </div>
    </article>
  );
}
