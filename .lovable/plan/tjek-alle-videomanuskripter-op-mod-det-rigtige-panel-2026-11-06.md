# Tjek alle videomanuskripter op mod det rigtige panel

## Mål
Alt det, du skal sige og vise i de 19 videoer (Fuldt system F0–F10, Kun profil P0–P7), skal passe præcist til det, man faktisk ser i virksomhedspanelet: menupunkter, knapper, vinduer, felter og rækkefølge.

## Fremgangsmåde
1. **Kortlæg panelet, som det er nu**
   - Log ind som testvirksomheden «Klar Vinduer» (fuldt system) og en testkonto med «Kun profil».
   - Gå hvert trin i «Kom godt i gang» igennem og tag skærmbilleder af alle sider, vinduer og knapper, både på computer og mobil.
   - Skriv en liste med de præcise navne på knapper, menupunkter, felter og vinduesoverskrifter.
2. **Sammenlign hvert manuskript linje for linje**
   - Tjek at hver knap og hvert menupunkt, der bliver nævnt, findes med præcis det navn.
   - Tjek at rækkefølgen passer til panelet (brancher → firma og logo → services → medarbejdere → kunder → første bestilling → rute, og for Kun profil: brancher og område → profil og logo → services → billeder og anmeldelser → se din profil).
   - Tjek at det, du siger, sker på skærmen (fx at «Optimér rute» nu altid står synligt, at tidsregistrering er manuel med Start tid/Stop tid, at kundebeskeder kun viser dato).
   - Find tekst, der lyder kejtet eller lover noget, panelet ikke kan.
3. **Ret manuskripterne**
   - Omskriv til jordnært, talt dansk, der passer til det, du klikker på.
   - Overhold de faste regler: aldrig «leads», priser «uden moms», kun Dinero og e-conomic, ingen Ruteklar, ingen klokkeslæt i kundebeskeder, ingen opdigtede funktioner.
   - Hvert manuskript får en klar klikvej: «Tryk på X → vindue Y åbner → udfyld Z».
4. **Lever**
   - 19 nye PDF'er i en ny mappe (v3) plus én samlet PDF med alle manuskripter.
   - En kort ændringsliste: hvad der var forkert, og hvad det nu siger.

## Hvis panelet selv er uklart
Finder jeg steder, hvor panelet selv er forvirrende (fx knapnavne, der ikke passer sammen mellem sider), skriver jeg dem på en liste til dig i stedet for at ændre panelet nu. Så kan du vælge, om de skal rettes bagefter.

## Tekniske detaljer
- Kilder til sammenligning: `src/components/admin/onboarding/steps.ts`, panelets faner og vinduer under `src/components/admin` og `src/components/route-planner`, samt skærmbilleder via Playwright med testkontoen.
- Manuskripterne genereres med det eksisterende PDF-script i en ny `videomanuskripter_v3`-mappe; ingen ændringer i appens kode.
