import type { MetadataRoute } from "next";
import { getProjects } from "@/lib/projects";
import { SITE_URL } from "@/lib/url";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE_URL, priority: 1 },
    ...getProjects().map((project) => ({
      url: `${SITE_URL}/projets/${project.slug}`,
      priority: 0.8,
    })),
  ];
}
