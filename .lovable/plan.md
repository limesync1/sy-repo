# Samlet rettelse: ruteplanlægger, medarbejderkørsel, aftaler og guide

## 1. Enkle ord overalt
- "Færdig" → **Udført** i filtre, badges og tekster.
- "Projiceret" → **Forventet**, "original/basis" → **Fast**, i alle tekster, tooltips og forklaringer.

## 2. Ruteplanlægger
- **Markér som udført** direkte på stopkort ved siden af "Fortryd udført".
- "Fortryd udført" bruger panelets egen bekræftelsesmodal i stedet for browserens advarsel.
- Farvepalet i Opret/Rediger rute: 4 nye farver (18 i alt, to ens rækker á 9).
- Rutekort viser kun den nye hover-oversigt; den gamle browser-tooltip fjernes.
- "Se medarbejderens aftaler" og "Flet ruter" får samme layout som "Flyt rute".
- Fletning gøres robust: kontrol før start, én samlet handling, ingen falsk "ingen rettigheder"-fejl, klare danske fejlbeskeder, ruten opdateres straks, tom kilderute ryddes.

## 3. Livepositioner
- Medarbejderens position sendes oftere under kørsel, og visningen opdateres hurtigere.
- Ny visning: kort plus liste over medarbejdere med status, aktuelt stop og "set for X sek. siden". Listen ligger ved siden af kortet på computer og under kortet på mobil.

## 4. Medarbejderpanel – rutekørsel
- Kortet virker altid: adresser uden koordinater slås op automatisk og gemmes. Beskeden "Ingen koordinater" fjernes.
- "Åbn i Google Maps", "Kør dertil" og "Kortvisning" åbner vores egen kortvisning.
- "Tilbage" i kortvisningen fører til tjeklisten, ikke ud af ruten.
- Rækkefølgen kan ændres under kørsel med træk eller op/ned-pile og gemmes med det samme.
- Hurtigere: valgskærmen vises med det samme, og Start rute, Start aftale og Aftale udført opdateres straks på skærmen, mens de gemmes i baggrunden.
- Statistik: én samlet loading-visning, derefter den rigtige side.

## 5. Aftaler-siden
- Samme layout som panelets øvrige sider.
- "Markér som i gang" virker og skifter til "Markér som udført", med samme knapper som i medarbejderpanelet.

## 6. Kom godt i gang
- Det aktive trin vises med en blød teal-markering i stedet for helt sort.
- Roligere opsætning med tydeligere tekster for hvert trin.

## Tekniske detaljer
- Bekræftelsesdialog: genbrug den fælles AlertDialog og planner-overlay-stilen.
- Fletning: én database-funktion med samlet rettighedskontrol, så delvise fejl og forkerte rettighedsbeskeder undgås. Den rydder kilderuten via den eksisterende oprydningsfunktion.
- Geokodning: brug den eksisterende adresse-/geokodningstjeneste og gem koordinater på stoppet.
- Livepositioner sendes cirka hvert 5. sekund under kørsel og hentes cirka hvert 5. sekund.
- Statusændringer opdateres med det samme i appen og rulles tilbage, hvis gemningen fejler.

## Kontrol
- Test med rigtige data på 1280 px og 390 px: fletning, udført/fortryd, live-kort, rutekørsel, ændring af rækkefølge, aftaler og guide.
