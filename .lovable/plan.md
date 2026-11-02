# Automatisk SEO-motor i adminpanelet

Målet: Serviceydere skriver, udgiver og indsender selv nye artikler til Google hver uge, og du styrer det fra adminpanelet uden at skrive til mig.

## Det du får

1. **Ny fane «SEO-motor» i adminpanelet**
   - Tænd/sluk automatik, vælg tempo (fx 3 artikler om ugen) og om artikler udgives direkte eller først skal godkendes af dig.
   - Liste over emneforslag, kladder, udgivne artikler og deres Google-status (indsendt, indekseret, klik, visninger).
   - Knapper: «Generér nu», «Godkend», «Afvis», «Redigér», «Indsend til Google».

2. **Automatisk emnevalg (ugentligt)**
   - Læser Search Console: søgninger hvor vi vises men får få klik (placering 8–30) → nye eller udvidede artikler.
   - Supplerer med Semrush-søgeord inden for vores fagområder (rengøring, vinduespudsning, have, ruteplanlægning, fakturering) og byer.
   - Springer emner over der allerede er dækket, så vi undgår dubletter, der konkurrerer med hinanden.

3. **Automatisk artikelskrivning**
   - AI skriver danske artikler i samme stil og struktur som de eksisterende: overskrifter, tabeller, FAQ, interne links til relevante sider, og en tydelig opfordring til at prøve 14 dage gratis uden kreditkort.
   - Faste regler: kun prisintervaller (aldrig præcise priser), ingen opdigtede fakta, ingen funktioner vi ikke har.
   - Kvalitetstjek før udgivelse: længde, unik titel/beskrivelse, links virker, intet dobbeltindhold.

4. **Udgivelse uden ny udgivelse af appen**
   - Nye artikler gemmes i databasen og vises straks på `/blog/...` med korrekt titel, beskrivelse og strukturerede data, så Google kan læse dem.
   - Sitemap opdateres automatisk med nye artikler.

5. **Automatisk indsendelse til Google**
   - Sitemap genindsendes til Search Console, når der kommer nye artikler (én gang pr. kørsel).
   - Ugentligt tjek af nye artiklers status i Google; artikler der ikke bliver indekseret efter 3 uger markeres til forbedring.

6. **Løbende forbedring af gamle artikler (månedligt)**
   - Artikler med mange visninger men lav klikrate får automatisk ny titel/beskrivelse foreslået; artikler der falder i placering bliver udvidet.

7. **Månedsrapporten udvides**
   - Viser også hvor mange artikler der er udgivet, hvor mange der er indekseret, og hvilke der vokser mest.

## Tidsplan for automatikken

```text
Mandag 06:00   Find emner (Search Console + søgeord)
Tir/tor/lør    Skriv og (godkend/)udgiv 1 artikel
Efter udgivelse Opdater sitemap + indsend til Google
Søndag         Tjek indeksering af nye artikler
1. i måneden   Forbedr svage artikler + mailrapport
```

Ingen kørsler oftere end dagligt, så backend-omkostningerne holdes lave.

## Begrænsninger at kende

- Google afgør selv hvornår og om sider indekseres; vi kan kun indsende og gøre indholdet godt. Googles «anmod om indeksering»-knap findes ikke for automatik.
- AI-artikler i stor mængde kan skade rangeringen, hvis kvaliteten falder. Derfor anbefales «godkend først» de første uger og et moderat tempo.
- AI-tekster og Semrush-opslag koster forbrug pr. artikel.

## Teknisk sektion

- Tabeller: `seo_topics` (emne, søgeord, kilde, score, status), `seo_articles` (slug, titel, beskrivelse, indhold som strukturerede blokke, kategori, status, published_at, gsc-status), `seo_settings` (enabled, cadence, auto_publish), `seo_runs` (log). RLS: kun platform-admin skriver; offentlig læsning af udgivne artikler.
- Edge functions: `seo-topic-discovery` (GSC searchAnalytics + Semrush), `seo-article-writer` (Lovable AI Gateway, struktureret output, valideret med Zod, interne links fra eksisterende registre), `seo-indexing` (sitemap PUT + URL Inspection), `seo-refresh` (titel/beskrivelse-forslag). Fælles idempotency pr. dag/emne.
- Cron via `pg_cron` + `pg_net`, daglige/ugentlige jobs; sitemap-indsendelse kun når indhold ændres.
- Frontend: blog-ruten slår op i både statiske `blogPosts.ts` og `seo_articles`; fælles renderer genbruges. `sitemap`-funktionen tilføjer database-artikler. Prerender: database-artikler får server-renderet head via sitemap/prerender-edge, så crawlers ser titel og indhold uden JavaScript.
- Admin: ny fane i `PlatformAdmin` (AdminShell) med indstillinger, kø og status.
- `AGENTS.md`: regel om at automatiske artikler bor i databasen og deler renderer/SEO-registre med statiske artikler.
