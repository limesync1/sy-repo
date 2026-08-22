# Designløft: forside, virksomhedssider, kundepanel og hero-højder

## 1. "Drevet til at vækste din serviceforretning" (forsiden)

Sektionen skal matche fakta fra /software og /bliv-udbyder præcist:

- Prismodellen hentes fra samme kilde som prissiden (289 kr./md. basis med ruteplanlægning
  inkluderet, 2.269 kr. opstart på første faktura, +269 kr./md. regnskabsintegration,
  +59 kr./md. pr. ekstra medarbejderlogin) i stedet for hårdkodede tal i sektionen.
- Manglende, men korrekte detaljer tilføjes: 14 dages gratis prøveperiode uden kort,
  ingen binding, og at Serviceydere selv hjælper med import af eksisterende kunder
  (1.495 kr. engangsbeløb) — i dag står der intet om import.
- "Kom i gang gratis" ændres til en formulering der ikke lover et gratis produkt
  ("Prøv gratis i 14 dage").
- Design: strammere bento — mørkt hero-tile, feature-kort med tydeligere ikon-farver,
  og prisblokken som to jævnbyrdige kort med tydelig "inkluderet / tilvalg"-adskillelse
  samt link til den fulde prisside.

## 2. "Nye virksomheder i Danmark"

- "Nyeste på platformen"-badge og de tre tælle-chips ("3 nye profiler, 1 verificeret,
  3 byer") fjernes — de er utydelige og virker små når platformen er ny.
- I stedet: klar overskrift, én forklarende undertekst, og en enkelt tydelig CTA
  ("Se alle virksomheder").
- Kortene får bedre hierarki: cover, logo, navn, by, branche-chip og en tydelig
  "Se virksomhed"-knapflade i stedet for en tekstlinje. Verificeret-badge beholdes.
- Rulle-rækken får synlige pile/kant-fade så det er tydeligt at man kan scrolle.

## 3. Cover- og servicebilleder på virksomhedssider

- Cover: i dag fast højde (h-48 → h-80) som beskærer billedet hårdt. Ændres til et
  fast, forudsigeligt bredformat (16:6 på desktop, 3:2 på mobil) med `object-cover` og
  fokus i midten, så billedet altid ser helt ud. Klik åbner coveret i fuld størrelse.
- Uden cover: en pæn brandet gradient-flade i stedet for en tom grå bjælke.
- Servicebilleder: i dag kun 64–96 px høje. Ændres til et rigtigt 16:9-billedfelt
  øverst på kortet, med skarp skalering og lazy-load. Kort uden billede får en
  farvet branche-ikon-header, så grid'et ikke bliver skævt.

## 4. Services-sektionen på virksomhedssider

- Hvert servicekort får tydelige zoner: billede → navn og beskrivelse → hvad du kan
  vælge (interval, timer, prisberegner-felter) → pris → handling.
- Tydelige labels: "Vælg hvor ofte", "Angiv omfang", "Din pris" — så det er klart hvad
  der kan justeres, og hvad der er fast.
- Fast pris vises som "Fast pris" med tydeligt beløb; beregnede priser vises som
  "Estimeret pris" med kort forklaring.
- Farve: hver branche/servicekategori får sin egen accentfarve (samme deterministiske
  farvelogik som "Find den rette branche" på forsiden), brugt på ikon, chip og
  pris-flade — så siden bliver mere levende uden at bryde designsystemet.
- Kortene bliver mere luftige, tydeligere knapper og bedre touch-mål på mobil.

## 5. Kundepanelet — "Bestillinger"

- Hver række/kort bliver tydeligt klikbar: hover- og fokus-tilstand, chevron til højre,
  og teksten "Se detaljer".
- Type gøres tydelig med farvede badges: Engangskøb, Abonnement, Aftale, Forslag.
- Status får farvekodning (afventer, bekræftet, udført, annulleret) i stedet for grå tekst.
- Toppen af fanen får en kort forklaring på hvad bestillinger er, plus filtre der
  viser antal, så det er til at forstå ved første besøg.

## 6. Favoritter

- Logoet ligger i dag halvt uden for billedet og bliver klippet af kortets kant.
  Kortet bygges om: cover i toppen, logo indlejret i en hvid ramme der ikke overlapper
  kanten, og en indholdsblok med navn, branche og by.
- "Fjern"-knappen bliver et hjerte-toggle med bekræftelse via undo-toast i stedet for
  en skraldespand oven på billedet.
- Ensartet korthøjde, tydelig hover, og samme kortstil som "Nye virksomheder".

## 7. "Software" omdøbes til "Systemet"

- Navigationslabel, sidetitler, brødtekst-henvisninger og meta-titler ændres til
  "Systemet" (fx "Systemet til servicevirksomheder").
- URL'erne /software/* beholdes uændret — ingen redirects, ingen SEO-risiko.

## 8. Hero-højder på mindre skærme

Forsiden, Find services, Få tilbud, Bliv udbyder og Systemet får lavere heroer under
1024 px: reduceret lodret luft, mindre overskrift-skala og strammere afstand til
CTA'erne. Derudover en diskret "scroll"-indikator i bunden af heroen på mobil, så det
er tydeligt at der er mere indhold nedenunder.

## Teknisk

- Berørte filer: `src/components/landing/ForBusinesses.tsx`, `RecentBusinesses.tsx`,
  `HeroSection.tsx`, `PageHero.tsx`, `src/pages/DynamicBusinessPage.tsx`,
  `src/components/business/DynamicServiceCard.tsx`, `src/pages/CustomerDashboard.tsx`,
  `src/components/SiteNav.tsx`, `src/pages/software/*`.
- Priser genbruges fra prissidens datakilde, så tal aldrig kan komme ud af sync igen.
- Kun præsentation og tekst — ingen ændringer i database, betaling eller forretningslogik.
- Alt tjekkes på mobil, tablet og desktop.
