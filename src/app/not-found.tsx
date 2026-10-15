import type { Metadata } from "next";
import Link from "next/link";
import StationPage from "@/components/StationPage";

export const metadata: Metadata = {
  title: "Page introuvable",
};

export default function NotFound() {
  return (
    <StationPage>
      <div className="mx-auto max-w-2xl py-8 sm:py-16">
        <p className="font-mono text-sm text-accent">Erreur 404</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight">
          Cette page n&apos;existe pas
        </h1>
        <p className="mt-4 text-lg text-muted">
          L&apos;adresse est peut-être erronée, ou la page a été déplacée.
        </p>
        <Link href="/" className="mt-8 inline-block font-mono text-sm">
          ← Retour au portfolio
        </Link>
      </div>
    </StationPage>
  );
}
