# Plan: Samlet oprydning af panel, forside, kundeservice og færdige ruter

## Resultat
Medarbejderpanelets navigation matcher virksomhedspanelet, kvitteringsvisningen er enklere, forsiden er ryddet for de valgte sektioner, kundeservice bruger det vedhæftede portræt, og færdige ruter genåbnes sikkert ved nye stop.

## Implementering
1. **Medarbejderpanel og kvittering**
   - Fjern “Åbn fuld visning” fra kvitteringsforhåndsvisningen.
   - Genbrug virksomhedspanelets stabile logo-, sidebar- og collapse-opbygning i medarbejderpanelet.
   - Bevar den fremhævede RGB-ring omkring begge panelskift.

2. **Forside**
   - Fjern de to flydende hero-beviser samt statistiksektionen direkte under heroen.
   - Fjern “Tre virksomheder vi selv ville ringe til” og “Se hvem der kører ud til dig”.
   - Fjern den lyse afstand/opdeler mellem den afsluttende tilbudssektion og footeren.

3. **Kundeservice**
   - Gem det vedhæftede portræt som projektets kundeservicebillede.
   - Brug det konsekvent i virksomhedspanelets kundeserviceknap og den offentlige chat, tilpasset eksisterende marine/teal-design.

4. **Færdige ruter**
   - Tillad tilføjelse og flytning af stop til en færdig rute.
   - Genåbn ruten automatisk, bevar allerede udførte stop som udførte, og gør kun nye/resterende stop tilgængelige for medarbejderen.
   - Anvend samme regel ved træk, manuel tildeling, bulk og mobil.

## Verifikation
- Kontrollér forside, virksomhedspanel og medarbejderpanel på mobil og computer.
- Kontrollér kundeservice, kvitteringspreview og collapse-tooltip.
- Test at et nyt stop på en færdig rute genåbner ruten uden at nulstille udførte stop.
- Kør relevante tests og byggekontrol. Intet publiceres.
