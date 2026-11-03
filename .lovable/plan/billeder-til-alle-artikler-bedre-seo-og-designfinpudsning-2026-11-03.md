# Billeder til alle artikler, bedre SEO og designfinpudsning

## 1. AI-billeder til alle artikler
- Ca. 265 faste blogartikler, 35 guides og alle automatiske SEO-artikler får et eget forsidebillede, der passer til emnet (fx vinduespudser på stige, tæpperens i stue). Fotorealistisk, ensartet stil, ingen tekst i billedet, skandinavisk miljø.
- Billedet vises øverst i artiklen og som lille billede på bloglisten og kategorisider.
- Hvert billede får en dansk beskrivende alt-tekst og et filnavn med søgeordet.
- Nye artikler fra SEO-motoren får automatisk billede, når de skrives; mislykkes billedet, udgives artiklen stadig uden.

## 2. SEO-forbedringer omkring billederne
- Billedet bruges som delingsbillede (Facebook/LinkedIn) i 1200×630 og i Googles artikeldata.
- Billeder lægges i sitemap'et, så Google Billeder kan finde dem.
- Hurtig indlæsning: WebP i flere størrelser, kun det øverste billede hentes med det samme, resten når man scroller.
- Efter udrulning sendes sitemap'et igen til Google Search Console, og de vigtigste sider anmodes om indeksering.

## 3. Designgennemgang af hjemmesiden
- Gennemgang af forside, blog, artikler, branchesider, guides og footer på computer, tablet og mobil med skærmbilleder.
- Rettelser af småting: ujævne afstande, linjelængde i artikler, overskriftsstørrelser, knapper og kort der ikke flugter, tydeligere læsbarhed og kontrast, touchflader på mindst 44 px.
- Undersøge det grå felt under «Sådan virker det».

## Rækkefølge
Opsætning og visning først, derefter billeder til de 30 mest besøgte artikler som prøve, så du kan godkende stilen, og til sidst resten.

## Tekniske detaljer
- Ny kolonne `cover_image` (+ alt) på `seo_articles`; billeder i offentlig storage-bucket `article-images`.
- `seo-engine` genererer billede via Lovable AI (billedmodel) efter kvalitetsgodkendelse.
- Faste artikler: `defineBlogPost`/guide-registre får `image`-felt; batch-generering via backend-funktion, lagres som CDN-pointere.
- `BlogArticleLayout`, `BlogIndex`, prerender-head og sitemap læser samme billedfelt (Article JSON-LD `image`, `og:image`, `<image:image>`).
- Omkostning: ca. 300+ billeder bruger AI-kreditter.
