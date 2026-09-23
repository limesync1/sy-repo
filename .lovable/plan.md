# Samlet forbedring af medarbejderpanelets arbejdsflow

## Resultat
Medarbejderpanelets panelskift, notifikationer, kvittering og rutekørsel får ét kompakt og professionelt designsprog, som matcher virksomhedspanelet på mobil, tablet og computer.

## Ændringer

### Navigation
- Gør **Virksomhedspanel**-knappen identisk med virksomhedspanelets **Medarbejderpanel**-knap, inklusive ikonramme, placering og tilstande.
- Genbrug samme fælles knap, så de to paneler ikke udvikler sig forskelligt igen.

### Smartere notifikationer
- Giv notifikationsoversigten tydelig rute- eller aftalekontekst, dato, ulæst markering og direkte handling.
- Tilføj **Markér alle som læst** og vis hele den hentede historik i en afgrænset, scrollbar oversigt.
- Åbn den relevante rute og fremhæv den relevante aftale, når notifikationen vedrører et stop.
- Brug en mobilvenlig bundvisning i stedet for en trang popup; behold en kompakt menu på computer.
- Vis aktuelle ulæste beskeder tydeligt, men uden at blokere rutekørslen.

### Kvitteringsvisning og print
- Saml alle valg for tæthed, kontaktoplysninger, opgaver og noter i en enkel kontrolbjælke med tydelig forhåndsvisning.
- Sørg for, at de samme valg faktisk anvendes i både forhåndsvisningen og den udskrevne version.
- Gør printvisningen visuelt ens med forhåndsvisningen og ret den eksisterende visningsadvarsel.
- Lad tilbage-knappen fra print altid gå til **Min dag**, ikke tilbage til rutekørslen.

### Rutekørsel
- Ombyg kortvisningen til en mere fokuseret kørselsflade med tydelig næste handling, næste stop, fremdrift og få, store kontroller.
- Gør afsluttet-rute-visningen markant mere kompakt, så kortet ikke dækkes unødigt på store skærme.
- Forbedr listevisningen med tydelig status, næste stop og enkle stophandlinger uden støj.
- Tilpas opbygningen særskilt til mobil, tablet og computer uden vandret overlap eller skjulte handlinger.
- Bevar nøglefrit kort, batteribesparende pause i baggrunden og eksisterende robuste GPS-/ruteoptimeringslogik.

## Teknisk og kvalitet
- Genbrug panelernes semantiske farver, Inter/systemskrift, knapper, sheets og fokus-/hover-/active-tilstande.
- Bevar kravet om ingen planlagte opgavetider eller servicevarigheder; kun aktiv navigation må vise relevant køretid/ankomst.
- Kontrollér lys og mørk tilstand ved 393, 768 og 1280 px.
- Verificér navigation, notifikationsåbning, kvitteringsvalg/print/tilbageflow og både kort- og listekørsel.
