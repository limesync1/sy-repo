# Indstillinger: ens design og rigtig luft på alle emner

## Mål
Alle emner i Indstillinger skal ligne hinanden og have samme luft: ikke for tæt (som Åbningstider nu) og ikke for luftigt andre steder. Alt gemmes stadig automatisk, uden gem-knapper.

## 1. Fælles regler for alle emner
- **Kort:** samme ramme, runde hjørner og indre luft (16 px mobil, 20 px computer).
- **Top på kortet:** ikon, titel og højst én linje forklaring.
- **Felter:** feltnavn over feltet, felthøjde 44 px, 16 px mellem felter, 2 kolonner på computer og 1 på mobil.
- **Til/fra-rækker:** samme række overalt: ikon, navn, én linje tekst og kontakt til højre. Mindst 48 px høj, 12 px luft og streg imellem.
- **Undergrupper:** lille overskrift med normale bogstaver i stedet for ekstra kort inde i kort.
- **Mellem kort:** 16 px luft på alle emner.

## 2. Emne for emne
- **Virksomhed og kontakt:** Firma og Kontakt følger reglerne. Postnummer og by står ved siden af hinanden.
- **Hvad I tilbyder:** Brancher vises som chips. Listen over aftaletyper får mindre luft.
- **Profil og webadresse:** Logo og forsidebillede står side om side med samme højde. Kortere webadresse-række.
- **Åbningstider (mere luft):**
  - Én række pr. dag, mindst 52 px høj.
  - Dagnavn, kontakt og tider på linje med tydelig afstand.
  - På mobil står tiderne under dagnavnet.
  - "Brug på alle dage" er en lille knap under listen.
- **Beskeder til jer:** Rækkerne bruger den fælles til/fra-række, og valg af tidspunkt står pænt under rækken.
- **Beskeder til kunder:**
  - SMS-kortet og de to beskedrækker får samme design som resten.
  - "Ret tekst" fylder mindre.
- **Pris og betaling:** Pakke, interval og betalingskort står i én overskuelig liste. Mindre tom luft og færre store kasser.
- **Håndværk:** De tre funktioner bruger den fælles til/fra-række, og knapperne er kompakte.
- **Tilvalg og konto:** Den fælles til/fra-række. "Opsig eller slet" står sammenklappet nederst.

## 3. Kontrol
- Klik alle emner igennem på 390 px, 820 px og 1280 px på testvirksomheden.
- Tjek at intet scroller sidelæns, at trykflader er mindst 44 px, og at alt er tydeligt i mørk tilstand.

## Tekniske detaljer
- Fælles byggeklodser i `AdminUI.tsx`:
  - `SectionCard` får faste mellemrum.
  - Ny `SettingRow` til til/fra-rækker.
  - Ny `FieldGrid` og `SubHeading`.
- Disse bruges i `SettingsTab.tsx`, `OwnerAlertsEditor.tsx`, `CustomerNotificationsSettings.tsx`, `SmsSetupCard.tsx` og `PlanKindSection.tsx`.
- Kun design. Ingen ændring i gemning, priser eller server.
