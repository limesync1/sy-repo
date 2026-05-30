## Plan: Desktop-ruteplanlægger — 5 trin

Jeg deler arbejdet op i 5 separate leverancer, så du kan godkende/justere undervejs. Hver leverance er selvstændig og kan rulles tilbage uden at bryde de andre.

### Trin 1 — Desktop-toolbar (Uge/Måned, dato-stepper, filterpiller)
Mål: tæt, monokromt look der matcher de nye kort.
- Uge/Måned: ægte segmented control (delt baggrund, indre divider, ingen border-radius mellem segmenter), `h-7`, `text-[11px]`, tabular-nums.
- Dato-stepper: `‹ I dag ›` som ét sammenhængende segment med 1px-divider; fjern individuelle button-skygger.
- Filterpiller: ensartet `h-7`, monokrom hvile-tilstand (border-border/70 + text-foreground), accent kun når aktiv. Badge for antal aktive bliver en tæt `bg-foreground text-background` cirkel.

### Trin 2 — "Uden rute"-panelheader (sort / filtre / søg)
- Søgefelt: kompakt `h-8` med ikon-prefiks, clear-knap.
- Sortering: lille dropdown (urgency / dato / postnr / pris) med samme højde som filter-trigger.
- Filter-popover (eksisterende) genbruges; tilføj synlige aktive-chips lige under headeren med X for hurtig fjernelse — så man ser hvad der filtreres uden at åbne popover.
- Resultattæller (`12 af 47`) i samme række, højrejusteret tabular-nums.

### Trin 3 — Snap-linjer + konsekvent drop-feedback
- Når en aftale trækkes: alle gyldige drop-targets får ensartet `ring-1 ring-accent/40 + border-dashed`.
- Hover-target får derudover en 2px accent-snap-linje i top + bund af cellen/rute-pillen (absolut overlay).
- Ugyldige targets dæmpes (`opacity-50`) i stedet for at se identiske ud.
- Én delt util `drop-feedback.ts` så pool, kalenderdag og rute-pille bruger præcis samme klasser.

### Trin 4 — Hover-preview ved drag over rute
- Når et kort hovres over en rute-pille i kalenderen vises et lille floating "ghost"-stop i pillen (samme højde som eksisterende stops) der indikerer indsættelses-position.
- Bruger eksisterende `@dnd-kit` `over`-state — ingen ny library.
- For dag-celler uden ruter: en stiplet placeholder med "Ny rute fra X" som hint.

### Trin 5 — Keyboard-drag + ARIA
- Aktivér `KeyboardSensor` fra @dnd-kit på desktop med standard sortable coordinate getter.
- Aftalekort får `tabIndex=0`, `role="button"`, `aria-roledescription="draggable"`, `aria-describedby` der peger på en skjult instruktion ("Tryk Mellemrum for at tage op, piletaster for at flytte, Mellemrum for at slippe, Esc for at annullere").
- Live region (`aria-live="assertive"`) annoncerer på dansk: "Aftale taget op", "Over rute X position Y", "Sluppet på rute X", "Annulleret".
- Visuelt fokus-ring (`focus-visible:ring-2 ring-accent`) på alle draggable kort.

### Tekniske noter
- Alle ændringer kun i `src/components/route-planner/**` + evt. en delt `lib/drop-feedback.ts`.
- Ingen ændringer i data-layer, hooks eller migrations.
- Genbruger eksisterende tokens fra `card-styles.ts`; tilføjer kun nye konstanter hvis nødvendigt.

### Rækkefølge
Jeg foreslår 1 → 2 → 3 → 4 → 5 (visuelt først, så interaktion). Sig til hvis du vil have en anden rækkefølge, eller om jeg skal lave alle 5 i ét streg.