import type { ReactNode } from "react";
import Link from "next/link";
import NameCard from "./NameCard";
import Ticket from "./Ticket";

// The HTML pages' frame, on the tickets' card stock: the name card in the
// corner and a return ticket to the train (`back`), the legal notice's link
// at the foot.
export default function StationPage({
  back = true,
  children,
}: {
  back?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="theme-ticket flex min-h-dvh flex-col bg-background text-foreground">
      <header className="flex items-start justify-between gap-3 p-3 sm:p-5">
        <NameCard />
        {back && (
          <div className="w-max">
            <Ticket
              href="/"
              kicker="Billet · Retour"
              title="Retour"
              tilt={1}
              delay={0}
              variant="return"
              size="mini"
            />
          </div>
        )}
      </header>
      <main className="flex-1 px-5 pt-8 pb-16 sm:pt-12">{children}</main>
      <footer className="border-t border-line px-5 py-6 text-center font-mono text-sm text-muted">
        <Link href="/mentions-legales">Mentions légales</Link>
      </footer>
    </div>
  );
}
