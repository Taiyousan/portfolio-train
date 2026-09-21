import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { z } from "zod";

const PROJECTS_DIR = path.join(process.cwd(), "content", "projets");

const frontmatterSchema = z.object({
  title: z.string(),
  summary: z.string(),
  type: z.enum(["pro", "perso"]),
  order: z.number(),
  role: z.string(),
  technos: z.array(z.string()),
  clients: z.array(z.string()).default([]),
  partners: z.array(z.string()).default([]),
  tasks: z.array(z.string()),
  href: z.url().optional(),
  thumb: z.string(),
  video: z.string().optional(),
});

export type Project = z.infer<typeof frontmatterSchema> & {
  slug: string;
  body: string;
};

function readProject(file: string): Project {
  const slug = file.replace(/\.mdx$/, "");
  const { data, content } = matter(
    fs.readFileSync(path.join(PROJECTS_DIR, file), "utf8"),
  );
  const parsed = frontmatterSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error(
      `Frontmatter invalide dans content/projets/${file} :\n${z.prettifyError(parsed.error)}`,
    );
  }
  return { ...parsed.data, slug, body: content.trim() };
}

export function getProjects(): Project[] {
  return fs
    .readdirSync(PROJECTS_DIR)
    .filter((f) => f.endsWith(".mdx"))
    .map(readProject)
    .sort((a, b) => a.order - b.order);
}

export function getProject(slug: string): Project | undefined {
  return getProjects().find((p) => p.slug === slug);
}
