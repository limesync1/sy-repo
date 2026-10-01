# Ensret medarbejderpanelets sider

## Mål
Alle almindelige medarbejdersider skal følge virksomhedspanelets samme indholdsbredde, sideopbygning, afstande, flader og indlæsningstilstande på mobil, mindre laptops og store skærme.

## Ændringer
- Indfør én fælles medarbejder-sidecontainer med virksomhedspanelets `max-w-6xl`, ens lodret rytme og responsive mellemrum.
- Brug containeren konsekvent på **Min dag**, **Statistik** og **Livechat**, inklusive deres loading-tilstande, så indholdet ikke skifter bredde under indlæsning.
- Ensret sidehoveder, kort, kanter, hjørner, skygger, filtre og tomme tilstande med de eksisterende fælles panelkomponenter.
- Tilpas Livechat-fladen til den samme kompakte panelstil og bredde uden at ændre chatfunktionerne.
- Bevar den aktive rute som en fokuseret fuldskærmsoplevelse, men ensret dens topbjælker, paneler og dialoger visuelt med virksomhedspanelet.
- Bevar printvisningen som A4-værktøj; ensret kun dens skærmviste værktøjslinje og bredde, så selve udskriften ikke ændres.

## Teknisk
- Genbrug `PanelShell`, `PageHeader`, `service-panel-card` og eksisterende semantiske farver frem for at oprette et separat designsystem.
- Saml sidebredde og spacing i en lille delt medarbejder-layoutkomponent for at forhindre nye forskelle mellem siderne.
- Ingen ændringer i rutedata, tidsregistrering, adgang, livechatlogik eller andre forretningsregler.

## Kontrol
- Kontroller Min dag, Statistik, Livechat og en rutevisning på mobil, lille laptop og desktop.
- Kontroller at loading-tilstande har samme bredde som det færdige indhold, og at ingen tekst eller handlinger overlapper.
- Bekræft at projektets automatiske kontrol er fejlfri.
