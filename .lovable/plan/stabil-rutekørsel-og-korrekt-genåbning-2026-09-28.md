# Stabil rutekørsel og korrekt genåbning

## Resultat
- Fjerne fejlen om den manglende `routes.completed_at`-kolonne i alle genåbnings- og fortryd-flow.
- Vise “Hvordan vil du køre ruten?” før kortbaseret rutekørsel åbnes, så tjekliste aldrig kortvarigt viser kortet.
- Samle kortguiden i et enkelt, stabilt layout, der prioriterer kørslen på mobil og udnytter bredden fornuftigt på computer.

## Ændringer
- Gennemgå aktive databasefunktioner og triggere, og erstatte resterende skrivninger til den ikke-eksisterende rutekolonne med den aktuelle statusmodel.
- Gøre valg af tjekliste eller kortguide til en separat indgangstilstand før selve kørselsvisningen monteres.
- Forenkle kortets topbjælke, beskeder, næste-stop-felt og handlinger, så de ikke overlapper ved mobil, tablet eller bred computer.
- Bevare nøglefrit kort, live-navigation, faktisk tidsregistrering og batteribesparende pause i baggrunden.

## Kontrol
- Teste genåbning/“Fortryd udført” mod den aktive database.
- Kontrollere tjekliste- og kortvalg uden kort-flash.
- Kontrollere rutekørslen ved mobil, tablet og computer samt projektets automatiske build.
