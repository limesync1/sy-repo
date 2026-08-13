# Discord-style onboarding i virksomhedspanelet

## Sådan fungerer Discords onboarding (research)

Discords model (Community Onboarding + Server Guide) har fem kendetegn:

1. **Fast plads i navigationen, ikke en modal.** Nye medlemmer lander på en dedikeret "Server Guide"-side øverst i kanallisten — den kan ikke væk-klikkes ved et uheld, og man kan altid vende tilbage.
2. **Welcome Sign.** En kort, personlig hilsen i toppen der forklarer hvad stedet er til for.
3. **New Member To Do's: 3-5 konkrete opgaver.** Ikke en lang liste. Hver opgave er én handling med ét deep link, og den markeres færdig automatisk når handlingen faktisk er udført.
4. **Personalisering via spørgsmål.** Svarene bestemmer hvilke kanaler/roller man ser — guiden tilpasser sig brugeren i stedet for at vise alt.
5. **Resources + graduation.** Read-only ressourcesider hænger i guiden, og når to-do's er klaret skifter siden karakter fra "opsætning" til "her er hvad du ellers kan".

## Hvad der allerede er på plads hos os

Panelet har nu en "Kom godt i gang"-fane (punkt 1-3 + 5 er dækket):

- Fast sidebar-punkt øverst med badge (fx 3/6), der skjuler sig selv når alt er klaret.
- 6 trin: brancher, regnskab, medarbejdere, services, første bestilling, rute — auto-detekteret fra databasen, ingen manuel afkrydsning.
- Krav-gating: trin låses indtil forudsætninger er opfyldt, med link til det manglende.
- Næste-trin-stribe på alle andre faner + afslutningskort med Leads/Livechat/Anmeldelser.

## Forslag: sådan lukker vi hullet til Discord-modellen

### 1. Welcome Sign (personlig hilsen)
Erstat den neutrale header med en hilsen der bruger virksomhedsnavn og branche:
"Velkommen, Ready2Clean. Her er de 6 ting der skal på plads, før I kan køre jeres første rute."
Under den: estimeret tid ("ca. 15 minutter") og hvem der kan hjælpe.

### 2. Reducér til 3-5 aktive to-do's ad gangen
Discord viser aldrig 6 opgaver på én gang. Vi deler i to spor:

```text
SKAL PÅ PLADS (vises altid)      NÅR I ER KLAR (foldet sammen)
1 Brancher                        Regnskab
2 Services                        Leads
3 Medarbejdere                    Livechat
4 Første bestilling
5 Rute
```
Regnskab flyttes ud af de 6 kerne-trin og ned i "næste niveau", da det ikke blokerer for at komme i gang. Tælleren bliver 5, ikke 6.

### 3. Personalisering via ét spørgsmål
Første gang: "Hvad vil I bruge Serviceydere til?" med tre svar — *faste aftaler og ruter* / *enkeltopgaver og tilbud* / *begge dele*. Svaret styrer hvilke trin der vises (ruteplanlægning skjules for dem der kun laver enkeltopgaver) og hvilke ressourcer der foreslås.

### 4. Ressource-sektion
Fast kort nederst med korte, læsevenlige emner: "Sådan virker aftaler vs. bestillinger", "Prisberegner på 5 minutter", "Medarbejder-appen". Linker til hjælpecenteret i stedet for at gemme viden i tooltips.

### 5. Fremgang gemt i skyen, ikke i browseren
"Spring over" gemmes i dag i localStorage, så det forsvinder ved skift af computer og deles ikke mellem ejer og kolleger. Flyttes til den eksisterende onboarding-tabel, så fremgangen følger virksomheden.

## Teknisk

- `steps.ts`: opdel i `CORE_STEPS` og `NEXT_LEVEL_STEPS`; tilføj `appliesTo` så personaliserings-svaret kan filtrere trin fra.
- `useOnboardingSignals.ts`: læs/skriv `skipped_steps`, `current_step` og et nyt svar-felt via `business_onboarding_progress` (hook `useOnboarding.ts` findes allerede) med optimistisk opdatering; behold auto-detektionen som i dag.
- `GettingStartedTab.tsx`: welcome sign med virksomhedsnavn, ét-spørgsmåls-kort ved første besøg, to sektioner (kerne / næste niveau), ressource-kort.
- `NextStepBar.tsx` og sidebar-badgen læser samme tæller, så 5-trins-modellen slår igennem alle steder automatisk.
- Ingen databaseændringer nødvendige ud over at bruge de eksisterende kolonner i `business_onboarding_progress`.
