

# Fase 1 — Serviceydere Landing Page

Kundefokuseret forside. Ingen "Opret din virksomhed"-CTA — virksomheder tiltrækkes via markedsføring.

## Sektioner

1. **Hero** — Logo (fra uploadede filer), tagline ("Find den rette service – hurtigt og nemt"), søgefelt med kategori-forslag, CTA-knap "Find en service". Accent `#6AE9F5` på knapper/accents, lyst tema.

2. **Sådan virker det** — 3 trin: Søg → Sammenlign → Book. Ikoner + kort tekst.

3. **Populære kategorier** — Grid med kategori-kort (Rengøring, Håndværker, Flyttehjælp, Haveservice, etc.) med ikoner.

4. **Indhent 3 tilbud** — Kort sektion: "Beskriv dit projekt og modtag 3 tilbud" + CTA-knap.

5. **Hvorfor Serviceydere?** — 3-4 fordele for kunder (Gratis at bruge, Verificerede virksomheder, Sammenlign priser, Ægte anmeldelser).

6. **Footer** — Logo, links, kontakt, sociale medier.

## Teknisk

- Opdater `src/pages/Index.tsx` med alle sektioner som komponenter
- Opret komponenter: `HeroSection`, `HowItWorks`, `Categories`, `GetQuotes`, `WhyUs`, `Footer`
- Kopier uploadede logo-filer til `public/`
- Opdater favicon med `serviceydere-ikon.png`
- Opdater `index.html` title til "Serviceydere – Find den rette service"
- Accent `#6AE9F5`, dansk sprog, responsivt design
- Tilføj custom farver i `tailwind.config.ts`

