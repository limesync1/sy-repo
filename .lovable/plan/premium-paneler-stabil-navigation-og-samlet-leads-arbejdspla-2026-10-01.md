# Premium paneler, stabil navigation og samlet Leads-arbejdsplads

## Resultat
- Virksomheds-, medarbejder- og platformadministrationen får samme premium-følelse på alle sider og undersider: tydeligere dybde, ens kort, bedre kontrast og rolige tilstande i både lyst og mørkt tema.
- Sidebaren viser én stabil struktur fra første visning. Menupunkter, bredder, logo, arbejdsplads og bundnavigation må ikke blinke, skifte størrelse eller kortvarigt dukke op og forsvinde.
- Leads bliver én samlet arbejdsplads for henvendelser fra Serviceydere og Meta Lead Ads, med enkel opsætning, automatisk synkronisering, kildevisning, prioritering, opfølgning og måling.
- Meta Pixel og Conversions API måler relevante hændelser uden at sende persondata uden gyldigt samtykke.
- De 12 vedhæftede illustrationer bruges på de store, læsbare flader de er lavet til. Navigation, tabellernes små handlinger og kompakte knapper beholder velkendte standardikoner.

## 1. Fælles premium-design på alle tre paneler
- Opgradér de fælles `service-panel-*`-flader, så kort, tabeller, modaler, topbar, drawer og sheets bruger samme lagdelte skygger, kanter og baggrundsniveauer.
- Gør skyggerne diskrete på almindelige elementer og tydeligere på modaler og fremhævede kort; dark mode får egne kontrastkorrekte skygger.
- Ensret fokus, hover, aktiv, valgt, disabled og loading på tværs af virksomhed, medarbejder og platformadmin.
- Bevar den kompakte geometri og Inter. Der tilføjes ikke dekorative illustrationer i navigation eller små kontrolknapper.
- Flyt platformadministrationen over på den fælles panelramme uden at ændre fanernes funktioner, genveje, badges, søgning eller datofilter.

## 2. Stabil navigation og én loading-oplevelse
- Gør login/sessionens første indlæsning entydig, så den ikke kan skifte mellem logget ud og logget ind under opstart.
- Lad virksomhedens navigation vente på ét færdigt sæt funktionsflag i stedet for at lade Leads, Livechat, Ruter eller Regnskab dukke op efter første visning.
- Lad onboardingstatus og rolle-skift blive vist først, når deres data er afklaret, uden animeret indskydning af ekstra rækker.
- Lad medarbejderpanelet afklare arbejdsplads og Livechat-tilladelse før den færdige navigation vises. Ved ventetid bruges én panel-skeleton med den gemte sidebarbredde.
- Brug samme dynamiske skeleton for normal, sammenfoldet og mobil navigation i alle tre paneler.
- Bevar navigationen monteret ved sideskift; kun selve sideindholdet får en kort, sidespecifik placeholder ved reelt langsom indlæsning.

## 3. Smartere Leads-side
- Redesign siden til et kompakt arbejdsflow med:
  - nøgletal for aktive leads, konvertering og svartid med de vedhæftede illustrationer;
  - tydelig kilde på hvert lead: Serviceydere, Facebook eller Instagram;
  - samlet søgning, kilde-/statusfilter, prioriteret rækkefølge og opfølgninger;
  - hurtige handlinger og ens detaljevisning, uden at markere alle nye leads som læst blot ved at åbne fanen;
  - tomme og fejltilstande, der forklarer næste konkrete handling.
- Bevar sikker adgang til kontaktoplysninger og eksisterende Serviceydere-matchning.
- Flyt lead-hentning og opdateringer til fælles hooks, så liste, nøgletal og detaljevisning ikke kan komme ud af sync.

## 4. Meta Lead Ads-forbindelse
- Tilføj en enkel opsætningsflade på Leads-siden: forbind Meta, vælg Facebook-side, Instagram-konto og Lead Ads-formularer, og vis seneste synkronisering/fejl.
- Opret en sikker webhook i Lovable Cloud til Meta-verificering og signerede lead-events.
- Hent leadfelter via Meta Graph API, normalisér navn, e-mail, telefon, kategori og beskrivelse, og deduplikér genleverede webhook-events.
- Gem eksterne leads med kilde, formular, kampagne og eksternt lead-id, men aldrig adgangstokens i almindelige virksomhedsdata.
- Importer nye Meta-leads direkte til den samme pipeline og visning som Serviceydere-leads. Meta-leads knyttes kun til den virksomhed, der ejer forbindelsen.
- Tilføj genforbindelse, frakobling og manuel synkronisering med tydelige statusbeskeder.

