import { MDXRemote } from "next-mdx-remote/rsc";
import { site } from "@/lib/site";

// The contact address, kept in site.ts.
function Email() {
  return <a href={`mailto:${site.links.email}`}>{site.links.email}</a>;
}

// The legal notice's text (content/pages/mentions-legales.mdx), on its page
// and in the scene's dialog.
export default function LegalNotice({ body }: { body: string }) {
  return (
    <div className="space-y-4 leading-relaxed text-pretty [&_a]:font-semibold [&_a]:underline [&_a]:decoration-accent [&_a]:decoration-2 [&_h2]:mt-8 [&_h2]:font-mono [&_h2]:text-sm [&_h2]:font-normal [&_h2]:text-muted [&_li]:mt-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:marker:text-accent">
      <MDXRemote source={body} components={{ Email }} />
    </div>
  );
}
