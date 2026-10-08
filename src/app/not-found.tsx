import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page introuvable",
};

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-5 py-16">
      <p className="font-mono text-sm text-accent">Erreur 404</p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight">
        Cette page n&apos;existe pas
      </h1>
      <p className="mt-4 text-lg text-muted">
        Le train ne s&apos;arrête pas ici.
      </p>
      <Link href="/" className="mt-8 font-mono text-sm">
        ← Retour au portfolio
      </Link>
    </main>
  );
}
