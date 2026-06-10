## 1. Tydelig status-etiket på tidslinjen

På `RouteOccurrenceTimeline` har hver `agreement_occurrence` allerede en status (`planned`, `ready`, `confirmed`, `in_progress`, `completed`, `cancelled` osv.) + en låst/klar afledt tilstand baseret på `planned_arrival`. I dag vises kun "Udført", "Låst", "Klar" som lille tekst. Vi gør den til en rigtig **status-badge** der altid er synlig pr. occurrence, og dækker hele livscyklussen:

| Tilstand | Badge | Hvornår |
|---|---|---|
| Låst (fremtidig) | grå "Låst" + låse-ikon | `planned_arrival` ligger i fremtiden ud over låse-vindue |
| Planlagt | blå "Planlagt" | status `planned` og inden for vinduet |
| Klar til kørsel | accent "Klar" | status `ready` / dagen er i dag og medarbejder kan starte |
| Bekræftet | violet "Bekræftet" | status `confirmed` (kunden har godkendt) |
| I gang | amber "I gang" | status `in_progress` |
| Udført | grøn "Udført" + ✓ | status `completed` |
| Faktura sendt | grøn outline "Faktureret #1234" | `invoice_external_number` findes |
| Faktura venter | gul "Faktura venter" | completed men ingen `invoice_external_number` |
| Annulleret | rød "Annulleret" | status `cancelled` |

Implementering:
- Ny lille helper `occurrenceStatusBadge(occ)` i `src/lib/statusColors.ts` der returnerer `{label, className, icon}` baseret på status + afledte felter (planned_arrival, invoice_*).
- I `RouteOccurrenceTimeline.tsx` erstattes de tre ad‑hoc tekstlinjer (`Udført`/`Låst`/`Klar`) af én konsistent `<span>` med klassen fra helperen + ikon. Faktura-/ordre-chips beholdes nedenunder.
- Samme helper bruges også i `StopDetailsContent.tsx` og `RouteEditSheet.tsx` (hvor occurrencen vises i toppen) for konsistens.

## 2. Ruteplanlæggerens UI/UX – konkrete forbedringer

### 2a. "+N ruter" skal vise ruterne inline, ikke åbne en sheet
I `MonthWeekCalendar.tsx` (linje ~880) udvider `+N ruter`-knappen i dag dagens overblik. Vi ændrer den til at **toggle "vis alle" pr. celle** via lokal state (`expandedDays: Set<string>`). Når klikket: `MAX_VISIBLE` ignoreres for den dag, knappen bliver "− skjul". Dagens overblik åbnes stadig hvis man klikker selve dato-tallet (eksplicit handling). 

### 2b. Modaler skal kunne lukkes på flere måder
Audit alle dialoger/sheets i `src/components/route-planner/`:
- `RouteEditSheet`, `StopDetailSheet`, `AllUnassignedDialog`, `BulkMoveRoutesDialog`, `BulkShiftDateDialog`, `MergeRoutesDialog`, `MoveProjectedOccurrenceDialog`, `MoveRouteDateDialog`, `MoveStopsDialog`, `DeleteRouteDialog`, `RouteHistoryDialog`, `RoutePrintDialog`, `SeriesScopeDialog`, `SuggestRouteDialog`, `CreateManualOrderDialog`, `DiagnosticsDialog`, `DayDetailPanel`.

Vores `Dialog`/`Sheet` (Radix) understøtter allerede **Esc** og **klik på overlay** by default. Vi tjekker at:
- Ingen bruger `onPointerDownOutside={(e)=>e.preventDefault()}` eller `onEscapeKeyDown` uden grund — fjernes hvor det ikke er kritisk.
- Destruktive dialoger (delete) får en explicit "Annullér"-knap i footeren.
- Sheets på mobile har et tydeligt swipe-down / "Færdig"-knap i bunden.
- Tilføj en synlig "Annullér" / "Færdig"-footerknap i alle sheets der i dag kun har "X" i hjørnet (`RouteEditSheet`, `StopDetailSheet`, `DayDetailPanel`).

### 2c. Bredere UX-strømlining
1. **Konsekvent toolbar-sprog**: erstat blandede CTA-labels ("Gem ændringer" / "Opdatér" / "OK") med konsekvent "Gem" + "Annullér".
2. **Tydeligere drag-affordance**: når man holder en aftale, vis kun gyldige drop-mål — øvrige dage får `opacity-40` i stedet for den nuværende subtile tint, så det er åbenlyst hvor man kan slippe.
3. **Synlig kontekstmenu-trigger**: rute-piller har i dag højre-klik kontekstmenu (skjult for de fleste). Tilføj en lille `⋯`-knap der er synlig ved hover på desktop og altid på touch.
4. **Forklarende tooltips på badges/ikoner**: låste ruter, projicerede (stiplede) ruter, skill-mismatch-prik — alle får en forklarende `title`/`<Tooltip>` så førstegangsbrugere forstår hvad symbolet betyder.
5. **Tom-tilstand for dage**: i stedet for kun "Slip her" ved drag, vis en diskret "+ Opret rute"-affordance når man hover'er på en tom dag (kun fremtid).
6. **Dagens overblik (`DayDetailPanel`)**: tilføj en kort header med antal ruter, antal stops, samlet varighed og første/sidste afgang — i dag skal man læse listen for at få overblikket.
7. **Tastaturgenveje**: shortcuts-help (`RoutePlannerShortcutsHelp`) findes allerede; tilføj en synlig "?"-knap øverst i planneren der åbner den, så de er opdagelige.
8. **Loading-feedback**: erstat skeletons med en lille spinner + tekst ("Henter ruter …") i tomme uger så det er klart om data mangler vs. ingen ruter findes.

## Filer der ændres

- `src/lib/statusColors.ts` — ny `occurrenceStatusBadge` helper
- `src/components/route-planner/RouteOccurrenceTimeline.tsx` — brug ny badge
- `src/components/employee/StopDetailsContent.tsx`, `src/components/route-planner/RouteEditSheet.tsx` — vis samme badge
- `src/components/route-planner/MonthWeekCalendar.tsx` — toggle "+N ruter" inline + drag-affordance + tom-dag CTA + tooltips
- `src/components/route-planner/DayDetailPanel.tsx` — header med overblik
- Alle modal/sheet-komponenter i `route-planner/` — verificér Esc/overlay-luk, tilføj footer "Annullér"-knapper hvor de mangler, ensret CTA-labels
- `src/components/route-planner/CalendarPlanner.tsx` (eller wrapper) — synlig "?"-knap til shortcuts

## Out of scope
- Ingen ændringer i database-skema eller backend-status-flow. Status-værdier eksisterer allerede.
- Ingen ændring i selve fakturerings-/ordre-flowet — kun visning af badge.