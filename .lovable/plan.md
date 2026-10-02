# Bedre print af ruter

## Resultat
Printvinduet bliver et samlet arbejdsområde, hvor virksomheden vælger én dato eller et sammenhængende datointerval, bestemmer hvilke oplysninger der skal med, ser resultatet med det samme og derefter printer eller gemmer som PDF.

## Ændringer
- Erstat den enkle dagsvisning med et overskueligt vindue i to dele: valg til venstre og live-forhåndsvisning til højre; på mobil står de under hinanden.
- Tilføj datovalg med “Én dag” og “Flere dage”, dansk kalender, hurtigvalg for i dag/denne uge og en tydelig opsummering af perioden.
- Vis alle ruter på de valgte datoer, grupperet pr. dag og rute, med klar sideopdeling i print/PDF.
- Tilføj til/fra-valg for medarbejder, telefon, adresse, aftale/service, noter, tider, varighed, startadresse, distance og rutefarve samt et kompakt layout.
- Tilføj en kort opsummering med antal valgte dage, ruter og stop, og forklar tomme datoer tydeligt.
- Genbrug de eksisterende panelvinduer, knapper, kalender og semantiske farver, så udtrykket passer til resten af ruteplanlæggeren.
- Bevar tastaturgenvejen og de eksisterende indgange til print.

## Tekniske detaljer
- Printvinduet modtager hele den allerede indlæste kalenderperiode i stedet for kun dagens filtrerede ruter.
- Printmodellen udvides med dato, startadresse, distance, tider, varighed og serviceoplysninger, som allerede findes på ruter og stop.
- Browserens printvisning isoleres fortsat fra resten af siden og får stabile A4-sideskift uden at dele et rutekort uhensigtsmæssigt.
- Valg gemmes lokalt på enheden, så næste print bruger de seneste indstillinger.

## Kvalitetskrav
- Datointerval og alle indholdsvalg skal ændre forhåndsvisningen med det samme.
- Printet skal være læsbart i A4, uden overlappende tekst eller afskårne ruter.
- Kontrolleres med rigtige rutedata på desktop og mobil samt med én dato, flere datoer og en tom periode.
