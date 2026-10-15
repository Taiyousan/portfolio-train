import type { ReactNode } from "react";
import type { Project } from "@/lib/projects";

// A project as the scene needs it. `body` is the MDX body, rendered on the
// server: the content readers use node:fs.
export type StationProject = Pick<
  Project,
  | "slug"
  | "title"
  | "summary"
  | "type"
  | "year"
  | "role"
  | "technos"
  | "clients"
  | "partners"
  | "tasks"
  | "href"
  | "images"
> & { body: ReactNode };

// The legal notice, its body rendered on the server likewise.
export type LegalNotice = { title: string; body: ReactNode };
