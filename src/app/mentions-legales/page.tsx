import type { Metadata } from "next";
import LegalNotice from "@/components/LegalNotice";
import StationPage from "@/components/StationPage";
import { getPage } from "@/lib/pages";

const SLUG = "mentions-legales";

export function generateMetadata(): Metadata {
  const page = getPage(SLUG);
  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: `/${SLUG}` },
  };
}

// Reached directly; from the scene, the notice opens over it instead.
export default function LegalPage() {
  const page = getPage(SLUG);

  return (
    <StationPage>
      <article className="mx-auto max-w-3xl">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          {page.title}
        </h1>
        <div className="mt-8 text-lg">
          <LegalNotice body={page.body} />
        </div>
      </article>
    </StationPage>
  );
}
