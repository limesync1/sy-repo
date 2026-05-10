## Plan: 4 forbedringer til bestillinger, ruter og services

Dette er et større stykke arbejde fordelt på 4 områder. Jeg foreslår at vi tager dem som separate, fokuserede ændringer for at undgå fejl i de meget store filer (AftaleTab er 2400 linjer, useRoutes 1600 linjer, SettingsTab 2200 linjer).

---

### 1) "Opret bestilling"-dialog: erstat tidsfelter med opstartsdato

**Hvad:**
- Fjern felterne "Tidsrum (start–slut)" og "Estimeret varighed" fra `CreateManualOrderDialog`
- Omdøb "Foreslået dato" til **"Opstartsdato"**
- I databasen mappes opstartsdato til `preferred_date` (uændret kolonne), `preferred_time_start/end` og `estimated_duration_minutes` sættes til `null`
- I aftale-detaljevisningen (`AftaleTab`) vises "Opstartsdato" i stedet for "Foreslået dato / Tidsrum / Varighed" når disse er tomme

**Hvorfor opstartsdato giver mening:** for gentagende aftaler er det den dato hvor første udførsel starter — derefter overtager rute-planlægningen tidsstyringen.

---

### 2) "Opret bestilling" springer kunde-godkendelse over

**Hvad:**
- I `CreateManualOrderDialog` sættes `requires_customer_approval = false` og `status = 'confirmed'` direkte ved oprettelse fra virksomhedspanelet
- Kunden modtager **ordrebekræftelse** (samme template som ved selvbestilling) i stedet for "godkend bestilling"-mail
- Eksisterende "send godkendelseslink"-flow fjernes fra dialogen

**Effekt:** aftalen er klar til planlægning med det samme; ingen ventetid på kunde-svar.

---

### 3) Gentagende ruter / faste aftaler i kalenderen

Dette er den mest omfattende del. Forklaring:

**Nuværende opførsel:** når en aftale er en abonnementsaftale (interval ≠ engangskøb), opretter `auto_recur_due_orders()` (DB-funktion) en NY ordre + route_stop først når `next_service_date` er passeret. Derfor kan man kun se "næste" — ikke fremtidige forekomster.

**Forslag:**
- **Visuelt i kalenderen** (`CalendarPlanner` + `MonthWeekCalendar`): tegn "virtuelle" forekomster af gentagende stops på alle fremtidige datoer baseret på subscription-interval, indtil et valgt horisont (fx 6 måneder frem). Virtuelle stops er read-only (kan ikke flyttes/redigeres) og vises med rutens navn + farve men dæmpet (50% opacity + lås-ikon).
- **"Næste udførsel"-badge** vises på selve rutekortet (fx "Næste: 10. maj").
- **Medarbejder-låsning:** i `EmployeeApp` / route-stop-listen vises kun den næste planlagte rute som "udfør-bar". Fremtidige ruter er låst med besked "Tilgængelig efter forrige rute er gennemført". Når den aktive rute markeres `completed`, åbner DB-trigger `auto_recur_due_orders` for næste forekomst (allerede eksisterende mekanisme).
- **Rutens identitet arves:** route_stops viser allerede `route.color/name`. Vi sikrer at virtuelle forekomster i kalenderen + medarbejderpanel viser samme farve/navn.

**Tekniske detaljer:**
- Virtuelle stops genereres client-side i en ny helper `expandRecurringStops(stops, subscriptions, horizonDays)` — ingen DB-ændringer nødvendige
- `MonthWeekCalendar` får en `virtualStops` prop og renderer dem dæmpet
- `EmployeeRoute`-siden får en check: hvis der findes en åben rute med tidligere `route_date`, lås den nuværende

---

### 4) Standard-medarbejder pr. service

**Hvad:**
- Tilføj kolonne `default_employee_id uuid` på `services`-tabellen (FK til `employees.id`, `ON DELETE SET NULL`)
- I service-redigering på `SettingsTab` (Services-fanen): tilføj en "Standard-medarbejder"-dropdown
- Ved oprettelse af aftale (`CreateManualOrderDialog` + customer-flow) auto-vælges denne medarbejder på den tilknyttede `route_stop` hvis ingen er valgt
- Manuelle ændringer på en aftale påvirker ikke service-defaulten

**Migration:**
```sql
ALTER TABLE public.services ADD COLUMN default_employee_id uuid REFERENCES public.employees(id) ON DELETE SET NULL;
```

---

### Implementeringsrækkefølge

Jeg foreslår vi tager dem i denne rækkefølge for at holde diff'erne overskuelige:

1. **Punkt 1 + 2** (samme dialog — `CreateManualOrderDialog` + lille ændring i `AftaleTab`-visning)
2. **Punkt 4** (migration + Services-fane + auto-tildeling i CreateManualOrderDialog)
3. **Punkt 3** (kalender-udvidelse — størst, kræver mest test)

### Spørgsmål inden jeg går i gang

- **Punkt 3 horisont:** skal virtuelle forekomster vises 3, 6 eller 12 måneder frem? (Default: 6)
- **Punkt 3 medarbejder-lås:** skal en låst rute helt skjules i medarbejder-app, eller vises som "kommende" med disabled-knap? (Min anbefaling: vis som disabled så medarbejderen kan se hvad der venter)
- **Punkt 1:** skal vi helt slette tidskolonnerne fra DB, eller bare lade dialogen ikke udfylde dem? (Min anbefaling: lad kolonnerne stå — andre flows bruger dem stadig)

Skal jeg bare gå i gang med standardvalgene, eller vil du justere noget først?