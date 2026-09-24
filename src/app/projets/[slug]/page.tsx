import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ProjectDetail from "@/components/ProjectDetail";
import { getProject, getProjects } from "@/lib/projects";

export function generateStaticParams() {
  return getProjects().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/projets/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) return {};
  return { title: project.title, description: project.summary };
}

export default async function ProjectPage({
  params,
}: PageProps<"/projets/[slug]">) {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) notFound();

  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-16 sm:py-24">
      <Link href="/#projets" className="text-sm text-muted">
        ← Tous les projets
      </Link>

      <h1 className="mt-6 text-4xl font-bold tracking-tight">
        {project.title}
      </h1>
      <p className="mt-3 text-lg text-muted">{project.summary}</p>

      <ProjectDetail project={project} />
    </main>
  );
}
