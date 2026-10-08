# Mobilvenlig rutekørsel og ruteplanlægger

## Mål
Gøre kørselsguiden, rutelisten og virksomhedens ruteplanlægger tydelige og stabile i både mobilbrowser og installeret hjemmeskærmsapp.

## Det bygger jeg
1. **HUD og kortkørsel**
   - Samle topbjælke, drejevejledning, advarsler og stophandlinger i faste, ikke-overlappende zoner.
   - Respektere telefonens top-/bundkanter og browserens skiftende adresselinje, så indhold ikke glider ned eller forsvinder.
   - Bevare mest muligt synligt kort og gøre næste handling, afstand, ankomst og fejl lette at aflæse.
   - Gøre GPS-, forbindelses-, trafik- og vejvisningsfejl handlingsorienterede uden at skjule navigationen.

2. **Rutekørslens listevisning**
   - Tilføje en tydelig “Oplysninger”-handling på det aktuelle stop og hvert stop i listen.
   - Genbruge samme aftalevindue som kortvisningen, så medarbejderen kan rette den aktuelle aftale, oprette en ny aftale hos kunden og sende note.
   - Genbruge de samme interval-/datokontroller, bekræftelser, offline-fejl og mulighed for at prøve igen.
   - Bevare manuel tidsregistrering og eksisterende regler for udførelse/fortrydelse.

3. **Virksomhedens ruteplanlægger på mobil/tablet**
   - Forenkle topknapper og visningsvalg, så Måned/Uge, Ny bestilling, Ny rute og visningsindstillinger er tydelige uden overlap.
   - Gøre Aftaler uden rute trykbaseret på mobil: tydelige valg, samlet handling for flere aftaler og enkel tildeling til ny eller eksisterende rute.
   - Gøre kalenderdage, rutekort, dagsoversigt og redigeringsvinduer skærmbrede, scrollbare og anvendelige uden træk-og-slip.
   - Fjerne eller skjule handlinger, som ikke giver mening på touch, og bevare dem på større skærme hvor de virker.

4. **Kontrol**
   - Afprøve de centrale flows indlogget i mobile og tabletstørrelser i almindelig browser.
   - Kontrollere korte skærme svarende til installeret app, fejltilstande, åbne vinduer, vandret overflow og konsolfejl.
   - Køre målrettede regressionstests og kontrollere den aktuelle buildstatus.

## Teknisk
- Eksisterende fælles stopdetaljer og medarbejderhandlinger genbruges; pris beregnes fortsat sikkert på serveren.
- Farver og flader bruger projektets semantiske designtokens.
- Hjemmeskærmsappen ændrer ikke browserflowet; forskelle håndteres med sikre viewport- og safe-area-regler.
- Ingen ændringer af forretningsregler, automatisk tidsstart eller “find bedste rute”.
