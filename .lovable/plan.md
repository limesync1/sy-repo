# Ensret medarbejderpanelet og genstart arbejdsdagen

## Resultat
- Alle almindelige sider i medarbejderpanelet får samme indholdsbredde, sidehoved, kort, afstande og kompakte marine/teal-design som virksomhedspanelet.
- Arbejdspladsvælger, Min dag, Statistik og Livechat følger den samme responsive struktur på mobil, mindre computer og bred skærm.
- Aktiv rutekørsel beholder sin fokuserede kort-/tjeklistevisning, men dens omkringliggende kontroller følger fortsat panelsystemet.
- På “Min dag” kan medarbejderen genstarte en afsluttet dag og fortsætte arbejdet uden at slette udførte aftaler eller tidligere registreret tid.

## Gennemførelse
1. Saml medarbejdersidernes ydre bredde og afstande om de samme fælles sidebyggesten, som virksomhedspanelet bruger.
2. Ensret sidehoveder, handlingsrækker, statistikfelter, indlæsningsvisninger, tomme tilstande og kort uden at ændre eksisterende data eller arbejdsgange.
3. Tilpas arbejdspladsvælgeren til samme arbejdsflade og bredde som resten af panelet, samtidig med at valget fortsat står tydeligt før panelet åbnes.
4. Tilføj en tydelig “Genstart dagen”-handling, når arbejdsdagen er afsluttet.
5. Genstart åbner arbejdsdagen igen og starter en ny aktiv arbejdsperiode; udførte aftaler, tidligere tidsregistrering og historik bevares uændret.
6. Opdatér dagens data med det samme efter handlingen og vis klar bekræftelse eller fejlbesked.

## Kontrol
- Kontrollér arbejdspladsskift, Min dag, Statistik og Livechat på mobil, mindre computer og bred skærm.
- Kontrollér at sidebredde, navigation, kort og sidehoveder matcher virksomhedspanelet.
- Afslut og genstart en arbejdsdag; bekræft at dagen bliver aktiv igen, mens udførte aftaler og registreret tid stadig vises.
- Kontrollér indlæsning, tomme tilstande, lange navne og mørk visning uden overlap eller vandret rulning.

## Teknisk
- Eksisterende `PanelShell`, fælles panelsider og semantiske designværdier genbruges.
- Genstart ændrer kun arbejdsdagens afsluttede tilstand; stopstatus og eksisterende tidsregistrering nulstilles ikke.
- Ingen ændringer af roller, adgangsregler, rutedata eller forretningslogik ud over genstartshandlingen.
