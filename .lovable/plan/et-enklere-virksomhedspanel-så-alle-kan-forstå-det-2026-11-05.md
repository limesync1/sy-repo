# Et enklere virksomhedspanel – så alle kan forstå det

Målet: En person, der aldrig har brugt et rutesystem (eller er 75 år), skal kunne åbne panelet og vide præcis, hvad de skal gøre – uden at drukne i felter.

## Grundprincipper (gælder alle sider)

1. **Én hovedopgave pr. skærm** – én stor, tydelig knap ("Opret aftale", "Tilføj kunde"). Alt andet er sekundært.
2. **Vis kun det nødvendige først** – avancerede felter gemmes bag "Flere valg" (lukket som standard).
3. **Almindeligt dansk** – ingen fagord. "Leads" → "Forespørgsler", "Interval" → "Hvor tit?", "Recurrence" aldrig synligt.
4. **Større og tydeligere** – grundtekst min. 16 px, knapper min. 48 px høje, stærk kontrast, ikon + tekst altid sammen (aldrig kun ikon).
5. **Hjælp lige ved siden af** – lille "?" ved svære felter med én sætnings forklaring; eksempler i felterne ("fx Jensens Vinduespudsning").
6. **Tilgivende** – "Fortryd" efter handlinger, bekræftelse før sletning, autosave med tydelig "Gemt ✓".

## 1. Menuen (venstre side)

- Skær ned til **5 hovedpunkter**: Overblik · Aftaler · Kunder · Ruter · Indstillinger.
- Services, Medarbejdere, Anmeldelser, Livechat, Regnskab, Forespørgsler samles under **"Min virksomhed"** (én side med store kort).
- Tal-badges kun hvor der er noget at gøre (fx "3 nye forespørgsler").

## 2. Overblik = "Hvad skal jeg i dag?"

- Øverst én stor boks: **"I dag: 12 aftaler på 2 ruter"** + knap "Se dagens ruter".
- Derunder max 3 kort: "Skal godkendes", "Mangler betaling", "Nye forespørgsler".
- Statistik og grafer flyttes længere ned / bag "Se tal".
- Tom tilstand: venlig tekst + én knap ("Opret din første kunde").

## 3. Oprettelsesvinduer (aftale, kunde, service, rute) som trin-for-trin

- Del lange formularer op i **2–4 korte trin** med "Trin 1 af 3" og store Næste/Tilbage-knapper.
- Fx Opret aftale: 1) Hvilken kunde? 2) Hvilken service og hvor tit? 3) Hvornår? → Opsummering → Opret.
- Pris vises automatisk (stadig beregnet på serveren, vist "uden moms").
- Valgfrie felter (noter, faktura-interval, særlige ønsker) under "Flere valg".

## 4. Lister (kunder, aftaler)

- Kort/rækker med kun navn, adresse og næste besøg. Resten ved tryk.
- Én søgelinje øverst; filtre gemt bag "Filtrér" knap.
- Handlinger samles i én "Mere"-menu i stedet for mange små knapper.

## 5. Indstillinger

- Øverst: "Det vigtigste" (firmanavn, logo, kontakt, brancher) – resten grupperet i sammenklappede sektioner.
- Søgningen beholdes; "Gør profilen færdig"-kortet bliver vejviseren.

## 6. "Enkel visning" kontakt (valgfri)

- Indstilling: **Enkel / Fuld visning**. Enkel skjuler avancerede funktioner (håndværk, regnskabsdetaljer, tæthed i ruteplanlægger). Standard for nye virksomheder: Enkel.
- **Større tekst**-kontakt (100 % / 115 % / 130 %).

## 7. Indbygget vejledning

- Første gang man åbner en side: kort guidet rundtur (3 bobler, kan springes over).
- "Brug for hjælp?"-knap altid synlig → live kundeservice 24/7.

## Rækkefølge

1. Ordliste + tekstrettelser + større tekst/knapper (hurtig gevinst overalt)
2. Ny menu + nyt Overblik
3. Trin-for-trin Opret aftale og Opret kunde
4. Lister forenkles
5. Indstillinger + Enkel visning + Større tekst
6. Guidet rundtur

Hvert trin testes på mobil, tablet og computer, også i mørk tilstand. Intet ændres i prisberegning, tidsregistrering eller kalender – kun hvordan det ser ud og forklares.

## Tekniske noter

- Menu: omstrukturér `src/components/admin/shared/adminNav.ts` (grupper → 5 punkter + "Min virksomhed"-hub); capability-filtre (`requires`) bevares, så "Kun profil" stadig ser færre punkter.
- Fælles `Stepper`/`WizardDialog` bygget på eksisterende `SheetHeaderBlock`/`Section`/`SheetFooterBar`.
- Fælles `MoreOptions` (Collapsible) og `FieldHelp` (tooltip/popover, ≥44 px).
- Visnings- og tekststørrelse gemmes pr. bruger (localStorage + profil), anvendt via CSS-variabel på roden.
- Ordliste i `src/lib/ui-wording.ts`, så samme ord bruges overalt.
