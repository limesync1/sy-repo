# To versioner af «Kom godt i gang» + matchende videoer

## Mål
Virksomhedspanelet viser automatisk den rigtige guide:
- **Fuldt system**: fra brancher til første udførte rute og faktura.
- **Kun profil**: fra brancher til en flot, synlig profil og første forespørgsel.

Hvert trin har sin egen korte video (1–1,5 min). Hver guide har også én introvideo (ca. 2 min) øverst.

## Guide 1 – Fuldt system (7 obligatoriske trin + 3 valgfrie)
Rækkefølgen følger hvad hvert trin kræver, så man aldrig går i stå:

1. **Vælg brancher**: styrer søgning og serviceskabeloner.
2. **Firmaoplysninger og logo**: navn, adresse (startpunkt for ruter), telefon, logo.
3. **Opret services**: fast pris, timepris eller prisberegner (uden moms). Kræver trin 1.
4. **Opret medarbejdere**: også dig selv, hvis du arbejder alene. Hver får eget login.
5. **Kunder**: opret én eller få dine data flyttet gratis fra dit gamle system.
6. **Første bestilling**: service, antal, dato og gentagelse. Kræver trin 3.
7. **Læg på en rute og tildel**: træk aftalen på en dato og tildel en medarbejder. Kræver trin 4 og 6.

Valgfrit, «Næste niveau»:
- **Kundebeskeder**: mail/SMS-påmindelser og egen mailkonto.
- **Forbind regnskab**: Billy, Dinero eller e-conomic samt fakturainterval.
- **Hent medarbejder-appen**: test en rute fra telefonen og markér den udført.

Afslutning: «Klar»-kort med genvej til Overblik og en tilbagevendende tjekliste.

## Guide 2 – Kun profil (5 obligatoriske trin + 2 valgfrie)
1. **Vælg brancher og område**: hvor og hvad kunder kan finde jer på.
2. **Profil og logo**: beskrivelse, logo og kontaktoplysninger.
3. **Opret services med priser**: vises på profilen.
4. **Billeder og anmeldelser**: tilføj billeder af tidligere arbejde og del anmeldelseslinket.
5. **Se din offentlige profil**: åbn og del linket.

Valgfrit:
- **Svar på forespørgsler**: notifikationer og hurtigt svar.
- **Prøv det fulde system i 30 dage**: et diskret kort, ingen påtrængende salg.

## Videoer du skal optage (OBS)
For hver guide:
- **Introvideo (ca. 2 min)**: hvad du får, og hvordan guiden fungerer. Den vises øverst i guiden.
- **Én kort video pr. trin** med samme navn og rækkefølge som trinnet. Hver video har samme opbygning:
  1. Problemet (5 sek.)
  2. Vis klikkene (45–60 sek.)
  3. Resultatet, og hvilket trin der kommer næst (10 sek.)

I alt: Fuldt system = 1 intro + 10 trinvideoer. Kun profil = 1 intro + 7 trinvideoer. Trin der er ens i begge guider (brancher, services) kan genbruge den samme video.

Leverance: Et nyt PDF-manuskript under Filer med optagerækkefølge, ordret tale, «VIS:»-instruktioner og en tjekliste med testdata (Jimmy's VP, falske kunder). Det følger præcis de nye trin.

## Platform-admin
Videoindstillingerne får to faner, «Fuldt system» og «Kun profil». Hvert trin og hver introvideo får et eget felt til et link. Har et trin ingen video, vises en diskret «Video kommer snart»-pladsholder i stedet for et tomt felt.

## Tekniske detaljer
- `steps.ts` deles op i `FULL_CORE_STEPS`/`FULL_NEXT_STEPS` og `LISTING_CORE_STEPS`/`LISTING_NEXT_STEPS`. Valget sker via `business-capabilities.ts` (plan_kind). Nye step-id'er: `profile`, `customers`, `notifications`, `employee_app`, `area`, `gallery`, `public_profile`, `inquiries`, `upgrade`.
- `useOnboardingSignals` udvides med de tællere, der mangler: logo/adresse, antal kunder, billeder, aktiveret notifikation og om appen er brugt. Det sker ud fra eksisterende tabeller.
- `onboarding_videos` får kolonnen `track` ('full' | 'listing' | 'shared') og intro-id'er (`intro_full`, `intro_listing`). Hooket filtrerer på track og falder tilbage til 'shared'.
- `GettingStartedTab` viser introvideoen øverst, beholder det nuværende kortdesign og respekterer touchmål på mindst 44 px. Badgen i navigationen tæller kun den aktive guides obligatoriske trin.
- Når en virksomhed skifter plan, skifter guiden automatisk. Trin der allerede er gennemført, forbliver gennemført.
- Test: en vitest der sikrer, at kun-profil-guiden aldrig indeholder rute-, medarbejder- eller regnskabstrin, og at kravene for hvert trin følger rækkefølgen.
