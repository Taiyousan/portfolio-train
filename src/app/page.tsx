import type { Metadata, Viewport } from "next";
import { MDXRemote } from "next-mdx-remote/rsc";
import Image from "next/image";
import Link from "next/link";
import LegalNotice from "@/components/LegalNotice";
import WholeWords from "@/components/WholeWords";
import StationPage from "@/components/StationPage";
import { getPage } from "@/lib/pages";
import { getProjects } from "@/lib/projects";
import { contacts, site } from "@/lib/site";
import { SITE_URL } from "@/lib/url";
import Experience, { type StationProject } from "@/three/Experience";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  // Whole: a page's openGraph replaces the layout's.
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: site.name,
    url: "/",
    title: site.title,
    description: site.description,
  },
};

// The scene's dusk (--dusk), around the train.
export const viewport: Viewport = {
  themeColor: "#3a2a1f",
};

// Who the site is about, for search engines.
const person = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: site.name,
  jobTitle: site.role,
  description: site.description,
  url: SITE_URL,
  email: site.links.email,
  address: { "@type": "PostalAddress", addressLocality: site.city },
  sameAs: [site.links.github, site.links.linkedin],
  knowsAbout: site.skills.flatMap((group) => group.items),
};

// The train scene, over the site in plain HTML (see Experience), and the
// legal notice it opens in a dialog.
export default function Home() {
  const projects = getProjects();
  const stationProjects: StationProject[] = projects.map((project) => ({
    slug: project.slug,
    title: project.title,
    summary: project.summary,
    type: project.type,
    year: project.year,
    role: project.role,
    technos: project.technos,
    clients: project.clients,
    partners: project.partners,
    tasks: project.tasks,
    href: project.href,
    images: project.images,
    body: <MDXRemote source={project.body} />,
  }));
  const legal = getPage("mentions-legales");

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(person).replace(/</g, "\\u003c"),
        }}
      />
      <Experience
        projects={stationProjects}
        legal={{
          title: legal.title,
          body: <LegalNotice body={legal.body} />,
        }}
      >
        <StationPage back={false}>
          <div className="mx-auto w-full max-w-4xl">
            <header>
              <p className="font-mono text-sm text-muted">{site.name}</p>
              <h1 className="mt-3 text-4xl font-bold tracking-tight text-balance sm:text-5xl">
                <WholeWords text={site.headline} />
              </h1>
              <div className="mt-6 max-w-2xl space-y-2 text-lg text-muted">
                {site.intro.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
              <nav
                aria-label="Contact"
                className="mt-6 flex flex-wrap gap-x-6 gap-y-2"
              >
                {contacts.map(({ label, href }) => (
                  <a key={label} href={href}>
                    {label}
                  </a>
                ))}
              </nav>
            </header>

            <section aria-labelledby="projets" className="mt-20">
              <h2 id="projets" className="text-2xl font-bold">
                Projets
              </h2>
              <ul className="mt-6 grid gap-6 sm:grid-cols-2">
                {projects.map((p) => (
                  <li key={p.slug}>
                    <Link
                      href={`/projets/${p.slug}`}
                      className="group block overflow-hidden rounded-xl border border-line transition-colors hover:border-accent"
                    >
                      <Image
                        src={p.thumb}
                        alt=""
                        width={800}
                        height={450}
                        sizes="(min-width: 896px) 416px, (min-width: 640px) calc(50vw - 32px), calc(100vw - 40px)"
                        className="aspect-video w-full object-cover"
                      />
                      <div className="p-4">
                        <h3 className="font-semibold group-hover:text-accent">
                          {p.title}
                        </h3>
                        <p className="mt-1 text-sm text-muted">{p.summary}</p>
                        <p className="mt-3 font-mono text-xs text-muted">
                          {p.type === "pro" ? "Pro" : "Perso"}
                          {p.year && ` · ${p.year}`} · {p.technos.join(" · ")}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>

            <section aria-labelledby="competences" className="mt-20">
              <h2 id="competences" className="text-2xl font-bold">
                Compétences
              </h2>
              <dl className="mt-6 grid gap-6 sm:grid-cols-3">
                {site.skills.map((group) => (
                  <div key={group.label}>
                    <dt className="font-mono text-sm text-muted">
                      {group.label}
                    </dt>
                    <dd className="mt-2">{group.items.join(", ")}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-8 text-muted">{site.education}</p>
            </section>
          </div>
        </StationPage>
      </Experience>
    </>
  );
}
