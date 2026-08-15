# 1) Sitemap-opsætning i Search Console + 2) Sygemelding i ruteplanlæggeren

## Del 1 — Sitemap-setup i Google Search Console

Målet er ét entydigt indgangspunkt: `https://serviceydere.dk/sitemap-index.xml`, som peger på de fire child-sitemaps (pages, blog, cities, guides).

Trin:
1. Find den verificerede property, der dækker serviceydere.dk. Hvis både en domæne-property og en URL-prefix-property matcher, spørger jeg dig hvilken der skal bruges — jeg vælger ikke selv.
2. Læs den nuværende sitemap-liste på property'en og noter præcis hvilke sitemaps der er indsendt, og hvilke der rapporterer fejl/advarsler.
3. Ryd op: fjern gamle/dublerede indsendelser (fx en løs `sitemap.xml`, hvis den ikke længere er kilden), så kun index-filen er den indsendte rod.
4. Genindsend `sitemap-index.xml` én gang, efter oprydningen — ikke én gang per fil.
5. Læs status igen bagefter og rapportér, hvad Google faktisk siger (antal opdagede URL'er, sidste læsning, fejl/advarsler).

Ærlig forventningsafstemning: "URL is unknown to Google" betyder, at Google endnu ikke har crawlet siden. Et korrekt sitemap gør den opdagbar, men fjerner ikke beskeden med det samme — den forsvinder først, når Google har crawlet og indekseret siden, og det kan tage dage til uger. Sider skal desuden være publiceret på det live domæne, før de kan crawles. Hvis Search Console rapporterer en fejl uden årsag (kun et tal), siger jeg det som det er i stedet for at gætte.

## Del 2 — Quickfix: medarbejder melder sig syg

### Sådan hænger data sammen i dag
- `routes.employee_id` = rutens primære medarbejder
- `route_employees` = ruteholdet (flere medarbejdere per rute)
- `route_stops.assigned_employee_id` + `route_stop_assignees` = hvem der reelt står på hvert stop, med `required_staff` per stop
- Der findes ingen fraværs-/sygdomsmodel i dag, og ingen samlet handling for "denne person er væk i dag"

### Løsning: én "Meld syg"-dialog med konsekvensberegning
Ét indgangspunkt (medarbejder-avatar i planlæggeren, medarbejderkolonnen og rutens kontekstmenu) åbner en dialog:

1. **Vælg omfang** — kun i dag, en datoperiode, eller kun én valgt rute.
2. **Konsekvens-overblik** — dialogen viser præcis hvad der rammes: antal ruter, antal stops, hvilke stops der bliver underbemandede (færre tildelte end `required_staff`), og hvilke kunder der har tidsvindue samme dag.
3. **Vælg løsning** per rute/stop-gruppe:
   - **Erstat med en anden medarbejder** — kandidater rangeret efter: ingen tidskonflikt, matcher `employee_skills`, færrest stops i forvejen, kapacitetsgrænser (`max_stops_per_day`, `max_hours_per_day`), og nærhed til rutens område. Genbruger scoringen fra auto-fordeling, udvidet med skills og kapacitet.
   - **Fordel stoppene på det eksisterende hold** — hvis ruten har flere medarbejdere, spredes stoppene på resten, med advarsel ved overbooking.
   - **Flyt stoppene til "Ikke tildelt"** — til manuel planlægning.
   - **Udskyd til næste ledige dag** — bruger den eksisterende "næste ledige slot"-logik og foreslår en dato per stop.
4. **Forhåndsvisning før commit** — en diff (før/efter per rute) i samme stil som simuleringspanelet; intet ændres før Bekræft.
5. **Én samlet handling** — alle ændringer skrives i én operation, logges i rutehistorikken som "Sygemelding: [navn]", og kan fortrydes med den eksisterende Fortryd-bjælke.

### Fraværsregistrering
En lille `employee_absences`-tabel (medarbejder, virksomhed, fra-dato, til-dato, type: syg/ferie/andet, note) med RLS og GRANTs. Den bruges til:
- at markere medarbejderen som utilgængelig i planlæggeren (nedtonet avatar + badge)
- at forhindre nye tildelinger i fraværsperioden
- at kandidatforslag automatisk springer fraværende medarbejdere over
- at man kan afmelde fraværet igen ("rask igen") og få tilbudt at føre de flyttede stops tilbage

### Teknisk
- Ny tabel `employee_absences` + RPC til at hente overlappende fravær for en datoperiode
- Ny hook-fil `src/hooks/route-planner/useSickLeave.ts` med kandidat-scoring og batch-commit
- Ny dialog `src/components/route-planner/SickLeaveDialog.tsx`, lazy-mounted som de øvrige tunge dialoger
- Genbrug: `useSetStopAssignees`, `useAssignSingleEmployee`, `useAddRouteEmployee`, `useUpdateRoute`, `logRouteAudit`, `invalidateRouteSyncQueries`
- Alt tekst på dansk, samme design som resten af panelet

### Rækkefølge
1. Tabel + RLS/GRANTs
2. Kandidat-scoring og commit-logik med unit-tests
3. Dialog med konsekvens-overblik og preview
4. Indgangspunkter + fraværs-badges i planlæggeren