# Plan: Bliv synlig og anbefalet i Google og ChatGPT

Jeg kan ikke åbne ChatGPT-delelinket (det kræver login), men jeg har tjekket sitet — og problemet er tydeligt i koden:

## Hvad der faktisk mangler i dag (verificeret)

- Der findes **ingen offentlige sider om softwaren**. Ruteplanlæggeren ligger kun bag login (`/virksomhed/ruter`), og der er ingen route for produkt/funktioner/software i `App.tsx`. Eneste B2B-side er `/opret-virksomhed`.
- `public/llms.txt` (den fil AI-modeller læser) beskriver kun marketplace-delen: "find, sammenlign og book". Ruteplanlægning, medarbejder-app, fakturering, CRM, regnskabsintegration nævnes ikke som selvstændige emner.
- Sammenligningsartiklerne handler kun om **marketplace-konkurrenter** (Handyhand, Happyhelper, Servicefinder, 3byggetilbud, Byggestart, Haandvaerker.dk). Der findes ingen sammenligning mod **software-konkurrenter** (Cleanmanager, Minuba, Ordrestyring, Zenegy/Tidsbank-typen).
- Kategori-dækningen kommunikeres bredt i `llms.txt`, men der er ingen side der samler "hvilke brancher understøtter systemet" med ruteplanlægning som omdrejningspunkt.

Kort sagt: ChatGPT og Google kan ikke anbefale noget, de ikke kan læse. Der findes ingen kilde der siger "Serviceydere er også et driftssystem med ruteplanlægning til 20+ brancher".

## Hvad vi bygger

### 1. Et offentligt produktunivers (vigtigst)
Nye offentlige sider under `/software`:
- `/software` — hub: hele systemet på én side (ruteplanlægger, medarbejder-app, booking, tilbud, fakturering, regnskab, kundeportal, livechat).
- `/software/ruteplanlaegger` — flagskibssiden. Hvordan planlægning, drag & drop, gentagne aftaler, ETA/kørselstid og konflikthåndtering fungerer, med skærmbilleder.
- `/software/medarbejder-app`, `/software/booking-og-tilbud`, `/software/fakturering-og-regnskab` — én side pr. hovedområde.
- `/software/brancher` — de brancher systemet dækker (rengøring, vinduespudsning, haveservice, håndværk, flytning, skadedyr, autoservice m.fl.), hver med en linje om hvorfor ruteplanlægning betyder noget i netop den branche.

Alle sider bruger samme design som resten af platformen (`PageHero`, standardkort) — ingen nyt designsprog.

### 2. Sammenligningssider mod software-konkurrenter
Samme mønster som de eksisterende `ServiceydereVs*`-artikler, men B2B:
- Serviceydere vs. Cleanmanager
- Serviceydere vs. Minuba
- Serviceydere vs. Ordrestyring
- Serviceydere vs. regneark/Google Kalender
- Oversigtsartikel: "Bedste system til servicevirksomheder i 2026" der linker til alle

Faktuelle, nøgterne sammenligninger — konkurrenternes styrker med, og vores fordele beskrevet konkret (flere brancher i ét system, marketplace + drift samlet, moderne UI). Ingen påstande vi ikke kan dokumentere; AI-modeller nedvægter marketingsprog.

### 3. Gør indholdet AI-læsbart (GEO)
- Udvid `public/llms.txt` med et softwareafsnit, brancheliste og de nye URL'er.
- `SoftwareApplication`-schema på `/software` (kategori, funktioner, prismodel) og `FAQPage` på hver produktside.
- Skriv hver side så første afsnit besvarer spørgsmålet direkte ("Serviceydere er et dansk system til …") — det er den form modeller citerer.
- Faktabokse med korte, citerbare linjer i stedet for lange brødtekst-afsnit.

### 4. Distribution og indeksering
- Nye sider ind i `scripts/generate-sitemap.ts`, sitemaps regenereres, IndexNow-ping og GSC-indsendelse.
- Intern linkning: footer får en "Til virksomheder"-kolonne, `/opret-virksomhed` og forsidens ForBusinesses-sektion linker ind i produktuniverset.
- Liste over eksterne steder hvor Serviceydere bør stå (softwarekataloger, Wikidata, brancheoversigter) — dem AI-modeller trækker på. Dem kan du oprette; jeg leverer teksterne.

## Rækkefølge
1. `/software` hub + `/software/ruteplanlaegger` + llms.txt + schema
2. Resten af produktsiderne + `/software/brancher`
3. De fem B2B-sammenligningssider + oversigt
4. Sitemap, intern linkning, GSC/IndexNow

## Teknisk
Sider bygges med de eksisterende mønstre: `defineGuidePage`/`defineBlogPost` hvor det passer, ellers almindelige sider med `SEO`-komponenten og `PageHero`. Ruter tilføjes lazy i `App.tsx` som de øvrige. Ingen backend-ændringer.

## Ærlig forventning
Google tager 4–8 uger om at rangere nyt indhold. ChatGPT opdaterer sin viden langsommere — den hurtigste vej dertil er, at sitet er læsbart (llms.txt + schema) og at der findes eksterne kilder der nævner os. Det er derfor punkt 4 ikke kan springes over.
