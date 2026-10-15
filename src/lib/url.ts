// The site's absolute URL, for metadata, the sitemap and robots.txt: the
// production domain on Vercel (previews included, as the canonical one),
// the dev server elsewhere. Server side only.
export const SITE_URL = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "http://localhost:3100";
