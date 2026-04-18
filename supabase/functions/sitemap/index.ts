import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const SITE_URL = "https://serviceydere.dk";
const STATIC_ROUTES = [
  { path: "/", priority: "1.0", changefreq: "daily" },
  { path: "/search", priority: "0.9", changefreq: "daily" },
  { path: "/quote", priority: "0.9", changefreq: "weekly" },
];

const CATEGORIES = [
  "Rengøring", "Håndværker", "Flyttehjælp", "Haveservice",
  "Maler", "VVS", "Elektriker", "Tømrer", "Sikkerhed",
];

const escapeXml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

Deno.serve(async (_req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
  );

  const { data: businesses } = await supabase
    .from("businesses")
    .select("slug, updated_at")
    .eq("is_active", true);

  const urls: string[] = [];

  STATIC_ROUTES.forEach((r) => {
    urls.push(`<url><loc>${SITE_URL}${r.path}</loc><changefreq>${r.changefreq}</changefreq><priority>${r.priority}</priority></url>`);
  });

  CATEGORIES.forEach((c) => {
    urls.push(`<url><loc>${SITE_URL}/search?category=${encodeURIComponent(c)}</loc><changefreq>weekly</changefreq><priority>0.7</priority></url>`);
  });

  (businesses ?? []).forEach((b: { slug: string; updated_at: string }) => {
    const lastmod = b.updated_at ? new Date(b.updated_at).toISOString().split("T")[0] : "";
    urls.push(
      `<url><loc>${SITE_URL}/b/${escapeXml(b.slug)}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ""}<changefreq>weekly</changefreq><priority>0.8</priority></url>`,
    );
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
});
