import type { Metadata } from "next";
import { MDXRemote } from "next-mdx-remote/rsc";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { getProject, getProjects, type Project } from "@/lib/projects";

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
  const projects = getProjects();
  const index = projects.findIndex((p) => p.slug === slug);
  if (index === -1) notFound();

  const project = projects[index];
  // The list loops, so every page leads somewhere.
  const previous = projects.at(index - 1)!;
  const next = projects[(index + 1) % projects.length];
  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-12 sm:py-20">
      <div className="flex items-baseline justify-between gap-4 font-mono text-sm text-muted">
        <Link href="/#projets">← Tous les projets</Link>
        <span>
          {pad(index + 1)} / {pad(projects.length)}
        </span>
      </div>

      <header className="mt-12 sm:mt-16">
        <p className="font-mono text-sm text-accent">
          {project.type === "pro" ? "Projet pro" : "Projet perso"}
          {project.clients.length > 0 && ` · ${project.clients.join(", ")}`}
        </p>
        <h1 className="mt-3 max-w-4xl text-4xl font-bold tracking-tight text-balance sm:text-6xl">
          {project.title}
        </h1>
        <p className="mt-5 max-w-2xl text-xl text-pretty text-muted">
          {project.summary}
        </p>
      </header>

      {/* Video set aside for now, may come back later.
      {project.video && (
        <video
          src={project.video}
          poster={project.thumb}
          controls
          muted
          playsInline
          loop
          preload="none"
          className="mt-8 w-full rounded-2xl border border-line bg-foreground/5 shadow-2xl shadow-foreground/10"
        />
      )}
      */}

      {/* The fact sheet sits on top on smaller screens, in a sticky side
          column on larger ones. */}
      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_17rem] lg:gap-16">
        <aside
          aria-label="Fiche du projet"
          className="self-start rounded-2xl border border-line p-6 lg:sticky lg:top-8 lg:col-start-2 lg:row-start-1"
        >
          <dl className="grid grid-cols-2 gap-5 lg:grid-cols-1">
            <Info label="Rôle">
              <span className="block first-letter:uppercase">
                {project.role}
              </span>
            </Info>
            {project.clients.length > 0 && (
              <Info label="Pour">{project.clients.join(", ")}</Info>
            )}
            {project.partners.length > 0 && (
              <Info label="Avec">{project.partners.join(", ")}</Info>
            )}
            <Info label="Technos" wide>
              <ul className="flex flex-wrap gap-1.5">
                {project.technos.map((t) => (
                  <li
                    key={t}
                    className="rounded-full border border-line bg-foreground/5 px-2.5 py-0.5 font-mono text-xs"
                  >
                    {t}
                  </li>
                ))}
              </ul>
            </Info>
          </dl>

          {project.href && (
            <a
              href={project.href}
              className="mt-6 block rounded-lg bg-accent px-4 py-3 text-center font-semibold text-on-accent hover:text-on-accent hover:opacity-90"
            >
              Voir le projet en ligne ↗
            </a>
          )}
        </aside>

        <div className="lg:col-start-1 lg:row-start-1">
          <div className="space-y-4 text-lg leading-relaxed [&_p]:max-w-prose">
            <MDXRemote source={project.body} />
          </div>

          <h2 className="mt-12 font-mono text-sm font-normal text-muted">
            Missions
          </h2>
          <ol className="mt-3 border-t border-line">
            {project.tasks.map((t, i) => (
              <li
                key={t}
                className="flex gap-4 border-b border-line py-3 sm:gap-6"
              >
                <span
                  aria-hidden="true"
                  className="pt-0.5 font-mono text-sm text-accent"
                >
                  {pad(i + 1)}
                </span>
                {t}
              </li>
            ))}
          </ol>
        </div>
      </div>

      <nav
        aria-label="Autres projets"
        className="mt-24 grid gap-4 border-t border-line pt-10 sm:grid-cols-2"
      >
        <ProjectLink project={previous} label="← Précédent" />
        <ProjectLink project={next} label="Suivant →" align="end" />
      </nav>
    </main>
  );
}

function Info({
  label,
  wide = false,
  children,
}: {
  label: string;
  // Spans both columns of the two-column grid on smaller screens.
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={wide ? "col-span-full" : undefined}>
      <dt className="font-mono text-sm text-muted">{label}</dt>
      <dd className="mt-1.5">{children}</dd>
    </div>
  );
}

function ProjectLink({
  project,
  label,
  align = "start",
}: {
  project: Project;
  label: string;
  align?: "start" | "end";
}) {
  return (
    <Link
      href={`/projets/${project.slug}`}
      className={`group flex items-center gap-4 rounded-2xl border border-line p-3 transition-colors hover:border-accent ${
        align === "end" ? "sm:flex-row-reverse sm:text-right" : ""
      }`}
    >
      <Image
        src={project.thumb}
        alt=""
        width={320}
        height={180}
        className="aspect-video w-28 shrink-0 rounded-lg object-cover"
      />
      <span>
        <span className="block font-mono text-xs text-muted">{label}</span>
        <span className="mt-1 block font-semibold group-hover:text-accent">
          {project.title}
        </span>
      </span>
    </Link>
  );
}
