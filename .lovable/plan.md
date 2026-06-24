## Mål
Dominere Google på alle serviceydelser i Danmark ved at have den dybeste, bredeste og mest velstrukturerede indhold på markedet — bedre end happyhelper.dk, 3byggetilbud, anmeld-haandvaerker og haandvaerker.dk samlet.

Nuværende status: 45 blogartikler + 25 prisguides + 4 by-side-templates + 91→107 sitemap-entries. For at slå konkurrenterne skal vi op på **~250 artikler** med systematisk dækning.

## Strategi: 3 lag af content

```text
Lag 1: Pillar-sider (allerede dækket, kun udvides)
  /priser/{branche}  — prisguides pr. branche (25 stk)
  /guides/{emne}     — faglige guides (8 stk)
  /{branche}/{by}    — by-sider (~80 stk)

Lag 2: Long-tail "spørgsmål" artikler (NY pakke — det her er hovedindsatsen)
  /blog/{spørgsmål}  — én artikel pr. konkret bruger-spørgsmål
                       → fanger Featured Snippets + AI Overviews

Lag 3: Materiale/plet/teknik-guides (NY pakke)
  /blog/{teknik}     — "sådan gør du X" trin-for-trin
                       → fanger long-tail og giver intern PageRank
```

## Pakker (i prioriteret rækkefølge)

### Pakke A — Spørgsmål-artikler pr. branche (90 nye artikler)
6 spørgsmål × 15 brancher. Targeter "hvad", "hvor meget", "hvor ofte", "hvornår", "hvordan", "kan jeg selv".

| Branche | Eksempel-spørgsmål |
|---|---|
| Rengøring | "hvor ofte hovedrengøring", "tæppe vs hårdt gulv", "bortskaffelse af rengøringskemi", "natårhmidler virker", "hvor meget koster timeløn", "skal jeg være hjemme under rengøring" |
| Flyttehjælp | "hvor mange timer flytter 80 m²", "pak selv vs flyttefirma", "forsikring under flytning", "klaver/akvarium flytning", "ophæng nyt sted", "weekendflytning ekstra pris" |
| Håndværker | "fast pris vs timepris", "tilbud uden besøg", "ekstrakrav efter aftale", "1-års gennemgang", "byggepladsbidrag", "vintervejr forsinkelse" |
| Haveservice | "hækkeklipning timer/m", "fældning anmeldelse", "ompotning udendørs", "vinterklargøring", "havemand fast eller engang", "rodfræsning pris" |
| Maler | "hvor mange lag", "spartling priser", "vinduesrammer maling", "tapet eller maling", "loft sprøjte vs rulle", "facademaling holdbarhed" |
| VVS | "akut tilkald pris", "varmtvandsbeholder levetid", "varmepumpe i lejlighed", "kalkfilter pris", "wc løber lyd", "blødt vand fordele" |
| Elektriker | "hpfi udløser", "stikkontakter pr. rum krav", "ladeboks installation", "kabel skjult i væg", "smart home autorisation", "jordfejlsbryder test" |
| Tømrer | "vindue indvendigt eller udvendigt", "trægulv som ny ejer", "loft isolering", "skillevæg pris", "altan terrasse", "skab efter mål pris" |
| Skadedyrsbekæmpelse | "rotter eller mus", "kakerlakker anmeldelse", "borebille træ", "skægkræ bad", "honningbier vs hvepse", "gift børnesikkert" |
| Sikkerhed | "alarm uden abonnement", "videoovervågning GDPR", "låsesmed pris akut", "smart lock sikkert", "tyverisikring forsikring", "døgnvagt opkald" |
| Skorstensfejer | "lovpligtig besøg", "brændeovn miljøkrav", "skorsten ny pris", "pejs renovering", "ineffektiv brændeovn", "fyringssæson kontrol" |
| Vinduespudser | "udvendigt pr. m²", "abonnement vs engang", "højhus stillads", "fastsiddende vinduer", "vinterpudsning", "skader fra højtryksrens" |
| Gulvlægger | "hvor mange gange slibe", "lim vs flydende", "fugtspærre kælder", "varmegulv kompatibilitet", "støvfri slibning", "lakering vs olie" |
| Murer | "fugekvalitet udvendig", "puds reparation", "facaderens", "skorstensreparation", "frostskader mur", "skifertag pris" |
| Algebehandling | "tag rens uden højtryk", "kemi eller mekanisk", "intervaller hvor ofte", "skader på tegl", "facade kalk", "do-it-yourself risiko" |

