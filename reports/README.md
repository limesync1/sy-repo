# Blog enrichment-workflow

Hver enrichment-batch følger samme rytme:

1. **Verificér slugs** — undgå at spilde batches på ikke-eksisterende filer:
   ```bash
   bunx tsx scripts/check-slugs.ts
   ```

2. **Berig artiklerne** (manuelt eller via følgende batch-prompt).

3. **Opdatér sitemap-`lastmod`** for de berigede slugs til dagens dato i
   `public/sitemap.xml`, `public/sitemap-blog.xml` og `public/sitemap-index.xml`.

4. **Generér kvalitetsrapport**:
   ```bash
   bunx tsx scripts/blog-quality-report.ts --batch=enrichment-N
   ```
   Output:
   - `reports/blog-quality/enrichment-N.csv` (alle artikler, sorteret efter score)
   - `reports/blog-quality/enrichment-N.md` (top 30 tyndeste + orphans)

5. **Skriv batchens slugs** til `reports/indexnow/enrichment-N.txt` (én pr. linje).

6. **Ping IndexNow** (Bing/Yandex/Seznam):
   ```bash
   bunx tsx scripts/indexnow-ping.ts --batch=enrichment-N
   ```

7. **Re-submit sitemap + URL-inspect i Google Search Console**:
   ```bash
   bunx tsx scripts/gsc-request-indexing.ts --batch=enrichment-N
   ```
   Kræver at Google Search Console-connector er forbundet (Settings → Connectors).

## Kvalitetsscore — formel

- **Indhold (0–50):** linjer / 250 × 50, cap 50
- **Struktur (0–30):** sektioner × 5 + FAQ × 2, cap 30
- **Link-styrke (0–20):** udLinks × 3 + indLinks × 2, cap 20

En sund artikel ligger over 60. Under 40 = tynd, bør beriges.

## IndexNow-nøgle

`9a152c93d78e44a39fac89abe29eabc5` (verifikationsfil ligger på
`https://serviceydere.dk/9a152c93d78e44a39fac89abe29eabc5.txt`).