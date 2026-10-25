# Master Audit & Refinement — Serviceydere.dk

Kilde: MASTER_PROMPT_COMPLETE_AUDIT_AND_REFINEMENT_OF_pasted.md
Regel: Kun forbedringer/bugfixes — ingen nye features, intet redesign, ingen schema-/dataændringer.

## Faser
- [x] Fase 1: Kortlæg projektet (4 parallelle audits: layout, performance, SEO, tilgængelighed)
- [x] Fase 2: Prioritering af bekræftede problemer
- [x] Fase 3: Touch-targets ≥44px (footer, kundefilter, onboarding, bulk-bar, undo-bar)
- [x] Fase 4: Virksomhedspanel — a11y på formularer, switches, dokumenter, kontakter
- [x] Fase 5: Performance — søge-cache-nøgle, memo af virksomhedskort, lazy login, billeder
- [x] Fase 6: SEO — 5 nye sitemap-ruter, software-metadata synket, prerender-body, robots
- [x] Fase 7: Tilgængelighed + konsolfejl (fetchPriority), DB-grants rettet
- [x] Fase 8: 564/565 tests grønne, typecheck ren, production build OK (944 prerenderede ruter)

## Bevidst ikke ændret (dokumenteret)
- Auto-prefetch af 4 sider: respekterer allerede save-data pr. projektregel
- Kategori-URLs canonical-politik: kræver produktbeslutning
- Custom-domæne canonical ved build: kræver build-tid data
- businesses select `*`: kræver felt-audit af kortene før indsnævring
- "ref to function component" dev-advarsel: kun i dev, ingen funktionel effekt

## Ruteplanlægger + virksomhedspanel (25. okt.)
- [x] «Tilføj aftale til rute» viser kun kommende, aktive, ikke-udførte ruter (fælles regel + test)
- [x] Panelfaner får egen sidetitel (noindex bevaret)
- [x] Samme regel i flyt stop og forslag til rute; mobil dagstæller adskiller forventede
- [x] Ruteplanlægger + Aftaler: gennemgang 320–1305 px, lyst/mørkt; større knapper og filterrække på mobil
- [ ] Fuld klikgennemgang af resten af panelsiderne (vinduer og gem-handlinger)
- [x] Automatisk gennemgang af 10 panelsider × 5 bredder: ingen vandret rulning, rettet kontakter uden navn, små knapper (services, faktura), indstillinger ved 320 px
