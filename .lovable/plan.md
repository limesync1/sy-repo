# Designløft af forsiden og de offentlige undersider

Punkt 1 (sammenfoldet sidebar) og punkt 2 ("Kom godt i gang") er allerede rettet i denne omgang:
logo og virksomheds-avatar er nu centreret i den smalle sidebar, og "Kom godt i gang" åbner med
ét stort "Start her"-kort med næste trin, tydelig CTA og en samlet fremgangslinje i stedet for
fire nøgletals-kort.

Herunder er planen for punkt 3.

## Fælles designsprog (fundamentet)

Alle offentlige sider skal føles som samme produkt. Det bygges én gang og genbruges:

- **Sektions-rytme**: fast lodret luft mellem sektioner, skiftevis lys baggrund og en dæmpet
  "surface"-tone, så siden får puls i stedet for én lang hvid flade.
- **Farve**: nuværende teal-accent beholdes, men suppleres med en dyb marine/ocean-tone til
  mørke bånd (hero, CTA, footer) og en varm sand-tone til fremhævede kort. Alt som tokens i
  `index.css` — ingen hardcodede farver i komponenter.
- **Nye delte byggesten** i `src/components/landing/`:
  - `SectionShell` — overskrift + underrubrik + valgfri "eyebrow"-label og baggrundsvariant.
  - `FeatureCard`, `StatStrip`, `StepFlow`, `CTABand` — så hver side bygges af de samme klodser.
- **Bevægelse**: eksisterende `Reveal` genbruges; hover-løft på kort, ingen tunge animationer.
- **Illustration**: branche-ikonerne (SVG) bruges som visuelt element i grids i stedet for
  tomme tekstkort.

## Side for side — hvad hver side får som sin egen signatur

**Forsiden (`/`)**
Beholder hero, men får farve og indhold nedenunder: branche-grid med ikoner ("Hvad skal du have
lavet?"), et roligt "Sådan virker det"-flow i tre trin, populære byer, et fremhævet
tilbuds-bånd og en tydelig split mellem "for private" og "for virksomheder".

**Find services (`/virksomheder`)**
Signatur: *søgning først*. Kraftigere filter-bar, kategori-chips med ikoner øverst, pænere
virksomhedskort (logo, brancher, by, verificeret-badge) og en tom-tilstand der foreslår
nabo-byer i stedet for at være blank.

**Få tilbud (`/tilbud`)**
Signatur: *ét trin ad gangen*. Formularen får et roligt, centreret to-kolonne-layout med
trin-indikator, tillidsstribe ved siden af og en visuel opsummering før afsendelse.

**Bliv udbyder (`/bliv-udbyder`)**
Signatur: *salg*. Mørk hero med værdiløfte, tal-stribe, "sådan kommer I i gang"-flow,
prissektionen som tydelige planer og FAQ i bunden. Priser og vilkår ændres ikke — kun layout.

**Software (`/software` og undersider)**
Signatur: *produkt*. Hero med søgning bevares, men får produkt-visuals, funktionsområderne
vises som bento-grid med ikoner, og undersiderne (ruteplanlægger, medarbejder-app, booking,
fakturering) får samme skabelon: kort hero → 3 nøglepunkter → funktionsliste → CTA-bånd.

**Øvrige (`/om-os`, `/anmeldelser`, `/hjaelp`, `/kontakt`, guides og blog)**
Rettes ind efter det samme sprog via `PageHero` + `SectionShell`, så de ikke falder udenfor.

## Teknisk

- Nye tokens i `src/index.css` og `tailwind.config.ts` (surface, sand, ocean-dybde, sektion-luft).
- Nye delte komponenter i `src/components/landing/`.
- Ingen ændringer i data, priser, tekstfakta eller backend — kun præsentation.
- Alt bygges mobil-først og tjekkes på mobil, tablet og desktop.

## Rækkefølge

1. Tokens + delte byggesten
2. Forsiden
3. Find services + Få tilbud
4. Bliv udbyder + Software
5. Resterende sider rettes ind
