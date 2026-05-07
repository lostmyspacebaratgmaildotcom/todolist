import { notFound } from "next/navigation";
import { TemplateDetail } from "@/components/TemplateDetail";
import { templates } from "@/lib/data";

type TemplatePageProps = {
  params: Promise<{
    templateId: string;
  }>;
};

export function generateStaticParams() {
  return templates.map((template) => ({
    templateId: template.id,
  }));
}

export async function generateMetadata({ params }: TemplatePageProps) {
  const { templateId } = await params;
  const template = templates.find((candidate) => candidate.id === templateId);

  return {
    title: template ? `${template.name} | Apartment Reset` : "Template | Apartment Reset",
    description: template?.description,
  };
}

export default async function TemplatePage({ params }: TemplatePageProps) {
  const { templateId } = await params;
  const template = templates.find((candidate) => candidate.id === templateId);

  if (!template) {
    notFound();
  }

  return <TemplateDetail template={template} />;
}