→ Auto-genereres via samme `defineBlogPost` pattern. Hver artikel: 5 FAQ-spørgsmål, 4–6 sektioner, FAQ-schema + Article-schema.

### Pakke B — Plet- og rengørings-tekniker (40 nye artikler)
Targeter happyhelper.dk's vinder-keywords vi endnu ikke har:
"fjern blod fra tøj", "fjern vin fra sofa", "fjern make-up fra pude", "rens madras", "vask dyne", "rens støvsuger", "rens køleskab grundigt", "rens ovn uden ovnrens", "fjern skimmel fra fuger", "rens vaskemaskinen", "rens opvaskemaskine", "rens kaffemaskine", "rens emhætte", "rens persienner", "rens gardiner", "rens læderpåde", "rens microfiberpude", "rens uldsofa", "rens tæppe selv", "rens parket", "rens linoleum", "rens vinylgulv", "rens fliser bad", "rens kalk i toilet", "fjern lim fra hår", "fjern tjære fra bil", "fjern fugemasse fra fliser", "fjern silikone fra tøj", "fjern voks fra dug", "fjern tyggegummi", "fjern modellervoks", "fjern blæk fra sofa", "fjern kaffeplet", "fjern teplet", "fjern rødvinsplet", "fjern fedt fra emhætte", "fjern lugt fra mikroovn", "fjern lugt fra køleskab", "fjern muggen lugt fra vaskemaskine", "fjern hundelugt fra møbler".

### Pakke C — Tjeklister og sæson-guides (30 nye artikler)
"forårsrengøring tjekliste", "julerengøring", "sommerhus klargøring", "kontorrengøring 50 m²", "AirBnB-rengøring mellem gæster", "barnedåbsforberedelse", "salg af bolig — klargøring", "ny lejer overlevering", "fraflytningssyn checkpoints", "haveplan måned for måned" (× 12), "vinterklargøring tag/facade/haven", "ferieklar bolig", "vinduesvask efter hver årstid".

### Pakke D — Sammenligninger og beslutningsguides (20 nye artikler)
"rengøringsfirma vs fast husholderske", "flytfirma vs lej-en-mand-med-bil", "robotstøvsuger vs håndstøvsuger", "varmepumpe vs gasfyr 2026", "trægulv vs vinyl", "tagsten vs tagpap", "smart alarm vs traditionel", "kalkfilter vs blødgøringsanlæg", "lej eller køb højtryksrenser".

## Tekniske ændringer

### B1: Skift fra hand-kodede `<Route>` til datadrevet routing
107 manuelle `Route`-entries i `App.tsx` skalerer ikke til 250. Tilføj:
- `src/pages/blog/blogPosts.ts` får nyt felt `loader: () => Promise<Component>`
- `App.tsx` mapper `BLOG_POSTS.map(p => <Route path={...} element={lazy(p.loader)} />)`
- Resultat: én ny artikel = 1 ny entry i `blogPosts.ts` + 1 ny fil, ingen App.tsx-ændringer

### B2: Auto-genereret "Relateret indhold" via tags
Udvid `BlogPostMeta` med `tags: string[]` (fx `["rengøring", "pletter", "tøj"]`). `RelatedContent` viser top 6 artikler med flest tags i fælles. Bedre intern linking = bedre indeksering.

