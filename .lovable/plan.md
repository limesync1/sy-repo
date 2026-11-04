# Smartere ruteoptimering (uden AI)

## Hvor vi står i dag
Vi har allerede de tre dele fra eksemplet:
1. **Kort og afstande** – køretider fra en gratis offentlig kortserver. Den bruges kun til de første 25 stop; resten regnes i fugleflugt ganget med en fast omvejsfaktor.
2. **Ruteberegning** – vi starter med at placere hvert stop dér, hvor det koster mindst (billigste indsættelse), og forbedrer derefter med 2-opt, or-opt, flyt inden for ruten og byt mellem medarbejdere. Vi tager højde for tidsvinduer, arbejdstid og vejr.
3. **Adresse til koordinater** – Google eller vores egen adressetjeneste.

Algoritmen er god, men den stopper ved den første "lokale top". Køretiderne er også upræcise, når en rute har mere end 25 stop.

## Det vil gøre den smartere

### 1. Mere præcise afstande (størst gevinst)
- Hent køretider for alle stop: del store ruter i blokke af 25×25 i stedet for at falde tilbage til fugleflugt.
- Gem køretider mellem kendte adresser i en cache, så de samme kunder ikke slås op hver gang. Det gør det hurtigere og mere stabilt.
- Brug en reserve, hvis den offentlige kortserver er nede: først cache, så fugleflugt med en omvejsfaktor, der passer til området (by eller land).

### 2. Bedre søgning (big brain-delen)
- **ALNS (Adaptive Large Neighbourhood Search)**: Fjern gentagne gange 10–30 % af stoppene (tilfældigt, de dyreste eller en klynge, der ligger tæt), og sæt dem ind igen på den bedste plads. Metoder, der giver bedre ruter, bliver valgt oftere.
- **Simuleret annealing**: Tillad i begyndelsen en enkelt dårligere ændring, så søgningen ikke sidder fast.
- **Fast tidsbudget** (fx 3–5 sekunder) og flere startløsninger. Vi beholder altid den bedste.
- **Udvidet "regret-insertion"**: Stop med få gode pladser bliver placeret først.

### 3. Mere virkelighedsnære tider
- **Lær opgavetiden** ud fra den manuelle tidsregistrering. Vi bruger medianen pr. kunde og service, så det ikke kun hviler på et fast estimat.
- **Myldretid**: Vi lægger et tidspunktafhængigt tillæg til køretiden (fx 7–9 og 15–17).
- **Klynger**: Hold stop i samme postnummer eller område hos samme medarbejder og på samme dag, så der køres mindre på tværs.

### 4. Gennemsigtighed for brugeren
- Vis "før/efter": km, køretid og hvor mange minutter der er sparet. Vis desuden, hvorfor stop er flyttet (fx "tidsvindue", "kortere vej").
- Vi gemmer aldrig en ændring, der er dårligere end den nuværende rute.

## Det ændrer vi ikke
- Ingen AI i optimeringen. Det er ren matematik.
- "Find den bedste rute" kommer ikke tilbage (bevidst fravalg).
- Priser, låste stop, tidsvinduer og manuel tidsregistrering virker som i dag.

## Tekniske detaljer
- `geo.ts`: chunked OSRM-table (25×25-blokke parallelt med rate-limit) plus ny tabel `travel_time_cache` (afrundede koordinater → sek/m, TTL 30 dage, kun til serverbrug).
- `vrp.ts`: ny `alns.ts` med destroy-operatorer (random, worst, Shaw/related) og repair-operatorer (greedy, regret-2/3), SA-accept, adaptive vægte, deterministisk seed for test og tidsbudget. Den eksisterende 2-opt, or-opt og swap bruges som lokal polering.
- Opgavetid: view eller RPC med median fra tidsregistrering pr. kunde og service (min. 3 målinger, ellers estimat).
- Myldretidsfaktor anvendes i `scheduleRoute` pr. afgangstidspunkt.
- Tests: udvid `vrp_quality_test.ts` med benchmark-instanser og krav om, at ALNS ≤ nuværende pris og overholder tidsvinduer og arbejdstid.

## Rækkefølge
1. Præcise afstande og cache
2. ALNS og simuleret annealing med tidsbudget
3. Lærte opgavetider og myldretid
4. Visning af før og efter
