# Ensartede loading-visninger og nye ikoner

## Resultat
- Ruteplanlæggerens loading-visning matcher den faktiske sidemenu, uanset om menuen er åben, sammenfoldet eller skjult på mobil.
- Sidemenuen skifter ikke bredde eller elementstørrelser, når ruteplanlægningen åbnes.
- Det nye kundeserviceikon erstatter det nuværende i alle kundeservice- og livechatvisninger.
- De 24 nye illustrationer bruges konsekvent til de handlinger og områder, de beskriver, på tværs af virksomhed-, medarbejder- og administratorpaneler.

## Gennemførelse
1. Saml sidemenuens gemte tilstand og bredder i en fælles kilde, som både den rigtige navigation og loading-visningen læser.
2. Tilpas ruteplanlæggerens ene loading-visning til samme åbne/sammenfoldede/mobil-layout som den færdige side.
3. Læg de vedhæftede SVG-filer i projektets mediebibliotek og opret én fælles ikonoversigt med danske nøgler.
4. Erstat kundeserviceikonet og relevante eksisterende menu-, handlings-, kort-, tabel- og vinduesikoner med de nye illustrationer.
5. Behold velkendte kontrolsymboler som luk, søg, tilbage, menu og sortering, hvor de nye illustrationer ikke har en tilsvarende funktion.
6. Kontrollér loading ved sideskift samt centrale sider og vinduer på mobil, lille computer og stor skærm.

## Teknisk
- SVG-filerne bruges som CDN-medier via projektets eksisterende asset-format.
- Ikonvalg samles i en delt React-komponent, så størrelse, beskæring, alternativ tekst og visuel stil er ens overalt.
- Eksisterende `service-panel-*`-struktur og semantiske farver bevares.
