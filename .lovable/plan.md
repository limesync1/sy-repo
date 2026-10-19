# Gennemgang og forbedring af ruteplanlæggeren (computer og mobil)

Ruteplanlæggeren består af én meget stor side plus ca. 70 vinduer og kort. Planen er først en grundig gennemgang i browseren med en rigtig virksomhedskonto, derefter rettelser i prioriteret rækkefølge.

## Trin 1 – Gennemgang (målt, ikke gættet)
- Log ind som virksomhedsejer i forhåndsvisningen (kræver din godkendelse af testlogin).
- Gå hver hovedopgave igennem på 375 px (mobil), 768 px (tablet) og 1280/1536 px (computer), i lyst og mørkt tema:
  1. Find en dag og se dens ruter
  2. Opret bestilling og læg den på en rute
  3. Flyt et stop / en rute til en anden dag
  4. Åbn en rute, redigér stop, kunde og medarbejdere
  5. Slet rute, optimér dagen, print rute
- Notér for hver: antal tryk, uklare tekster, små trykflader (<44 px), afskåret indhold, langsomme skift, dobbelte knapper.

## Trin 2 – Forventede forbedringer (justeres efter trin 1)
**Overblik**
- Tydeligere forskel på faste, forventede og udførte ruter med en lille forklaring ("Fast", "Forventet") i stedet for kun farver/gennemsigtighed.
- Dagens oversigt med samlet tid, køretid og antal stop pr. medarbejder øverst på dagen.
- Ens rækkefølge og ens kort i kalender, dagsvisning og rutevindue.

**Værktøjslinjen**
- Saml sjældne knapper (historik, diagnose, print, flet) i én "Mere"-menu; behold kun "Opret bestilling", "Opret rute", dato og visning synligt.
- På mobil: datoskift med store pile + "I dag", visning som tydelig vælger.

**Mobil**
- Dagsvisning som standard på mobil, med store rutekort og tryk-for-at-tildele.
- Rutevinduet: fast knaplinje i bunden (Gem, Tilføj stop), stop-handlinger i en menu pr. stop i stedet for mange små ikoner.
- Ingen vandret scroll og ingen afskåret tekst ned til 320 px.

**Opgaver og fejl**
- Tomme tilstande med én klar handling ("Ingen ruter denne dag – Opret rute").
- Bekræftelser og fejlbeskeder på almindeligt dansk med hvad man skal gøre.
- "Fortryd" efter flyt/slet, hvor det mangler.

**Hastighed**
- Måle tid fra åbning til kalender vises; indlæse tunge dele (kort, sjældne vinduer) først når de bruges.

## Trin 3 – Kontrol
- Gentag gennemgangen fra trin 1 med skærmbilleder før/efter og kør eksisterende tests for ruteplanlæggeren.

## Tekniske detaljer
- `src/pages/RoutePlanner.tsx` (~4.900 linjer) opdeles i mindre dele (værktøjslinje, dagsoversigt, vinduesstyring) uden at ændre logik, så rettelser bliver sikre.
- Eksisterende regler bevares: serverberegnede priser "uden moms", faste ruter først (`compareDayRoutes`), udførte stop skjult, ingen bundnavigation, mobilfelter uden auto-zoom, "Opret bestilling" som label.
- Playwright-scripts i `/tmp/browser/route-planner-audit/`; testlogin via `lovable auth-session` for DK Renfyns ejer eller en anden konto du vælger. DK Renfyn har i dag ingen ruter, så testdata oprettes og slettes bagefter.
