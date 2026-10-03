# Hjemmeskærmsapp og tydelig rutekørsel

- Gør Serviceydere installerbar fra telefonens browser med de eksisterende appikoner. Ingen offline-cache.
- Vis samme registrerede eller beregnede ankomst i tjekliste og guide, også ved de enkelte stop. Skeln mellem ankommet og forventet ankomst; brug aldrig planlagt tid som erstatning.
- Gør medarbejderens print til en arbejdskvittering med start, registrerede tider, stop og indtjening. Beregnet køretid mærkes tydeligt og præsenteres ikke som målt kørsel.
- Tilpas det eksisterende vektorkort til en rolig natstil med tydelige veje og etiketter, ikke et filter på et lyst kort. Bevar kortfejl og reservekort.
- Forkort knaptekster og del lange beskeder i letlæselige afsnit. Brug “Oplysninger”, men behold “Fortryd udførsel”.
- Kontrollér mobilvisning, fælles tider, print og udført/fortryd med isolerede tests uden at ændre virkelige kundeopgaver.

## Begrænsninger
En hjemmeskærmsapp bruger stadig browserens lydmotor. Lyd kræver brugertryk og kan begrænses ved låst skærm eller lydindstillinger; native lyd uden browser kræver en rigtig mobilapp. En fysisk biltest og hørbar lydkontrol skal foretages på brugerens telefon.

## Teknik
Manifest og head-tags uden service worker. Genbrug fælles ankomst- og rutemålinger. Lokal, tokenstyret MapLibre-natstil med OpenFreeMap som datakilde.