### B3: Auto-genereret kategori-sider (15 nye landingssider)
`/blog/kategori/{tag}` — viser alle artikler tagget med fx "pletter" eller "rengoering". Targeter mellem-volumen keywords som "pletfjerner guide" og giver intern linking.

### B4: Structured data-løft
- Hver artikel får `HowTo` JSON-LD når den har en `ordered`-liste (allerede infrastruktur — udvid `defineBlogPost` til at detektere det automatisk).
- BreadcrumbList får tag-niveau (`Blog → Pletter → Fjern svedpletter`).

### B5: Internt link-vagtnet
Tilføj `<RelatedContent>` i bunden af hver artikel + 2–3 inline-links i selve teksten (fx "Læs også [vores guide til afkalkning](/blog/afkalkning-komplet-guide)"). Inline-links skrives manuelt pr. artikel.

### B6: Hreflang og lokalisering forbliver da-DK
Ingen ændringer — vi er bevidst dansk-kun.

## Levering — 6 ugers sprint

| Uge | Leverance |
|---|---|
| 1 | B1+B2+B3 infrastruktur. Pakke A starter (15 artikler, 1 pr. branche) |
| 2 | Pakke A fortsætter (30 artikler) |
| 3 | Pakke A færdig (45 artikler) → 90 artikler i alt |
| 4 | Pakke B (40 plet-artikler) |
| 5 | Pakke C (30 sæson-artikler) |
| 6 | Pakke D (20 sammenligninger) + B4+B5 polish |

**Slutresultat: ~250 artikler, 60 prisguides/by-sider, ~310 indekserbare sider.**

## Forventet effekt (6–12 mdr)
- Adresserbar søgevolumen: **~40.000 søgninger/md** (vs. nuværende ~12.000).
- Realistisk position 5–15 på 40 % af keywords → **2.000–4.000 organiske besøg/md** når autoritet bygger op.
- Slår happyhelper.dk på antal artikler (~75 stk) og dybde (vi har 4–5 FAQ pr. artikel mod deres 0–2).
- AI Overview-citationer via dyb FAQ-struktur — happyhelper har ingen.

## Tekniske detaljer

**Filstruktur (ingen ændring):** Hver artikel = én fil i `src/pages/blog/posts/{Navn}.tsx` der eksporterer `defineBlogPost({...})`. Metadata i `blogPosts.ts`.

**Routing-refactor (B1):**
```ts
// blogPosts.ts
loader: () => import("./posts/StainsSweat"),
// App.tsx
{BLOG_POSTS.map(p => (
  <Route key={p.slug} path={`/blog/${p.slug}`}
    element={React.createElement(lazy(p.loader))} />
))}
```

**Sitemap:** Allerede auto-genererer fra `BLOG_POSTS` — vokser automatisk.

**Ingen design-ændringer.** Eksisterende `BlogArticleLayout`, `ArticleFaqSection`, `RelatedContent` genbruges 1:1.

## Hvad jeg IKKE foreslår
- Ingen migration til Markdown/MDX (overkill — `defineBlogPost` er allerede ren data).
- Ingen separat CMS (Contentful, Sanity) — øger kompleksitet uden gevinst på dansk SEO.
- Ingen SSR i denne omgang. JSON-LD og meta sættes client-side via SEO-komponenten — Googlebot eksekverer JS fint. Hvis vi senere ser indekseringsproblemer på social previews kan vi lægge SSR til.
- Ingen AI-genereret indhold uden review — hver artikel skrives med konkret faglig dybde (priser, doseringer, advarsler) som AI-generisk indhold ikke har.

## Approval-spørgsmål
Hvis du godkender, starter jeg med **Uge 1: B1+B2+B3 infrastruktur + 15 artikler (1 pr. branche)** i næste sving. Sig til hvis du vil:
- Skære i scope (færre brancher / færre artikler pr. uge)
- Prioritere én pakke før de andre (fx Pakke B plet-guides først for hurtige wins mod happyhelper)
- Tilføje engelske versioner (ikke anbefalet for serviceydere.dk).