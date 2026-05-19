# Plan: Overblik-format, medarbejder-redesign, rutekørsel omtænkning

## 1. Overblik (virksomhedspanelet) — tal-format

**Filer:** `src/components/admin/DashboardTab.tsx`

- Erstat `fmtKrShort` med fuld dansk formatering: `3.700 kr` i stedet for `3,7k kr`.
- Standardisér ALLE beløb til at bruge `fmtKr` (tusindtals-punktum, ingen forkortelser).
- Sweep øvrige steder hvor `{order.total_amount} kr` mangler tusindtals-formatering — sørg for at `3500` vises som `3.500 kr` ikke `3500 kr`.
- Check sparkline-bar-labels (linje 1155) — vis fuld tal.
- Gennemgå hele Overblik-siden (hilsen, snapshot-pille, stat-kort, ordre-liste, lister) for danske formuleringer der virker forkerte.

## 2. Medarbejder-design — Forside + Statistik

**Mål:** Samme designsprog som Overblik: lyse `SectionCard`, `StatCard`, `PageHeader`, mørk hero-top på relevante steder, rolig typografi, accent-sparsomt.

**Filer:** `src/pages/EmployeeApp.tsx`, `src/pages/EmployeeStats.tsx`

### Forside (EmployeeApp)
- Mørk velkomst-hero i top med "God morgen, [navn]" + dagens nøgletal-pille (stops i dag, kørte km, indtjent).
- Snapshot-grid (4 kolonner): I dag · Næste stop · Færdig · Optjent.
- "Næste stop"-kort som primær handling med adresse, kunde, ETA, CTA "Start kørsel" / "Marker færdig".
- Liste over dagens stops i `SectionCard` med ren typografi, status-chips.
- Genbrug `AdminUI` komponenter (PageHeader, StatCard, SectionCard, PrimaryButton).

### Statistik (EmployeeStats)
- `PageHeader` i top med periode-vælger som action.
- 4 `StatCard`'er (indtjening, stops, timer, snit-bedømmelse) med sparklines.
- `SectionCard` med chart (uge/måned) og top-services/kunder.
- Samme tonepalette som Overblik (emerald/blue/violet/amber).

## 3. Rutekørsel — fuld omtænkning

**Fil:** `src/pages/EmployeeRoute.tsx` (2233 linjer — refaktor til mindre dele).

**Ny IA:**
```text
┌──────────────────────────────────────┐
│ Mørk kompakt header                  │
│ "Rute · 7 stops · ETA 14:22"   [✕]   │
├──────────────────────────────────────┤
│                                      │
│        KORT (60% af skærm)           │
│   live position + rute-polyline      │
│   næste-stop markør fremhævet        │
│                                      │
├──────────────────────────────────────┤
│ NÆSTE-STOP BANNER (sticky)           │
│ "Næste: Hr. Hansen · 4 min · 1,2 km" │
│ [Naviger] [Ring] [Færdig]            │
├──────────────────────────────────────┤
│ SWIPE-STOPS rail (horisontal)        │
│ Stop 1 ✓ │ Stop 2 ▶ │ Stop 3 │ ...  │
└──────────────────────────────────────┘
```

- **Næste-stop banner**: kontekstuelle handlinger (Naviger i Google/Apple Maps, Ring til kunde, Marker færdig, Spring over).
- **Swipe-rail nederst**: horisontal scroll med stop-kort. Aktivt stop highlighted. Tryk → bottom-sheet med stop-detaljer.
- **Smart logik**:
  - Live ETA opdateres fra GPS-position.
  - Advarsel-chip i header hvis forsinket > 10 min ift. planlagt.
  - Auto-avancér til næste stop når et stop markeres færdigt.
  - "Omdiriger"-knap hvis trafik kræver ny rækkefølge (eksisterende `apply-route-suggestion` edge function).
- **Visuelt**: samme accent-teal sparsomt, foreground til ikoner, mørk header som forsiden, `SectionCard` til detaljer-sheet, store touch-targets (44px+).
- Behold al eksisterende GPS/navigation/smoothing-logik fra `useGpsFilter`, `useSmoothPosition`, `useCurrentManeuver`.

## Rækkefølge / leverancer

1. **Overblik tal-format** (lille, hurtigt — første commit).
2. **EmployeeApp forside** redesign.
3. **EmployeeStats** redesign.
4. **EmployeeRoute** fuld omtænkning — opdel i ny komponent-struktur (`RouteHeader`, `NextStopBanner`, `StopsRail`, `StopDetailSheet`) i `src/components/employee-route/`.

## Tekniske noter (for dev)

- Behold alle hooks i `src/components/employee-route/`.
- Bruger `AdminUI`-komponenter for konsistens.
- Ingen ændring af backend / edge functions / database.
- Ingen ændring af eksisterende GPS-pipeline — kun præsentation.
- Cart-style horizontal scroll: brug eksisterende `HorizontalScroller` mønster fra landing.
