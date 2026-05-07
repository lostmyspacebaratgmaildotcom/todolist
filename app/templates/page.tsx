"use client";

import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { TemplateCard } from "@/components/TemplateCard";
import { useCleaningApp } from "@/lib/useCleaningApp";

export default function TemplatesPage() {
  const router = useRouter();
  const { templates, settings, startTemplate } = useCleaningApp();

  function handleStart(templateId: string) {
    startTemplate(templateId);
    router.push("/today");
  }

  return (
    <AppShell>
      <PageHeader
        eyebrow="Templates"
        title="Starter routines"
        description="Public apartment cleaning templates you can start without an account. Your checks stay on this device."
      />

      <div className="space-y-4">
        {templates.map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            selected={template.id === settings.selectedTemplateId}
            onStart={handleStart}
          />
        ))}
      </div>
    </AppShell>
  );
}
