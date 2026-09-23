# Samlet forbedring af medarbejderpanel og mobil planlægning

## Resultat
Medarbejderpanelet får en ensartet, responsiv top og en enklere mobilvisning. Virksomheden kan planlægge og flytte ruter på mobil, sende planoversigter til den enkelte medarbejder og følge medarbejderens seneste position under en aktiv rute. Direkte beskeder bliver notifikationer i panelet, ikke e-mails.

## 1. Medarbejderpanelets layout
- Erstat den mørke, overfyldte top med samme lyse, kompakte arbejdsflade og indholdsbredde som resten af panelet.
- Vis det normale Serviceydere-logo uden hvidt filter; tilpas logo, sidetitel, arbejdspladsvælger og profilmenu til smalle skærme.
- Gør “Min dag”, rutekort, datovælger, arbejdspladsvælger og bundnavigation stabile fra 320 px til computerbredde.
- Bevar hurtig adgang til arbejdspladsskift og virksomhedspanel uden at elementer presser hinanden ud.

## 2. Alle popup-vinduer på mobil
- Gennemgå virksomhedspanelets og medarbejderpanelets dialoger, sheets, menuer, kalendere og popovers.
- Brug én mobilstandard: fuld tilgængelig skærmbredde, sikker afstand til skærmkanter, kompakt top/bund og indhold i naturlig rækkefølge.
- Korte vinduer vises samlet uden scroll. Lange formularer ombygges til fuldskærmsvisning med fast top og bund, så handlinger aldrig overlapper indhold.
- Ret faste bredder, for høje sheets, tastatur-overlap, lange tekster, dropdowns ved skærmkanter og lag oven på hinanden.

## 3. Mobil ruteplanlægning i virksomhedspanelet
- Saml dato, dagens ruter og aftaler uden rute i en kompakt mobiloversigt.
- Gør rutenavn, antal stop, medarbejdere og status synlige uden først at åbne ruten.
- Bevar opret, optimér, vis kort, flyt rute til dato, flyt stop og træk/tap-tildeling på mobil.
- Gør “Flyt rute” og de øvrige handlinger til tydelige mobilflows med optimistisk opdatering, konfliktbeskeder og fortrydelse, hvor det er sikkert.
- Test samme centrale funktioner på mobil som på computer, uden at kopiere computerlayoutet direkte.

## 4. Mobilvenlig planoversigt på e-mail
- Udbyg den eksisterende rutetildelingsmail til en mobilvenlig dags-/ruteoversigt med rutenavn, dato, stop i rækkefølge, adresser og tydeligt link til medarbejderpanelet.
- Send automatisk til den enkelte medarbejder ved tildeling eller relevante ændringer.
- Tilføj “Send oversigt” på den enkelte rute, så virksomheden kan gensende manuelt til én valgt medarbejder.
- Brug separat afsendelse og dubletbeskyttelse pr. medarbejder; ingen fælles modtagerliste.

## 5. Ulæste beskeder til én medarbejder
- Tilføj en notifikationsmodel med virksomhed, afsender, valgt medarbejder, rute eller aftale, besked, oprettet tidspunkt og læst tidspunkt.
- Fra en rute eller aftale kan virksomheden vælge præcis én medarbejder og sende en kort besked.
- Vis ulæst tæller i medarbejderpanelet og en tydelig markering på den relevante rute/aftale, indtil beskeden åbnes eller markeres læst.
- Vis historik på ruten/aftalen, så virksomheden kan se, om og hvornår beskeden er set.

## 6. Position og aktuel aftale under aktiv rute
- Gem kun medarbejderens seneste position pr. aktiv rute — ingen unødvendig bevægelseshistorik.
- Del kun fra “Start rute” til pause/afslutning, stop helt i baggrunden og brug filtrering samt lav opdateringsfrekvens for at skåne batteri og varme.
- Beskyt data, så medarbejderen kun kan skrive sin egen position, og virksomheden kun kan se egne medarbejdere.
- Vis medarbejdermarkør, nøjagtighed, seneste opdatering og den aktuelle/næste aftale på rutekortet. Forældede positioner markeres tydeligt og skjules efter kort tid.
- Tilføj en klar oplysning i medarbejdervisningen om, at position deles under den aktive rute.

## Teknisk
- Nye datatabeller får eksplicitte adgangsrettigheder og rækkeadgang: notifikationer samt én seneste live-position pr. medarbejder/rute.
- Genbrug eksisterende rutetildelinger og stop-tildelinger som autoritativ adgang til modtagere og positioner.
- Position sendes højst cirka hvert 20.–30. sekund eller ved væsentlig bevægelse; kortet modtager ændringer uden hurtig polling.
- E-mailen bruger den eksisterende administrerede afsendelse og en registreret mobilvenlig skabelon.
- Tilføj målrettede tests for mobilbredder, popup-overlap, ruteflytning, ulæst/læst-status, adgangsregler, gammel position og e-mailens datagrundlag.

## Verifikation
- Test indloggede flows på 320 px, 375 px, tablet og computer i lys og mørk visning.
- Kontroller alle popup-vinduer med korte og lange tekster samt åbent mobiltastatur.
- Kør ruteoprettelse, flytning, optimering, manuel planmail, automatisk planmail, notifikation og læst-status fra start til slut.
- Start en rigtig medarbejderrute, bekræft position og aktuel aftale i virksomhedspanelet, og bekræft at delingen stopper ved pause, afslutning og skjult side.
- Projektet efterlades byggeklar og publiceres ikke.
