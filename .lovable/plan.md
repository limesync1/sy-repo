
# Stort UI/UX-løft: Ruter · Aftaler · Kunder

Bekræftet først: alle 21 forekomster fra dine 2 aftaler er nu på ruter (mette jensen, månedlig + hver 14. dag). Auto-materialisering virker. ✓

Mål: De tre sider skal føles som én sammenhængende app — samme sprog, samme komponenter, samme rytme. Færre klik, bedre overblik, smukkere look.

## Fælles fundament (deles på tværs af alle 3 sider)

Nye genbrugskomponenter under `src/components/admin/shared/`:

- **`PageHeader`** — stor titel + undertekst, primær CTA-knap, inline søg, antal-badge. Ens på alle sider.
- **`StatCardRow`** — 4 KPI-kort øverst (fx "Aktive aftaler · MRR · Næste 7 dage · Ubekræftede").
- **`DataTable`** — sticky header, hover-row, klik-åbner-panel, sortérbare kolonner, tom-tilstand med illustration + CTA.
- **`DetailSheet`** — højre-glide-panel (shadcn Sheet) til detalje/rediger uden side-skift.
- **`StatusPill`** — én farveskala for status på tværs af aftaler/ruter/kunder.
- **`EmptyState`** — venlig dansk tekst + ikon + primær CTA.
- **`QuickFilters`** — chips med antal pr. status (Alle 12 · Aktive 8 · Pause 2 · Afsluttet 2).

Designtokens vi læner os op ad: foreground for primær handling, accent (teal) sparsomt, bløde shadows, 16px radius på kort.

## Side 1: Kunder

Ny struktur:
```text
[PageHeader: "Kunder" + "Tilføj kunde"]
[StatCardRow: I alt · Privat · Erhverv · Med åben aftale]
[QuickFilters: Alle · Privat · Erhverv · VIP · Inaktive]   [Søg]
[DataTable]
  Avatar+navn · Type · Kontakt · By · Aftaler (chip) · Sidste besøg · ⋮
  → klik åbner DetailSheet med 3 tabs: Info · Aftaler · Dokumenter
```

- Privat- og erhvervskunder samlet i én tabel med tydelig type-pill.
- Inline-handling: ring-op, send mail, kopi-adresse direkte fra rækken.
- Detalje-sheet viser kundens aftaler + næste besøg uden side-skift.

## Side 2: Aftaler

Ny struktur (split-view):
```text
[PageHeader: "Aftaler" + "Ny aftale"]
[StatCardRow: Aktive · MRR · Næste 7 dage · Afventer godkendelse]
[QuickFilters med antal pr. status]               [Søg + interval-filter]
[Venstre 60%: DataTable]              [Højre 40%: forhåndsvisning]
  Kunde · Interval-badge · Næste     →  Når en række er valgt:
  besøg · MRR · Status · ⋮              kunde, services, kommende
                                         forekomster (mini-tidslinje),
                                         knap "Åbn fuld redigering"
```

- Næste 4 forekomster som chip-tidslinje pr. aftale.
- Hurtig-handlinger: Pause · Genoptag · Afslut serie · Dupliker.
- Tom-tilstand: stor venlig "Opret din første aftale" med CTA.
- Form-dialog: ryddet op i sektioner (Kunde → Service → Tid & interval → Pris).

## Side 3: Ruter

Beholder kalender/kort, men polerer chrome'en så den matcher de andre to:

- Ny `PageHeader` øverst med dato-vælger + "Auto-fordel" + "Optimer" som primære actions.
- StatCardRow: Stops i dag · Estimeret km · Estimeret timer · Uden rute.
- "Aftaler uden rute"-panel får samme look som DataTable-rækker.
- Manuelt-stop knap omdøbes/tydeliggøres med ikon.
- Farve-konsistens: rute-farver = aftale-farver = kunde-type-farver.

## Tekniske detaljer

- Ny mappe `src/components/admin/shared/` med 7 nye filer (ovenstående komponenter).
- `AgreementsTab.tsx` refaktoreres til `AgreementsTab.tsx` (liste+sheet) + `AgreementFormDialog.tsx` (udskilt).
- `CustomersTab.tsx` får ny tabel-render og DetailSheet — eksisterende `CustomerEditDialog` genbruges som "fuld redigering".
- `RoutePlanner.tsx` får udskiftet header + stats-bar + panel-styling. Drag-and-drop logik røres ikke.
- Ingen DB-ændringer — kun frontend.
- Danske tekster overalt, semantiske tokens kun (ingen hex i komponenter).

## Hvad jeg IKKE rører

- Backend, hooks, datamodel, RLS, edge functions.
- Drag-and-drop i ruteplanlæggeren.
- Aftale-godkendelses-flow (allerede færdigt).

Estimeret omfang: ~10 nye/ændrede filer, ~1500 linjer. Jeg laver det som ét sammenhængende løft.