## 5. Meta Pixel og Conversions API
- Tilføj samtykkestyret Meta Pixel på offentlige flows og send tilsvarende serverhændelser gennem Conversions API med fælles event-id til deduplikering.
- Mål kun aftalte hændelser: relevant sidevisning, start på tilbud/booking, indsendt lead og gennemført booking.
- Hash kontaktfelter server-side, send mindst mulige data, og respekter cookie-/marketing-samtykke samt fravalg.
- Vis forbindelsesstatus og seneste målte hændelser på Leads-sidens opsætning uden at vise hemmelige nøgler.

## 6. Vedhæftede illustrationer
- Føj illustrationerne til den fælles illustrationoversigt og brug dem således:
  - Leads: **Aktive leads**, **Konvertering**, **Svartid**.
  - Livechat: **Aktive samtaler**, **Ubesvarede beskeder**, **Svartid**, **Kundetilfredshed**.
  - Overblik: **Til udbetaling**.
  - Ny service: **Specifik pris**, **Timepris**, **Prisberegner**, **Lad AI bygge prisberegneren**, **Byg fra bunden**.
- Vis illustrationerne i mindst ca. 36–48 px med neutral, kontraststærk flade. Brug ikke de detaljerede filer som 14–16 px symboler.
- Kundetilfredshed viser kun en reel måling, når feedback findes; ellers vises en neutral “Ikke målt endnu” i stedet for et opdigtet tal.

## 7. Livechat-nøgletal på alle roller
- Tilføj samme række stat-kort over indbakken i virksomhed, medarbejder og platformadmin.
- Virksomhed og medarbejder ser kun deres aktuelle arbejdsplads; platformadmin ser hele platformen.
- Beregn aktive samtaler, ubesvarede beskeder og faktisk gennemsnitlig første svartid fra eksisterende samtaler.
- Genbrug virksomhedens Livechat-komponent i medarbejderpanelet, så nøgletal og indbakke altid er identiske for samme arbejdsplads.

## 8. Overblik og Ny service
- Erstat det generiske medarbejdersymbol ved “Til udbetaling” med den vedhæftede illustration uden at ændre beregningen.
- Erstat emoji-/standardikoner i de fem store valg på “Ny service” med de tilsvarende vedhæftede illustrationer.
- Gør “Tilføj trin” til en tydelig sekundær handling med semantisk farve, synlig kontrast og samme design som resten af serviceformularen.
- Ret ref-fejlen i servicevisningen ved at sikre, at komponenter som modtager refs bruger `forwardRef`.

## Teknisk og sikkerhed
- Nye offentlige tabeller får eksplicitte grants, RLS og virksomhedsejerskab i samme migration.
- Meta OAuth-state, webhook-signatur og virksomhedstilknytning valideres server-side. Tokens lagres krypteret via Lovable Secrets/Cloud-funktioner og returneres aldrig til browseren.
- Meta-forbindelsen bygges bag en afsluttet opsætningsstatus, så eksisterende Leads fortsætter uændret, hvis Meta ikke er forbundet.
- Der findes ingen færdig Meta-connector i projektet eller workspace-kataloget. Selve Meta App ID/secret, webhook-registrering og godkendte rettigheder kræver en Meta-app og kan først aktiveres fuldt, når de oplysninger er tilgængelige; resten kan bygges og testes med sikre fejl-/frakoblede tilstande.
- Strukturbeslutningen om fælles panelramme og samlet leadkilde registreres i projektets arkitekturregler.

## Kontrol
- Test første load, genindlæsning, faneskift, collapse, drawer og rolle-skift på mobil, mindre laptop og stor skærm for alle tre paneler.
- Kontrollér, at navigationens pixelbredde og synlige punkter er stabile gennem hele indlæsningen.
- Test Leads fra Serviceydere samt simulerede signerede Meta-webhooks, dubletter, ugyldige signaturer, frakoblet konto og udløbet token.
- Test Pixel/Conversions-deduplikering og verificér, at ingen marketinghændelser sendes uden samtykke.
- Kontrollér Livechat-nøgletal og de fem servicevalg visuelt i lyst og mørkt tema.
- Kør relevante navigationstests, typekontrol, selektive tests og de faktiske flows i browseren. Intet publiceres i denne ændring.
