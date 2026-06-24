
# SEO-offensiv fase 2 — slå konkurrenterne på Google

Vi har 122 URLs i sitemap og 45+ blogartikler. Konkurrenterne (happyhelper.dk, 3byggetilbud, servicefinder m.fl.) vinder stadig på **dybde**, **intern linkstruktur** og **antal long-tail-spørgsmål**. Denne plan løfter os fra "mange artikler" til "Danmarks mest komplette serviceydelses-bibliotek".

## Mål

- 120 nye artikler (i alt ~270 indekserbare sider)
- Dobbelt så lange og dybere end konkurrenternes top-10
- 100% rich-snippet-dækning (FAQ + HowTo + Article + Breadcrumb schema)
- Internt linknetværk: hver artikel linker til 6+ andre relevante
- Sitemap + GSC submission automatisk i samme flow

---

## Pakke 1 — Lokalt SEO (40 artikler)

Lokal SEO er der, konkurrenterne er svagest. Vi laver by-specifikke guides for de 8 største byer × 5 brancher:

**Byer:** København, Aarhus, Odense, Aalborg, Esbjerg, Randers, Kolding, Vejle
**Brancher:** Rengøring, Flyttehjælp, Håndværker, Haveservice, Vinduespudsning

Skabelon pr. artikel: `Rengøring i [By] — pris, tilbud & lokal guide 2026`
- Lokale priser (timepriser, m²-priser specifikt for byen)
- "Sådan finder du den bedste i [By]"
- 5 lokale FAQ ("Hvad koster rengøring i Aarhus?", osv.)
- Indlejret link til vores prisberegner + tilbudsformular
- LocalBusiness + FAQPage schema

## Pakke 2 — Sammenligning & alternativer (25 artikler)

Google-favoritter med høj kommerciel intent:

- "Robotstøvsuger vs. rengøringshjælp — hvad er billigst?"
- "Selv-flytning vs. flyttefirma 2026"
- "Privat rengøring vs. rengøringsfirma"
- "Vikar vs. fast rengøringshjælp"
- "Lej en håndværker vs. gør-det-selv"
- "Varmepumpe vs. fjernvarme vs. gasfyr"
- ...og 19 flere

ComparisonTable schema + visuelle pris-tabeller.

## Pakke 3 — Pris-dybdedyk (25 artikler)

Konkret prisindhold scorer højest på "X pris"-søgninger:

- "Hvad koster rengøring pr. time 2026?" (med regionstabel)
- "Flyttepris pr. m² — komplet oversigt"
- "Timepris VVS 2026 — alle regioner"
- "Hvad koster en maler pr. m²?"
- "Elektriker timepris 2026"
- Plus 20 håndværker/service-specifikke prisguides

Alle med Price-tabel, HowTo schema for "Sådan får du den bedste pris", og link til prisberegneren.

## Pakke 4 — Problem/løsning (20 artikler)

Lange long-tail spørgsmål konkurrenterne ikke dækker:

- "Skimmelsvamp i badeværelse — hvad gør jeg?"
- "Tilstoppet afløb — selv eller VVS?"
- "Hul i væg efter flytning — sådan udbedrer du"
- "Lugt fra vaskemaskine — komplet guide"
- "Maling skaller af — årsag og løsning"
- ...og 15 flere

HowTo schema for hver — udløser step-by-step rich snippets.

## Pakke 5 — Sæson & checklister (10 artikler)

- "Forårsrengøring 2026 — komplet checkliste"
- "Vinterklargøring af haven — måned for måned"
- "Julerengøring — 7-dages plan"
- "Flytte-tjekliste 8 uger før"
- ...og 6 flere

ItemList schema for checklister.

---

## Tekniske forbedringer (kører parallelt)

### A. Schema-opgradering
- Tilføj `HowTo` schema-generator i `defineBlogPost` (auto-genererer fra `ordered`-lister)
- Tilføj `LocalBusiness` schema for by-artikler
- Tilføj `ComparisonTable`/`Product` schema for sammenligninger
- Verificér alle eksisterende posts har korrekt `BreadcrumbList`

### B. Internt linknetværk
- Udvid `RelatedContent` til at vise 6 artikler (i dag 3) baseret på shared tags
- Tilføj `<InlineLinks>`-komponent: viser 2-3 kontekstuelle in-body links
- Auto-generér tag-baserede kategorisider: `/blog/kategori/rengoering`, `/blog/by/koebenhavn` osv. (15+ nye landing pages)

### C. Performance & Core Web Vitals
- Lazy-load alle blog-routes (allerede gjort, verificér)
- Preconnect til Google Fonts + Supabase
- `loading="lazy"` på alle blog-billeder
- Tilføj `<link rel="preload">` for hero-fonts

### D. Sitemap & GSC pipeline
- `scripts/generate-sitemap.ts` opdateres automatisk når blogPosts.ts ændres
- Tilføj `lastmod` baseret på artiklens `updatedAt`-felt
- Efter hver pakke: re-submit sitemap til GSC (`https://serviceydere.dk/` + `sc-domain:serviceydere.dk`)
- URL inspection på 10 nøgleartikler pr. pakke for at verificere indexing-status

### E. Meta-optimering
- Hver artikel: title ≤60 tegn, description 140-160 tegn, med target-keyword i begge
- OG-image fallback (vi har én — bevar)
- Canonical = self på alle nye sider

---

## Leveringsplan (sekventiel implementering)

```text
Uge 1: Pakke 1 (40 lokale artikler) + tag-kategorisider + HowTo schema
Uge 2: Pakke 2 (25 sammenligninger) + udvidet RelatedContent
Uge 3: Pakke 3 (25 prisguides) + LocalBusiness schema
Uge 4: Pakke 4 (20 problem/løsning) + InlineLinks
Uge 5: Pakke 5 (10 sæson) + GSC re-submission + URL inspection
```

Hver "uge" = én chat-runde. Du godkender, jeg leverer pakken samlet (alle filer + opdateret `blogPosts.ts` + regenereret sitemap + GSC submit + verifikation).

## Forventet effekt

- **Indekserbare sider:** 122 → ~270
- **Long-tail keywords dækket:** ~600 → ~2.500
- **Featured snippets** (FAQ/HowTo): 45 → 270
- **Estimeret organisk trafik (3-6 mdr):** 2.000-4.000 daglige besøg
- Konkurrent-paritet på de fleste "[ydelse] pris", "[ydelse] [by]" og "hvor ofte [opgave]" søgninger

## Tekniske detaljer (kort)

- Ingen design-ændringer — eksisterende `BlogArticleLayout` + `defineBlogPost` genbruges 1:1
- Ingen nye dependencies
- Ingen DB-ændringer
- Ny route-mønstre: `/blog/[by]-[ydelse]`, `/blog/sammenlign/[a]-vs-[b]`, `/blog/kategori/[tag]`, `/blog/by/[by]`
- Sitemap regenereres automatisk via eksisterende `predev`/`prebuild` hooks

---

**Start jeg med Pakke 1 (40 lokale artikler + tag-kategorisider + HowTo schema) når du trykker "Implementer plan"?**
