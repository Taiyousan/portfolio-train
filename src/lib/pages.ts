import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { z } from "zod";

const PAGES_DIR = path.join(process.cwd(), "content", "pages");

const frontmatterSchema = z.object({
  title: z.string(),
  description: z.string(),
});

export type Page = z.infer<typeof frontmatterSchema> & {
  slug: string;
  body: string;
};

// A standalone text page (legal notice...), from content/pages/<slug>.mdx.
export function getPage(slug: string): Page {
  const file = `${slug}.mdx`;
  const { data, content } = matter(
    fs.readFileSync(path.join(PAGES_DIR, file), "utf8"),
  );
  const parsed = frontmatterSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error(
      `Frontmatter invalide dans content/pages/${file} :\n${z.prettifyError(parsed.error)}`,
    );
  }
  return { ...parsed.data, slug, body: content.trim() };
}
