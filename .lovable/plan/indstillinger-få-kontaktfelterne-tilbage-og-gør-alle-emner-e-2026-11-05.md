# Indstillinger: få kontaktfelterne tilbage og gør alle emner enklere

## Hvad er galt
Telefon, e-mail og adresse findes stadig, men de er skjult ved en fejl. Da "Om virksomheden" og "Kontakt og adresse" blev lagt sammen, kom kontaktkortet til at være skjult på alle emner – også på "Virksomhed og kontakt". CVR-nummeret har aldrig haft sit eget felt; der er kun en CVR-søgning, som vises, når adressen mangler.

## 1. Ret fejlen (først)
- Kontaktkortet (telefon, e-mail, adresse) vises igen under "Virksomhed og kontakt".
- "Ting mangler" (Telefon, E-mail, Adresse) hopper til de rigtige felter igen.

## 2. Ét samlet "Virksomhed og kontakt"
Rækkefølge med klare grupper:
1. **Firma:** navn, CVR-nummer (nyt felt der kan gemmes), beskrivelse.
2. **Kontakt:** telefon, e-mail, hjemmeside (hvis allerede understøttet).
3. **Adresse:** vej, postnummer, by (by udfyldes automatisk fra postnummer).
- Knappen "Hent fra CVR" sidder ved siden af CVR-feltet og kan altid bruges – ikke kun når adressen mangler. Den udfylder kun tomme felter, eller spørger før den overskriver.
- Ingen gentagne forklaringer; én kort linje pr. gruppe.

## 3. Gennemgang af alle emner
For hvert emne (Hvad I tilbyder, Profil og webadresse, Åbningstider, Beskeder til jer, Beskeder til kunder, Pris og betaling, Håndværk, Tilvalg og konto):
- Samme kortdesign: ikon, titel, én linje forklaring, felter i 2 kolonner på computer og 1 på mobil.
- Fjern lange tekster og dobbelte overskrifter; tydelige "gemt"-markeringer.
- Touchflader mindst 44 px, høj kontrast i mørk tilstand, ingen sidelæns scroll på 390 px.
- Én fast "Gem ændringer"-bjælke nederst, som kun vises når noget er ændret.

## 4. Kontrol
- Klik alle emner igennem på computer (1280 px) og mobil (390 px) på testvirksomheden.
- Gem telefon, e-mail og CVR og se at de står der efter genindlæsning.

## Tekniske detaljer
- Årsag: i `SettingsTab.tsx` filtreres `contact` væk fra `visibleSections`, og `hiddenSectionSelector` skjuler alle id'er, der ikke er synlige – derfor er `#settings-contact` altid `display:none`. Rettes ved at undtage `contact`, når `activeSection === "general"`.
- CVR gemmes i `businesses.settings.cvr` (læses allerede der), så ingen databaseændring er nødvendig.
- Ingen ændringer i priser, betaling eller serverlogik.
