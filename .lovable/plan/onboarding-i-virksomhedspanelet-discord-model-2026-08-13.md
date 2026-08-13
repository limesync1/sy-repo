# Onboarding i virksomhedspanelet — Discord-model

## Sådan fungerer Discord's onboarding (research)

Discord har reelt **to** onboarding-flader, og det er kombinationen der gør den god:

**1. "Server Guide" / Home — en fast side, ikke en modal**
- Ligger som et permanent punkt øverst i sidebaren med en lille badge-prik når der er uafsluttede opgaver.
- Indeholder tre blokke: *Velkomst*, *Nye ting at gøre* (to-do-kort) og *Ressourcer* (dybe links).
- Hvert to-do-kort er lille: ikon + én linje titel + én linje beskrivelse + én knap der hopper direkte til stedet.
- Opgaver markeres færdige **automatisk** når handlingen faktisk sker. Færdige kort falder til bunden med flueben og dæmpet stil.
- Fladen forsvinder/skrumper af sig selv når alt er klaret — man skal ikke "lukke" den.

**2. Admin-opsætningen (Server Settings → Onboarding) — wizard med krav og live-preview**
- Øverst en **krav-liste**: "Du skal have X, Y, Z før du kan slå til". Hvert krav har grøn/grå status og et link til at ordne det. Enable-knappen er disabled indtil alt er grønt.
- Wizard i faner (Default Channels → Customize → Questions) med en **live preview i højre side** der viser præcis hvad den nye bruger kommer til at se.
- Sticky bundbar: "Du har ugemte ændringer — Nulstil / Gem".
- Sprog er handlingsorienteret og kort; ingen tekstvægge.

**UX-principper der bærer det:**
1. Fast flade frem for modal — modalen afbryder, siden inviterer.
2. Auto-detektion af fremgang, aldrig manuelt afkryds som primær mekanik.
3. Ét kort = én handling = ét deep link.
4. Progress vises som "3 af 6" + bar, altid synlig.
5. Krav gates: systemet siger hvad der mangler i stedet for at fejle bagefter.
6. Guiden dør af sig selv når den er overflødig.

## Hvordan det bør se ud på Serviceydere

I dag er guiden en modal (`OnboardingHub`) der kun åbnes via `?guide=1`, med slides man klikker sig igennem. Auto-detektionen er der allerede og er god — den skal genbruges. Selve fladen skal ændres.

**A. Ny fast "Kom godt i gang"-flade**
- Nyt punkt øverst i virksomhedspanelets sidebar: "Kom godt i gang" med lille prik-badge og "3/6".
- Punktet skjules automatisk når alle 6 trin er grønne (kan stadig nås via Overblik → "Se guide").
- Nye virksomheder lander på denne fane som default i stedet for Overblik, indtil trin 1-4 er klaret.

**B. Layout på fladen**
```text
┌───────────────────────────────────────────────┐
│  Kom godt i gang        [███████░░░]  3 af 6  │
│  Klar til at tage imod jeres første kunde     │
├───────────────────────────────────────────────┤
│ ✓ 1  Brancher og underkategorier   Rediger →  │
│ ✓ 2  Regnskabsintegration          Se status →│
│ ○ 3  Opret medarbejdere            Start   →  │
│      Hver medarbejder får eget login...       │
│      ! Uden medarbejder ingen rutetildeling   │
│ ○ 4  Opret services                Start   →  │
│ ○ 5  Første bestilling             Start   →  │
│ ○ 6  Læg aftalerne på en rute      Start   →  │
├───────────────────────────────────────────────┤
│ Ressourcer:  Videoguide · Support · Priser    │
└───────────────────────────────────────────────┘
```
- Kun det **aktuelle** trin er udfoldet med beskrivelse og tip; resten er én linje. Klik udfolder.
- Færdige trin: flueben, dæmpet, og de tre første kollapser til en samlet "3 trin færdige"-linje når alt over er klaret.
- Ingen "Næste"-navigation — man arbejder i panelet og kommer tilbage.

**C. Krav-gating pr. trin (Discord-mønsteret)**
Trin der afhænger af andre trin viser en lille kravliste i stedet for en død CTA:
- Trin 5 (bestilling): kræver mindst én service + én kunde-mulighed → viser "Mangler: en service" med link.
- Trin 6 (rute): kræver mindst én medarbejder og én bestilling.
Knappen er disabled med tooltip indtil kravene er grønne.

**D. Kontekstuel "next step"-stribe i toppen af panelet**
En slank bar over indholdet på alle faner: "Næste trin: Opret jeres første service — Start". Forsvinder ved 6/6 og kan skjules for sessionen.

**E. Fejring og afslutning**
Når 6/6 nås: ét kort med kort tillykke, tre næste-niveau forslag (leads, livechat, anmeldelser), og guiden flytter til Indstillinger som statisk hjælpelink.

**F. Sprog og indhold**
- Titler maks 4 ord, beskrivelse maks to linjer, tip kun hvor det reelt forhindrer en fejl.
- Alle nuværende tekster kortes ned; de lange forklaringer flyttes til udfoldet visning.

## Teknisk

- Behold `useOnboarding.ts` og signal-queryen fra `OnboardingHub.tsx` — flyt den til en delt `useOnboardingSignals` hook så både sidebar-badge, topstribe og fladen læser samme kilde.
- Ny komponent `src/components/admin/onboarding/GettingStartedTab.tsx` (fast fane) + `OnboardingStepCard.tsx` + `NextStepBar.tsx`.
- Trin-definitionerne flyttes til `src/components/admin/onboarding/steps.ts` med felterne: `id, icon, title, short, body, tip, tab, requires[]`.
- `OnboardingHub` (modal) udgår; `?guide=1` redirecter til den nye fane, så eksisterende links stadig virker.
- Manuelle overrides gemmes fortsat, men kun som "spring over"-markering på det enkelte kort.
- Ingen database- eller backend-ændringer nødvendige.
