# Samlet designgennemgang af Overblik, profilvindue og aftalehandlinger

## Mål
Gøre virksomhedspanelets **Overblik** roligere, tydeligere og mere sammenhængende på mobil, tablet og computer. Samtidig ensrettes **Rediger profil** og handlingerne **Ret aftale**, **Ny aftale** og **Note til kontoret** på tværs af kørselsvisning, listevisning og aftaledetaljer.

## Bekræftede problemer
- Heroens fire nøgletalskort er almindelige hvide kort og mangler den ønskede meget lyse sølvkarakter.
- **Udført** lægger et ekstra check-mærke oven på et eksisterende bestillingsikon; samme grundikon bruges også til **Udestående**, hvilket gør det finansielle overblik mindre let at aflæse.
- Overblikssiden blander flere kortformer, hjørner, afstande og specialbyggede knapper. Flere af de specialbyggede knapper har kun hover-feedback og ingen egen tydelig tastaturfokus.
- Sidekolonnerne skifter først layout ved en meget bred skærm, så tablet og mindre computere får en unødigt lang enkeltkolonne.
- Virksomheds- og medarbejdervinduet **Rediger profil** bruger allerede de fælles indholdsdele, men de to næsten ens vinduer har forskellige ikonstørrelser, felthøjder, overskriftsafstande og fodlayout.
- **Ret aftale**, **Ny aftale** og **Note til kontoret** bruger samme neutrale outline-stil i kørselsvisning, listevisning og detaljer. Note-handlingen har desuden forskellige tekster og kan konkurrere med et ekstra notefelt i detaljevisningen.
- Den aktuelle kørsel viser en React-advarsel om et ref sendt til `UiArtwork`; den skal fjernes som del af kvalitetskontrollen.

## Plan

### 1. Forfin hele Overblik-siden
- Give heroens fire nøgletalskort en diskret, meget lys sølv-gradient via semantiske designværdier, med en særskilt mørk variant med korrekt kontrast.
- Bevare den mørkeblå hero, men justere afstande, tekstbredder og handlinger, så lange virksomhedsnavne, datoer og indsigter ikke klippes eller presser knapperne.
- Ensrette hjørner, kanter, skygger, overskrifter og afstande på finansielt overblik, seneste bestillinger, hurtige handlinger, profilfuldendelse og bedst sælgende services.
- Fjerne det dobbelte check ved **Udført** og give **Udført** og **Udestående** hver sin tydelige, enkelte ikonbehandling.
- Gøre periodevalg, filtre, søgning, sortering og “Se alle” mere ensartede med tydelig hover, aktiv, fokus og deaktiveret tilstand.
- Forbedre mellemstørrelser, så hovedindhold og sidekolonne bruger pladsen bedre på tablet og mindre computer uden at blive for tætte.
- Sikre at beløb, statusmærker, lange kundenavne og tomme tilstande fungerer uden skjult eller overlappende indhold.

### 2. Ensret Rediger profil med de nye vinduer
- Samle virksomheds- og medarbejderprofilen omkring én fælles profilopbygning, mens deres eksisterende gemmefunktioner og tilladte felter bevares.
- Bruge samme overskriftsblok, sektioner, felter, scrollområde og fast handlingslinje som **Opret bestilling**, **Ny rute** og **Rediger rute**.
- Ensrette profilbillede, felthøjder, hjælpetekst, ikke-gemt tilstand, luk/kassér-bekræftelse, indlæsning og fejlvisning.
- Bevare bundark på mindre skærme og sidepanel på større skærme, men kontrollere højde, tastatur, safe area og lange tekster.

### 3. Giv aftalehandlingerne tydelig funktionel farve
- Indføre fælles semantiske handlingstyper frem for tre ens outline-knapper:
  - **Ret aftale**: rolig redigeringsfarve.
  - **Ny aftale**: tydelig konstruktiv/primær farve.
  - **Note til kontoret**: særskilt informationsfarve.
- Bruge de samme farver, ikoner, tekster og tilstande i kørsels-HUD, tjekliste, listevisning og aftaledetaljer.
- Bruge den fulde tekst **Note til kontoret** konsekvent og fjerne eller samle konkurrerende noteindgange, så samme side ikke viser to forskellige måder at gøre det samme på.
- Ensrette knaphøjder, ikonflader, brudpunkter og minimum 44 px trykflader; knapper må wrappe uden at ændre hele rækkens højde uforudsigeligt.
- Bevare de eksisterende handlinger og aftalelogik; kun præsentation og navigation mellem de eksisterende vinduer ændres.

### 4. Tværgående designkontrol
- Gennemgå de berørte panelområder for rå specialknapper, uklare hover/active/focus-states, beskåret tekst, for små trykflader, overlappende popups og uens vinduer.
- Erstatte gentagne lokale løsninger med de eksisterende fælles knapper og vinduesdele, hvor det giver samme adfærd.
- Kontrollere lyst og mørkt tema, læsevenlig kontrast og ordblindevenlig tekststruktur uden at ændre danske labels eller forretningslogik.
- Fjerne den bekræftede `UiArtwork`-advarsel uden at ændre illustrationernes udseende.

## Teknisk afgrænsning
- Farver og sølv-gradient defineres som semantiske HSL-værdier i designsystemet; ingen hårdkodede komponentfarver.
- Fælles vinduesdele forbliver `SheetHeaderBlock`, `Section`, `Field` og `SheetFooterBar`; profilvinduer får en fælles wrapper i stedet for to næsten identiske layouts.
- Aftaleknapper får delte varianter/stilkonfigurationer, så HUD og listevisning ikke kan drive fra hinanden igen.
- Ingen ændring af priser, tidsregistrering, kortnøgler, rutealgoritmer, database eller genererede filer.

## Verifikation
- Komponenttests for sølvkort, enkelt ikon ved **Udført**, fælles profilstruktur og aftaleknappernes tekster/varianter.
- Indlogget browserkontrol af Overblik, Rediger profil og aftalehandlinger på mobil, tablet og computer i lyst og mørkt tema.
- Test af lange navne/beløb, tomme data, indlæsning, fejl, tastaturnavigation, touch, åbning/lukning, scroll og usikrede ændringer.
- Afsluttende kontrol af fejl- og konsollog samt relevante tests; roadmap markeres kun færdig efter gyldig indlogget visuel kontrol.
