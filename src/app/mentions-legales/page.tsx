import type { Metadata } from "next";
import { MDXRemote } from "next-mdx-remote/rsc";
import Link from "next/link";
import { getPage } from "@/lib/pages";
import { site } from "@/lib/site";

const SLUG = "mentions-legales";

export function generateMetadata(): Metadata {
  const page = getPage(SLUG);
  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: `/${SLUG}` },
  };
}

// The contact address, kept in site.ts.
function Email() {
  return <a href={`mailto:${site.links.email}`}>{site.links.email}</a>;
}

export default function LegalPage() {
  const page = getPage(SLUG);

  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-12 sm:py-20">
      <Link href="/" className="font-mono text-sm text-muted">
        ← Retour au portfolio
      </Link>

      <h1 className="mt-12 text-4xl font-bold tracking-tight sm:mt-16 sm:text-5xl">
        {page.title}
      </h1>

      <div className="mt-10 space-y-4 text-lg leading-relaxed text-pretty [&_a]:font-semibold [&_a]:underline [&_a]:decoration-accent [&_a]:decoration-2 [&_h2]:mt-12 [&_h2]:font-mono [&_h2]:text-sm [&_h2]:font-normal [&_h2]:tracking-wider [&_h2]:text-muted [&_h2]:uppercase [&_li]:mt-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:marker:text-accent">
        <MDXRemote source={page.body} components={{ Email }} />
      </div>
    </main>
  );
}
