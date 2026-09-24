import type { Metadata } from "next";
import ProjectDetail from "@/components/ProjectDetail";
import { getProjects } from "@/lib/projects";
import { site } from "@/lib/site";
import Experience, { type StationProject } from "@/three/Experience";

export const metadata: Metadata = {
  title: "Prototype — train",
};

export default function ProtoTrainPage() {
  const projects: StationProject[] = getProjects().map((project) => ({
    slug: project.slug,
    title: project.title,
    summary: project.summary,
    type: project.type,
    technos: project.technos,
    detail: <ProjectDetail project={project} />,
  }));

  return (
    <main className="fixed inset-0 bg-[#3a2a1f]">
      <h1 className="sr-only">Portfolio de {site.name}</h1>
      <Experience projects={projects} />
    </main>
  );
}
