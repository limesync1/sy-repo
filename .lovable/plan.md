# Plan: En mere brugervenlig og kompakt Indstillinger-side

Bygger på gennemgangen af alle emner på testvirksomheden (computer og mobil). Funktioner, priser og hvad der gemmes forbliver uændret – det er kun opbygning, tekst og design.

## 1. Toppen fylder mindre
- Slå "Indstillinger"-overskriften, "Fuldt system"-mærket, "Alt er gemt" og "Se din side" sammen i én lav linje. Skillelinjen under fjernes.
- "Næste trin"-baren fra guiden vises ikke på Indstillinger (den gentager guiden i venstre menu).
- Resultat: formularen starter ca. 150 px højere oppe på computer og endnu mere på mobil.

## 2. Menuen i venstre side bliver roligere
- Kortere punkter: kun navnet, ingen grå undertekst under hvert punkt. Underteksten bliver i stedet til et lille hjælpe-vindue, når musen holdes over.
- "Profil udfyldt 38 %" laves om til én tynd linje øverst i menuen med teksten "5 ting mangler", som kan trykkes på og hopper til det første, der mangler.
- Søgefeltet bliver: skriver man fx "moms" eller "logo", springer man direkte til det rigtige felt og ikke kun emnet.
- Menuen bliver hele tiden synlig, mens man ruller (i dag forsvinder bunden på mindre skærme).

## 3. Mobil
- Emnerækken øverst erstattes af en tydelig vælger: "Emne: Om virksomheden" med en pil, der åbner en liste med alle emner, grupperet som på computer. Ingen vandret scroll, som man ikke ved findes.
- "Gør profilen færdig"-boksen bliver én kompakt linje med "5 ting mangler – vis", i stedet for en stor boks med mange knapper.
- "Næste"/"Forrige" bliver en fast bund-bar, så man altid kan gå videre uden at rulle ned.

## 4. Hvert emne gøres enklere
- **Om virksomheden + Kontakt og adresse** samles til ét emne, "Virksomhed og kontakt" – det er få felter, og de hører sammen.
- **Hvad I tilbyder:** Brancher, der allerede er valgt, vises øverst. Resten af listen er skjult bag "Vis alle brancher", eller man søger. I dag fylder listen meget lang ned ad siden.
- **Profil og webadresse:** Logo og forsidebillede vises side om side med kortere tips. Det lange afsnit om "eget webnavn" klappes sammen bag "Har I jeres eget webnavn?".
- **Åbningstider:** Mere kompakt med én linje pr. dag og tiderne på samme linje. Lukkede dage vises nedtonet. Hurtigknapperne ("Hverdage 08–16") beholdes øverst.
- **Beskeder til jer:** Beholdes, men med lidt mindre luft mellem rækkerne.
- **Beskeder til kunder:** Forhåndsvisningen "Sådan ser kunden den" bliver en knap, "Se forhåndsvisning", på mindre skærme, så redigeringen får plads.
- **Pris og betaling:**
  - "Abonnementstype" bliver én linje: "I har Fuldt system", med knappen "Skift" ved siden af.
  - Den modstridende besked "Abonnementet er aktivt – der mangler stadig et betalingskort" skrives om til én tydelig besked: "Tilføj betalingskort inden prøveperioden slutter d. X". Den vises øverst sammen med knappen.
- **Tilvalg og konto:** "Slet virksomhed" flyttes ned i en sammenklappet "Farlig zone", så den ikke ses ved et uheld.

## 5. Ensartet og tilgængeligt
- Samme overskriftsstil, afstande og kortdesign i alle emner. Feltnavne skrives med almindelige bogstaver i stedet for STORE BOGSTAVER (lettere at læse, også for ordblinde).
- Alle trykflader er mindst 44 px, og der er tjek for kontrast i mørk tilstand.
- Det sidst åbnede emne huskes, så man kommer tilbage til samme sted.

## Teknisk
- Ændringerne laves i `SettingsTab.tsx` (layout, menu og samling af emner), `AdminUI` SectionCard (en kompakt variant) og `OnboardingNextStep` (skjules på fanen Indstillinger).
- Emnelisten (`SECTIONS`) opdateres. `general` og `contact` samles, og de gamle adresser (`#settings-contact`) sendes stadig videre til det rigtige emne, så links fra guiden og "mangler"-knapperne virker.
- Felt-søgningen bygges ud fra en lille liste med søgeord og hvilket felt de hører til. Ved et træk rulles feltet frem, og det fremhæves kort.
- Til slut gennemgår jeg siden med Playwright ved 390, 820 og 1440 px for alle emner, og jeg kører de eksisterende tests.
