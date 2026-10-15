import Link from "next/link";
import { site } from "@/lib/site";

// The name and role on a small card in the top corner, back to the train.
export default function NameCard() {
  return (
    <Link
      href="/"
      className="theme-ticket pointer-events-auto flex h-12 w-max shrink-0 flex-col justify-center rounded-md border border-line bg-background px-4 text-sm whitespace-nowrap text-foreground shadow-lg hover:text-foreground"
    >
      <span className="block font-semibold tracking-tight">{site.name}</span>
      <span className="block font-mono text-[0.625rem] tracking-wider text-muted uppercase">
        {site.role}
      </span>
    </Link>
  );
}
