# Små forbedringer af paneler og forsiden

## Resultat
- “Redigér rute” bruger det vedhæftede ruteikon i vinduets overskrift.
- “Gratis tilvalg” bruger de samme Leads- og Livechat-illustrationer som “Vælg dine funktioner”.
- Virksomheds- og medarbejdernavigationen bevares synligt ved sideskift i stedet for at vise hele menuens loading-visning igen.
- Menupunkterne får en rolig hoverbevægelse uden at ændre størrelse eller placering.
- “Alle aftaler er planlagt” vises statisk uden slide/fade-animation.
- “Del din profil” kopierer robust i flere browsere og viser en brugbar reservehandling, hvis automatisk kopiering ikke er tilladt.
- “Det siger kunderne” får et diskret, mere professionelt kortdesign uden at ændre sektionens opdeling.

## Gennemførelse
1. Læg det vedhæftede SVG-ikon i projektets eksisterende mediestrøm og brug det i rutevinduet.
2. Genbrug de eksisterende onboarding-illustrationer i “Gratis tilvalg”.
3. Bevar panelskallen mellem medarbejdersider og undgå fuld navigations-skeleton ved almindelige sideskift; virksomhedspanelets eksisterende fanevisning bevares.
4. Tilføj fælles, afdæmpede hover- og fokusanimationer til sidepanelpunkterne.
5. Gør den færdigplanlagte tomtilstand statisk via den fælles tomtilstands-komponent.
6. Tilføj clipboard-reservekopiering til profilhandlingen.
7. Finjustér anmeldelseskortenes typografi, stjerner, citatmarkering, virksomhedsafsender og hoverkant.

## Kontrol
- Kontrollér panelnavigation, rutevindue, “Del din profil” og ruteplanlægger med en aktiv session.
- Kontrollér anmeldelsessektionen på mobil og computer.
- Kontrollér at siden bygger uden fejl.
