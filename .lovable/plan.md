Det her er et stort stykke arbejde. Jeg foreslår at vi splitter det i fem leverancer, så hver del bliver gjort ordentligt og du kan godkende undervejs.

## 1. Strukturerede data (Article + FAQPage)

Status i dag:
- Blog-artikler: har allerede Article + Breadcrumb + FAQPage via `BlogArticleLayout`.
- Prisguides: har Article + Breadcrumb + FAQPage indlejret manuelt.
- By-sider (Cleaning/Garden/Handyman/Moving): har FAQ-tekst men IKKE FAQPage JSON-LD, og IKKE Article JSON-LD.

Plan:
- Tilføj `Article` + `BreadcrumbList` + `FAQPage` JSON-LD til alle fire by-side-skabeloner (delt helper, så ingen duplikering).
- Tilføj `Article` JSON-LD til `GuidesIndex` og `HelpCenter` hvor det giver mening (FAQPage er der allerede på `HelpCenter`).
- Sikre at JSON-LD `mainEntityOfPage` og breadcrumb-URL altid matcher `canonicalPath`.

## 2. CMS-lignende blog-skabelon

Status i dag: hver post er en TSX-fil der importerer `BlogArticleLayout`, finder sin meta i `blogPosts.ts` via `findBlogPost(slug)` og leverer JSX-indhold + en `faq`-prop.

Plan:
- Indfør én `defineBlogPost({ slug, hero, faq, sections, related })` factory der returnerer en React-komponent.
- `sections` accepteres som array af `{ heading, body, list?, ordered? }` så et nyt opslag kan oprettes uden JSX.
- En enkelt fil `src/pages/blog/posts/_template.ts` med kommenteret skabelon man kan kopiere.
- Eksisterende posts beholder deres frihed (kan stadig bruge JSX), men nye posts kan oprettes med ren data.

## 3. Flere guides + opslag for resterende brancher

Vi mangler dedikerede pris-/proces-sider for canonical industries: Tømrer, Murer, Skadedyrsbekæmpelse, Anlægsgartner, Gulvlægger, Skorstensfejer, Algebehandling, Sikkerhed.

Plan (ny side pr. branche, samme `ArticleHero` + pris-tabel + proces-sektion + FAQ + CTA):
- `/priser/tomrer`, `/priser/murer`, `/priser/skadedyr`, `/priser/anlaegsgartner`, `/priser/gulvlaegger`, `/priser/skorstensfejer`, `/priser/algebehandling`, `/priser/sikkerhed`.
- Hver guide registreres i `GuidesIndex` og `sitemap.xml`.

## 4. Standardiser ArticleHero + bredde

Status efter sidste runde: forside bruger `max-w-7xl`. Guides bruger `max-w-3xl` til prosa, by-sider `max-w-4xl`, blog-poster `max-w-3xl`. Alle har `ArticleHero`. Det er bevidst (læsbar prosa-bredde), men hero + sidefooter/CTA-bånd skal være 7xl for at matche forsiden.

Plan:
- Skift alle indholds-`<main>` til at have et bredt 7xl-wrapper, hvor selve teksten har `max-w-3xl/4xl` inden i.
- Sørg for at `TrustBar` og afsluttende CTA-bånd udnytter den fulde bredde 1:1 som forsidens sektioner.
- Skift de manuelle `max-w-2xl`/`max-w-5xl` afvigelser på `GuidesIndex` til at matche.

## 5. QA af "Få 3 gratis tilbud"-flow

Plan:
- Verificér via headless Playwright at hver placering af `InlineQuoteTeaser` (blogartikler, guides, by-sider) sender `?postal=&category=` og at `/tilbud` korrekt forudvælger kategorien og viser postnummeret som by-chip.
- Tjek samme for forsidens hero-CTA og `RequestQuote` direkte besøg.
- Rapportér konkret hvad der virker / ikke virker pr. placering med screenshots.

## Foreslået rækkefølge

Jeg laver dem i denne rækkefølge for at undgå konflikter:

```text
1. CMS-skabelon (defineBlogPost)         — fundament
2. Strukturerede data på by-sider        — hurtigt og isoleret
3. Bredde-standardisering                — visuelt sammenhæng
4. Otte nye branche-guides               — størst arbejde
5. QA-kørsel af tilbudsflowet            — verifikation til sidst
```

Hver leverance kommer som én tur. Jeg starter med #1 så snart du godkender planen.