# Plan: Samlet redesign af medarbejderpanelet

## Resultat
Medarbejderpanelet får samme professionelle struktur og visuelle identitet som virksomhedspanelet: lys grå navigation, marine hierarki, målrettet teal-accent, kompakte flader og én ensartet oplevelse på mobil, tablet og computer.

## Implementering
1. **Fælles panelramme**
   - Erstat medarbejderpanelets særskilte topfaner med en venstremenu på computer, opbygget efter virksomhedspanelets navigation.
   - Bevar en kompakt top og bundnavigation på mobil, så vigtig navigation og handlinger altid er tilgængelige uden overlap.
   - Brug det valgte “Integrated Professional Shell” som strukturel reference, men behold Inter/systemskrifttypen og projektets marine/teal-farver.

2. **Arbejdspladsvælger**
   - Gør “Vælg arbejdsplads” til en integreret, rolig arbejdsflade frem for et løsrevet todelt layout.
   - Vis virksomhed, sted, rolle og aktivt valg tydeligt med stabile trykflader på alle bredder.

3. **Medarbejdersider**
   - Ensret “Min dag”, “Statistik” og “Livechat” med samme sidehoved, indholdsbredde, kort, værktøjslinjer, tomme tilstande og feedback.
   - Bevar rutekørslens fokuserede kort-/listeoplevelse, men lad dens omgivende navigation og kontroller følge det fælles panelsystem.

4. **Responsivitet og tilstande**
   - Kontrollér 393, 768 og 1280 px samt lys/mørk visning.
   - Ret afskæring, vandret scroll, overlappende topfelter, ustabile kort og for små trykflader.
   - Ensret normal, hover, aktiv, valgt, fokus, deaktiveret og indlæsning.

## Afgrænsning
- Eksisterende funktioner, data, roller og arbejdsgange bevares.
- Designet bruger eksisterende semantiske farver og fælles knapper; ingen ny funktionalitet eller datamodel tilføjes.

## Verifikation
- Test arbejdspladsvalg og navigation mellem Min dag, Statistik og Livechat.
- Kontrollér indloggede sider ved 393, 768 og 1280 px i lys og mørk visning.
- Kør byggekontrol og ret eventuelle fejl før afslutning.
