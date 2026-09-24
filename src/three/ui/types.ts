import type { ReactNode } from "react";
import type { Project } from "@/lib/projects";

// A project as the station UI needs it. `detail` is rendered on the server
// (components/ProjectDetail, MDX included) and handed down ready to show, since
// the content readers use node:fs and can't run in this client tree.
export type StationProject = Pick<
  Project,
  "slug" | "title" | "summary" | "type" | "technos"
> & { detail: ReactNode };
