# Discord-onboarding i virksomhedspanelet — status og næste iteration

## Sådan fungerer Discords onboarding (UI/UX)

1. **Welcome Sign** — det første nye medlemmer ser: servernavn, én linje om hvad stedet er til for, og én tydelig handling. Ingen vægge af tekst.
2. **Onboarding-spørgsmål** — 1-3 spørgsmål om hvad man vil bruge serveren til. Svarene *filtrerer* hvad man ser bagefter, i stedet for at vise alt.
3. **Server Guide → "To Do"** — en kort liste (typisk 3-5) konkrete opgaver. Hver opgave har titel, én sætning, og et deep-link direkte til stedet. Opgaver markeres færdige automatisk, ikke manuelt.
4. **Fast placering** — guiden er en permanent post i sidebaren med et badge, ikke en modal man lukker og aldrig finder igen. Badget forsvinder når alt er gjort.
5. **Progressiv afsløring** — kun det aktuelle trin er foldet ud; færdige trin kollapser til en grå linje med flueben.
6. **Resources** — permanente kort med "hvordan gør man"-links, altid tilgængelige efter opsætningen.

## Hvad der allerede er bygget

Panelet har i dag: fast "Kom godt i gang"-fane med sidebar-badge, velkomstkort med fremgangsbar og tidsestimat, ét fokus-spørgsmål der filtrerer trin, auto-detekterede trin, krav-gating, "Når I er klar"-spor, ressourcekort og en næste-trin-stribe i toppen af panelet. Fremgang og fokusvalg gemmes i skyen.

## Næste iteration — de resterende Discord-træk

### 1. Færdige trin skal kollapse hårdere
Et gennemført trin fylder stadig som et fuldt kort. Discord skrumper dem til én grå linje med flueben og titel. Vi flytter alle færdige trin ned i en samlet "Færdige (3)"-sektion der er foldet sammen, så listen altid kun viser det der mangler.

### 2. Tydeligere primær handling pr. trin
I dag åbner et trin en fane. Vi tilføjer deep-links der lander præcis i den rigtige dialog (fx direkte i "Opret service" i stedet for service-oversigten), så trinnet kan gennemføres uden at lede.

### 3. Fejring når man rammer 100 %
Discord kvitterer synligt. Vi tilføjer en kort konfetti-/tilstandsanimation og skifter velkomstkortet til en "I er live"-tilstand med link til den offentlige side — én gang, ikke hver gang.

### 4. Guiden må ikke forsvinde helt
Når alt er færdigt, forsvinder badget, men fanen bliver liggende nederst i sidebaren som en rolig "Kom godt i gang"-indgang, så ressourcerne stadig kan findes.

### 5. Ressourcer skal pege på rigtigt indhold
De tre ressourcekort peger alle på `/hjaelp#faq`. De skal pege på konkrete guide-sider (aftaler vs. bestillinger, prisberegner, medarbejder-app) — eller fjernes hvis siden ikke findes endnu.

### 6. Tomme tilstande i resten af panelet skal linke tilbage
Discord gentager sine to-dos hvor de er relevante. Tomme lister i Services, Medarbejdere og Ruteplanlægger får en linje: "Del af opsætningen — se Kom godt i gang".

## Teknisk

- `GettingStartedTab.tsx`: opdel `steps` i aktive/færdige, tilføj sammenfoldet "Færdige"-sektion, tilstands-skift af velkomstkort.
- `OnboardingStepCard.tsx`: kompakt variant for færdige trin.
- `steps.ts`: udvid hvert trin med valgfrit `deepLink` (tab + query-param der åbner den relevante dialog).
- `AdminShell.tsx`: flyt fanen nederst i sidebaren når `allDone`.
- Tomme tilstande: små tekstlinjer i de tre eksisterende tomme-tilstands-komponenter.
