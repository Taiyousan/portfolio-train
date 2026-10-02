import type { ReactNode } from "react";
import type { Project } from "@/lib/projects";

// A project as the station UI needs it. `body` is the MDX body rendered on
// the server and handed down ready to show, since the content readers use
// node:fs and can't run in this client tree.
export type StationProject = Pick<
  Project,
  | "slug"
  | "title"
  | "summary"
  | "type"
  | "role"
  | "technos"
  | "clients"
  | "partners"
  | "tasks"
  | "href"
> & { body: ReactNode };
