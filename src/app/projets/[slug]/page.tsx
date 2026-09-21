import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
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

      <h1 className="mt-6 text-4xl font-bold tracking-tight">{project.title}</h1>
      <p className="mt-3 text-lg text-muted">{project.summary}</p>

      {project.video && (
        <video
          src={project.video}
          poster={project.thumb}
          controls
          muted
          playsInline
          loop
          preload="none"
          className="mt-8 w-full rounded-xl border border-line"
        />
      )}

      <div className="mt-8 space-y-4 leading-relaxed [&_p]:max-w-prose">
        <MDXRemote source={project.body} />
      </div>

      <dl className="mt-12 grid gap-6 border-t border-line pt-8 sm:grid-cols-2">
        <Info label="Rôle" value={project.role} />
        <Info label="Technos" value={project.technos.join(", ")} />
        {project.clients.length > 0 && (
          <Info label="Pour" value={project.clients.join(", ")} />
        )}
        {project.partners.length > 0 && (
          <Info label="Avec" value={project.partners.join(", ")} />
        )}
        <div className="sm:col-span-2">
          <dt className="font-mono text-sm text-muted">Missions</dt>
          <dd>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {project.tasks.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </dd>
        </div>
      </dl>

      {project.href && (
        <p className="mt-10">
          <a
            href={project.href}
            className="inline-block rounded-lg bg-accent px-5 py-3 font-semibold text-white"
          >
            Voir le projet en ligne ↗
          </a>
        </p>
      )}
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-mono text-sm text-muted">{label}</dt>
      <dd className="mt-1">{value}</dd>
    </div>
  );
}
