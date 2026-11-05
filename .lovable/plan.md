# Kun profil, fuldt system og smartere virksomhedsindstillinger

## 1. Hurtige rettelser (ses med det samme)
- **Databehandleraftale-boksen** (første besøg i panelet): det nye ikon "Godkend databehandleraftale" øverst, og boksen bliver lige så bred som de andre sektioner i panelet.
- **"Forbind jeres regnskabsprogram?"**: vinduet vises kun ved Fuldt system, aldrig ved Kun profil.
- **Services kræver brancher**: uden valgte brancher er "Opret service" låst, og der står en kort besked med en knap: "Vælg brancher først", som åbner Indstillinger › Brancher. Det samme gælder forslagene i guiden "Kom i gang".
- **Tom serviceliste**: knappen "Opret service" i boksen "Ingen services endnu" fjernes. Knappen øverst på siden bliver.

## 2. Hvad Kun profil-virksomheder kan
En gratis profil, hvor man bliver fundet og får forespørgsler. Ingen drift.

| Område | Kun profil | Fuldt system |
|---|---|---|
| Profil, logo, billeder, webadresse, åbningstider | Ja | Ja |
| Brancher og services med priser (vises på profilen) | Ja | Ja |
| Anmeldelser og svar på anmeldelser | Ja | Ja |
| Forespørgsler / "Indhent 3 tilbud" / livechat | Ja | Ja |
| Mails til virksomheden om nye forespørgsler og anmeldelser | Ja | Ja |
| Kunder, aftaler, ruteplanlægger, medarbejdere | Nej (vises som låst "Opgradér" i stedet for at blive skjult helt) | Ja |
| Beskeder til kunder, påmindelser, fakturainterval | Nej | Ja |
| Regnskab, Håndværk, mails om ruter/aftaler | Nej | Ja |

Regler, der beskytter det fulde system:
- Alt styres stadig fra den samme ene plan-indstilling, som både panelet og serveren læser. Fuldt system får ingen ændringer.
- **Opgradering**: én knap: "Opgradér til fuldt system – 30 dage gratis". Profilen, services, anmeldelser og forespørgsler bliver, som de er. Bagefter åbner guiden "Kom i gang" ved næste trin (medarbejdere/rute).
- **Nedgradering**: kun muligt uden aktive ruter, aftaler eller betalt abonnement (som i dag). Vinduet viser en tydelig tjekliste over, hvad der mangler, med links. Ingen data slettes; skjulte indstillinger gemmes til en senere opgradering.

## 3. Smartere virksomhedsindstillinger
- **Kun det relevante vises**: indstillingerne bygger på én fælles liste over sektioner, hvor hver sektion angiver, hvilken plan den hører til. Navigationen og selve siden viser altid det samme. Ved Kun profil skjules Beskeder til kunder, Håndværk, regnskab og driftstilvalg. Til sidst kommer ét samlet kort: "Mere med fuldt system".
- **Navigationen i venstre side**:
  - Et klik scroller nu pålideligt hen til sektionen. Først findes ud af, om panelet scroller selve siden eller en indre boks, og så scrolles det rigtige sted.
  - Det valgte punkt markeres med det samme og flimrer ikke under scroll.
  - Adressen opdateres, så et link fører til den rigtige sektion.
  - På mobil scroller den vandrette navigation med, så det valgte punkt er synligt.
- **Status pr. sektion**: et lille mærke i navigationen viser "Mangler", fx brancher, adresse eller logo, og en enkelt linje øverst viser, hvor færdig profilen er.
- **Søg i indstillinger**: et søgefelt øverst filtrerer sektionerne, fx "moms" eller "åbningstider".
- **Gem**: én fast "Gem ændringer"-bjælke, der kun vises, når noget er ændret, og som advarer, hvis man forlader siden uden at gemme.

## Rækkefølge
1. Hurtige rettelser (afsnit 1).
2. Planstyrede sektioner og nav-scroll (afsnit 3, de to første punkter).
3. Opgradér/nedgradér-flow og låste menupunkter (afsnit 2).
4. Status, søgning og gem-bjælke.
5. Browsertjek på 390, 820 og 1280 px med en Kun profil- og en Fuldt system-virksomhed.

## Tekniske detaljer
- Ikonet uploades via lovable-assets; `DPAAcceptanceBanner.tsx` får samme max-bredde/container som de andre panelsektioner.
- `Admin.tsx`: `AccountingSetupPrompt` renderes kun, når `planKindOf(business) === "full"`.
- `ServicesTab.tsx`: tom-tilstanden mister sin CTA; opret-knappen er deaktiveret, når `business.categories` er tom.
- `SettingsTab.tsx`: `SECTIONS` får `plans: PlanKind[]`, som filtreres via `business-capabilities.ts`. `scrollToSection` finder den nærmeste scrollende forælder (i dag `window.scrollTo`), og IntersectionObserveren genopbygges, når de synlige sektioner ændrer sig (i dag `[]`-deps).
- Der kommer ingen ændringer i databasen. Plan-skift foregår fortsat via `set_business_plan_kind`, og serverens regler for Kun profil bliver, som de er.
- Tests: den eksisterende plan-/capability-test udvides, så den tjekker, at listing-planen skjuler sektionerne for kundebeskeder og regnskab, og at regnskabsvinduet kun vises ved fuldt system.
