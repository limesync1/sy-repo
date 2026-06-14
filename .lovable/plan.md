
# Mobil-UX-plan: bestilling og virksomhedspanel

Mål: Hele platformen skal føles som en native mobilapp — rolig scrolling, tommelfingervenlige targets, klar hierarki, ingen dialoger der "drukner" indholdet, og ingen indhold der gemmer sig bag bottom-nav/kurv.

Jeg prioriterer kundeoplevelsen (omsætningskritisk) før paneloplevelsen, og bygger fælles mobil-primitiver så samme fix ikke skal laves 10 gange.

---

## Fase 0 — Fælles mobil-fundament (forudsætning, lille)

Bygges først så alle senere faser bruger samme byggeklodser:

- **`MobileSheet`-primitiv** (oven på shadcn Sheet): altid `side="bottom"`, `rounded-t-2xl`, drag-handle øverst, sticky header med titel + luk, sticky footer til primær-CTA, scrollbart midterfelt med `overscroll-contain` + safe-area padding. Erstatter Dialog på mobil for alt brugerinitieret flow.
- **`StickyActionBar`**: bundforankret CTA-bjælke med `env(safe-area-inset-bottom)` der bruges af kurv, "Bestil", "Gem service", "Opret aftale" osv. — løser at primærknapper i dag forsvinder under tastatur/hjemme-bjælke.
- **Scroll-låsning**: når et sheet/sidebar er åbent, lås body-scroll korrekt (ingen "dobbelt-scroll" hvor baggrunden også flytter sig).
- **Touch-targets**: min. 44px højde på alle interaktive elementer; `gap-3` minimum mellem trykbare elementer i lister.
- **Typografi-skala mobil**: én skala (text-sm body, text-base form, text-lg sektion, text-xl side-titel) — i dag blandes text-xs/sm/base tilfældigt og gør hierarkiet rodet.
- **Bunpadding-regel**: alle sider tilføjer `pb-[calc(env(safe-area-inset-bottom)+5rem)]` på mobil så CartFab / AdminBottomNav aldrig dækker sidste række.

---

## Fase 1 — Virksomhedsside + servicekort (kundeflow, mobil)

Filer: `src/pages/DynamicBusinessPage.tsx`, `src/components/business/DynamicServiceCard.tsx`, `ServiceCard.tsx`.

- **Sticky kompakt header** når man scroller: lille logo + virksomhedsnavn + "Ring"/"Bestil"-knap → reducerer behovet for at scrolle op.
- **Kategori-tabs som horisontal scroller** med snap (`snap-x snap-mandatory`), aktiv pill og fade-edges. I dag wrapper de over flere linjer og skubber indholdet.
- **Servicekort-redesign på mobil**: ét kort per række, billede 16:9 øverst, titel + pris i én blok, "Tilføj"-knap i højre hjørne (ikon-only når plads er knap). Fjerner nuværende squeeze hvor pris/CTA brydes.
- **"Læs mere" → bottom sheet** i stedet for at udvide kortet (forhindrer at listen "hopper").
- **Tomme tilstande**: pænt tomt-kort med ikon + tekst i stedet for blankt område.

## Fase 2 — Prisberegner + Tilføj-til-kurv flow

Filer: prisberegner-komponenter i `src/components/business/` (åbnes fra servicekort), `CartSheet.tsx`, `CartFab.tsx`.

- **Prisberegner som fuldskærms-sheet på mobil** (ikke modal): step-baseret med progress-prik øverst og sticky "Næste"/"Tilføj"-knap nederst. Input-felter får store labels OVER feltet (ikke side-om-side) — i dag bliver labels klippet på små skærme.
- **Nummeriske input** (m², stk., timer) bruger `inputMode="decimal"`, +/- stepper-knapper, og levende prisvisning øverst i sheet'et så brugeren ser konsekvensen mens de skriver.
- **Bekræftelse-toast** ved "Tilføjet til kurv" med undo, i stedet for at hoppe direkte ind i kurven.
- **CartFab**: flyttes til `bottom-[calc(env(safe-area-inset-bottom)+0.75rem)]`, badge med antal, og gemmer sig på scroll-ned/viser på scroll-op (Material-mønster).
- **CartSheet (745 linjer)** splittes i `CartItemRow`, `CartSummary`, `CartCheckoutForm`; sticky bund med total + "Til bestilling"; tastatur-håndtering så feltet man skriver i altid scrolles ind i view.

## Fase 3 — Bestilling/checkout (RequestQuote + ApproveOrder)

