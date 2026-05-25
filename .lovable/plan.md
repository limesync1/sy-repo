## Mål

Tre uafhængige opgaver i ét forløb:

1. **Pagination overalt** — sikre at alle lister med >25 emner får adaptiv pagination.
2. **Rutekalender — stabilitetsfix** — flere konkrete bugs i `/virksomhed/ruter`.
3. **Datasletning** — fjerne alle ruter, services og aftaler for `Ready2Clean ApS` (public_id `0177cdef`, id `8258070b-acc7-4145-b236-e2157001563c`).

Jeg foreslår at vi tager dem i den rækkefølge — opgave 3 er hurtig, opgave 1 er bred men mekanisk, opgave 2 er det største stykke arbejde.

---

## 1) Pagination på alle lister

Bygger videre på eksisterende infrastruktur:
- `PaginationFooter` (Forrige/Næste + "X–Y af Z" + sidetal)
- `useAdaptivePageSize(base=25)` — vælger 10/25/50 ud fra `navigator.deviceMemory`, `hardwareConcurrency`, `connection.effectiveType`, `saveData`

**Lister der allerede paginerer** (verificeret):
- Admin: AftaleTab, CustomersTab, LeadsTab, ReviewsTab, ServicesTab, DataImportTab
- Platform admin: Businesses, Orders, Users

**Lister jeg gennemgår og tilføjer pagination til hvis de mangler det:**
- Admin: `OrdersTab`, `EmployeesTab`, `RoutesTab` (ruteliste, ikke kalender), `AccountingTab` (faner: kunder, produkter, ordrer, DLQ), `MessagesTab`, `NotificationsTab`, `BillingTab/InvoicesTab`, `BusinessCustomersTab`-undertabeller
- Platform admin: `PlatformLeadsTab`, `PlatformReviewsTab`, `PlatformSubscriptionsTab`, `PlatformPaymentsTab`, `PlatformChatTab`, evt. flere
- Kunde: `CustomerDashboard` historik
- Medarbejder: aftalelister hvis lange

Mønster pr. liste:
```ts
const pageSize = useAdaptivePageSize();
const [page, setPage] = useState(0);
useEffect(() => setPage(0), [search, filter, sort]); // reset ved filter
const paged = rows.slice(page * pageSize, (page + 1) * pageSize);
// render paged + <PaginationFooter ... />
```

Jeg lader være med at røre kalenderen/board-views (det giver ikke mening at paginere en kalender).

---

## 2) Rutekalender — bugfixes

Hver bug håndteres som et separat, isoleret fix:

**A. Lag/race ved drag-and-drop laver duplikater af ruter/aftaler**
- Sikre at ALLE mutationer (drop, move, dato-ændring, sletning) går gennem `routeMutationQueue` (eksisterende serial queue med retries).
- Disable drop-zoner mens kø ikke er tom, så en hurtig dobbelt-drop ikke kan trigge to mutations.
- Tilføj idempotens-nøgle (rute-id + dato + occurrence-id) til "create"-handler så samme drop ikke kan oprette to identiske stops.

**B. Klik på projiceret rute → tom side / lag**
- I `RouteEditSheet` (og evt. dag-view) sikre at virtuel rute (`virtual:<routeId>:<date>`) løses korrekt: hydrere fra basisrute + filtrér stops via `filterStopsByOccurrenceDate` for den valgte dato.
- Vis loading-state mens projiceringen hydreres i stedet for tom UI.
- Fang fejl og vis "Kunne ikke åbne projiceret rute — prøv igen" frem for blank side.

**C. Sletning af rute med aftaler får aftaler til at forsvinde**
- Lave delete-flow om: før man kan slette en basisrute, tjek om der findes `agreement_occurrences` eller `agreements.preferred_route_id` der peger på den.
- Hvis ja: vis dialog "Denne rute har X aktive aftaler. Vælg: Flyt aftaler til anden rute / Annullér".
- Aftalerne må aldrig slettes som side-effekt. DB: sæt `agreements.preferred_route_id` til `null` ved rute-sletning (eller bloker) i stedet for cascade.

**D. Man kan flytte projicerede (virtuelle) ruter**
- I drag-handler: hvis `route.id` starter med `virtual:` → afvis drag med toast "Flyt basisruten i stedet — projicerede forekomster følger automatisk".
- Tilsvarende for dato-ændring og stops-reorder på virtuelle ruter.

**E. Kun 1 aftale vises på projiceret rute selvom flere aftaler har interval på samme rute**
- I `expandRecurringRoutes` slås flere aftaler korrekt sammen pr. (rute, dato) via `sourceKeys`. Bug ligger sandsynligvis i stops-rendering: når projiceret dato vises, filtreres stops på første kilde frem for alle kilder.
- Fix: brug ALLE `sourceKeys` for den virtuelle rute som filter, ikke kun én aftale. Verificér via `projectedStopMatchesSources` med hele kildesættet.
- Tilføj test i `recurring-projection.test.ts` der dækker "to aftaler, hver 3. uge, på samme rute, falder begge på samme dato".

---

## 3) Datasletning — Ready2Clean ApS (`0177cdef`)

Som migration (kræver delete-rettigheder):
```sql
-- Sletter i korrekt rækkefølge så fremmednøgler/RLS ikke blokerer
delete from public.route_stops    where route_id in (select id from public.routes where business_id = '8258070b-…');
delete from public.routes         where business_id = '8258070b-…';
delete from public.agreement_items       where agreement_id in (select id from public.agreements where business_id = '8258070b-…');
delete from public.agreement_occurrences where business_id = '8258070b-…';
delete from public.agreements            where business_id = '8258070b-…';
delete from public.calculator_steps where service_id in (select id from public.services where business_id = '8258070b-…');
delete from public.services       where business_id = '8258070b-…';
```
(Endelig tabel-liste verificeres mod skema før kørsel — fx også `route_templates`, `agreement_occurrence_*`-relaterede tabeller hvis de findes.)

Virksomheden, brugere, kunder, fakturaer og regnskabsintegration **bevares** — kun ruter/services/aftaler fjernes.

---

## Rækkefølge

1. Migration for opgave 3 (kører separat, kræver godkendelse).
2. Opgave 2 bugfixes (én commit pr. bug A–E).
3. Opgave 1 pagination — gennemgang af alle lister.

Sig til hvis jeg skal justere scope, eller om der er en bug under #2 jeg har misforstået.