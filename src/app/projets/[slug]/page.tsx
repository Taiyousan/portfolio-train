import type { Metadata } from "next";
import { MDXRemote } from "next-mdx-remote/rsc";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import StationPage from "@/components/StationPage";
import WholeWords from "@/components/WholeWords";
import { getProject, getProjects, type Project } from "@/lib/projects";
import { site } from "@/lib/site";

// Every project page is built ahead; any other slug is a 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return getProjects().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/projets/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) return {};
  const url = `/projets/${slug}`;
  return {
    title: project.title,
    description: project.summary,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      locale: "fr_FR",
      siteName: site.name,
      url,
      title: project.title,
      description: project.summary,
      images: [{ url: project.thumb, alt: project.title }],
    },
  };
}

// A project's own page, reached from search engines, shared links and the
// home page's HTML version (in the scene, a project opens in a dialog).
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
    <StationPage>
      <div className="mx-auto w-full max-w-5xl">
        <header>
          <p className="flex items-baseline justify-between gap-4 font-mono text-sm">
            <span className="text-accent">
              {project.type === "pro" ? "Projet pro" : "Projet perso"}
              {project.year && ` · ${project.year}`}
            </span>
            <span className="whitespace-nowrap text-muted">
              {pad(index + 1)} / {pad(projects.length)}
            </span>
          </p>
          <h1 className="mt-3 max-w-4xl text-4xl font-bold tracking-tight text-balance sm:text-6xl">
            <WholeWords text={project.title} />
          </h1>
        </header>

        {/* The fact sheet: on top on smaller screens, a sticky side column on
          larger ones. */}
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
            {/* The summary, then its detail in a quieter voice: after the
                fact sheet on smaller screens, beside it on larger ones. */}
            <p className="mb-4 max-w-2xl text-xl font-medium text-pretty sm:text-2xl">
              {project.summary}
            </p>
            <div className="space-y-4 leading-relaxed text-muted [&_a]:font-semibold [&_a]:text-foreground [&_a]:underline [&_a]:decoration-accent [&_a]:decoration-2 [&_p]:max-w-prose">
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

            {project.images.length > 0 && (
              <>
                <h2 className="mt-12 font-mono text-sm font-normal text-muted">
                  Captures
                </h2>
                {/* The first one across, the others two by two. */}
                <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                  {project.images.map((src, i) => (
                    <li
                      key={src}
                      className={i === 0 ? "sm:col-span-2" : undefined}
                    >
                      <Image
                        src={src}
                        alt={`${project.title}, capture ${i + 1} sur ${project.images.length}`}
                        width={1280}
                        height={720}
                        sizes={
                          i === 0
                            ? "(min-width: 1024px) 640px, calc(100vw - 40px)"
                            : "(min-width: 1024px) 314px, (min-width: 640px) calc(50vw - 26px), calc(100vw - 40px)"
                        }
                        className="aspect-video w-full rounded-lg border border-line object-cover"
                      />
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>

        <nav
          aria-label="Autres projets"
          className="mt-24 grid gap-4 border-t border-line pt-10 sm:grid-cols-2"
        >
          <ProjectLink project={previous} label="← Précédent" />
          <ProjectLink project={next} label="Suivant →" align="end" />
        </nav>
      </div>
    </StationPage>
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
        sizes="112px"
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