Filer: `src/pages/RequestQuote.tsx`, `src/pages/ApproveOrder.tsx`.

- **Wizard-layout på mobil**: 3 trin (Kontakt → Adresse & tid → Bekræft), én sektion per skærm, sticky "Tilbage/Næste"-bjælke.
- **Adresse-autocomplete**: dropdown som bottom-sheet (ikke flydende combobox der lægger sig forkert på iOS).
- **Tidsvælger**: dato som horisontal dato-strip (i dag/næste 14 dage), tid som store touch-pills (08–10, 10–12 …) frem for native time-picker.
- **Validering**: fejl vises inline UNDER feltet i rødt, og første fejlfelt scrolles i view ved submit.
- **Bekræftelsesside** med ét stort grønt check, ordrenummer, og knapper "Føj til kalender" / "Tilbage til virksomheden".

## Fase 4 — Virksomhedspanelet: navigation + lister

Filer: `src/components/admin/shared/AdminShell.tsx`, `AdminBottomNav.tsx`, alle `*Tab.tsx`.

- **AdminBottomNav** revideres: max 5 ikoner (Overblik, Aftaler, Kunder, Ruter/Services, Mere) — i dag flyder mange faner ind og bliver små. "Mere" åbner et bottom-sheet med resten.
- **Topbar på mobil** bliver én linje: titel + primær-CTA-ikon. Sekundære knapper (filtre, eksport) flyttes ind i en "…"-menu.
- **Lister (Aftaler, Kunder, Services)** får ensartet `MobileListCard`: titel + 2 metadata-linjer + status-pill + chevron. Ingen tabeller på mobil. Swipe-actions (slet/rediger) overvejes som premium-touch.
- **Filterbjælke** bliver et bottom-sheet kaldet via en "Filtrér"-knap; aktive filtre vises som chips øverst i listen og kan fjernes med ét tryk.
- **Søgefelt** sticky øverst i listen, ikke i topbaren.

## Fase 5 — Oprettelse/redigering i panelet (services, aftaler, kunder)

Filer: `ServicesTab.tsx` (1897 linjer), `AftaleTab.tsx` (2843 linjer), `CustomersTab.tsx` (1489 linjer), `CustomerEditDialog.tsx`, `LeadDetailDialog.tsx`.

- **Alle store dialoger → fuldskærms-sheet på mobil** via `MobileSheet`. Sticky header med "Annullér" + titel + "Gem". Sticky footer med primær-CTA.
- **Formularer i sektioner med accordion**: fx Service-oprettelse splittes i "Grundoplysninger", "Pris", "Tilgængelighed", "Billeder", "Avanceret" — kun én sektion åben ad gangen, så man ikke scroller endeløst.
- **Prisberegner-builder på mobil**: trin-baseret guide (vælg type → tilføj enheder → forhåndsvis) i stedet for det nuværende tæt-pakkede skema.
- **Billed-upload**: stort drop/pick-område, miniaturer som grid 3-kolonner, træk-for-at-omorganisere erstattes på touch af op/ned-pile.
- **Aftale-oprettelse**: kunde-vælger som søgbar bottom-sheet med "Opret ny kunde inline"; service-vælger samme mønster.
- **Refaktorering**: 2-3000-linjers tab-filer splittes til underkomponenter (`AftaleList`, `AftaleDetailSheet`, `AftaleCreateSheet`) — nødvendigt for at kunne lave mobiltilpasningen rent.

---

## Leverancerækkefølge (forslag)

1. Fase 0 (fundament) — 1 lille PR
2. Fase 1 + 2 (kundeside, kurv, prisberegner) — omsætningskritisk
3. Fase 3 (checkout)
4. Fase 4 (panel-navigation + lister)
5. Fase 5 (oprettelses-flows, kræver refaktorering først)

Hver fase afsluttes med mobilskærmbilleder (390×844) til godkendelse før næste fase startes.

---

## Tekniske noter (kort)

- Tailwind breakpoints: alt mobil-først, `sm:` (≥640) er allerede "tablet" — jeg holder ægte mobil-styling som default.
- `vaul` (allerede i shadcn `Drawer`) bruges som motor for `MobileSheet` — undgår at indføre ny dependency.
- `useIsMobile`-hook findes (`src/hooks/use-mobile.tsx`) og genbruges til at swappe Dialog ↔ Sheet.
- Ingen DB-/RLS-ændringer i denne plan — kun frontend/UX.
- Tests: e2e Playwright-spec for "tilføj service til kurv → bestil" på iPhone-viewport tilføjes efter fase 3.
