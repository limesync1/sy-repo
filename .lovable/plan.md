# Samlet fejlretning og designfærdiggørelse af ruteplanlæggeren

## Resultat
Ruteplanlæggeren får ét konsekvent, kompakt og professionelt design på computer, tablet og mobil. Knapper forbliver synlige efter brug, rutekort passer i kalenderdagene, datoer vises uden fejlstreger, og alle vinduer, menuer og handlinger bruger samme nye designsprog.

## 1. Ret rutekort og kalenderceller
- Fjern hover-afhængigheden, der skjuler rutekortets handlingsknapper, når fokus eller markør flyttes efter et klik.
- Gør de vigtigste handlinger permanent synlige; saml sekundære handlinger i en stabil menu uden layoutskift.
- Reducér rutekortenes faste minimumshøjde og indholdstæthed, så flere ruter passer naturligt i dagens sektion uden at blive afskåret eller presse kalenderen skæv.
- Fjern den utilsigtede linje over datotallet og ensret datoens normal-, hover-, valgt-, i dag- og fokusvisning.
- Sikr at loading, disabled, aktiv menu, optimering og fejl ikke ændrer kortets bredde eller får andre knapper til at forsvinde.

## 2. Ét design til alle vinduer og popups
- Omlæg **Stops på ruten**, **Rediger rute**, **Opret ny rute**, ruteforslag, historik, flyt/flet, tildeling, stopdetaljer og bekræftelser til de samme fælles byggeklodser.
- Brug ens overskrift, tæt indholdsafstand, scrollområde, sektioner, formularfelter og fast handlingslinje.
- Ensret knappers normal-, hover-, active-, valgt-, fokus-, disabled- og loadingtilstande i alle vinduer og popovers.
- Bevar den nuværende funktionalitet og de gældende regler om ingen synlige servicevarigheder eller udførelsestidspunkter.

## 3. Opret bestilling og servicekatalog
- Fjern kun ikonet fra overkategoriens overskrift i service-dropdownen, så den eksempelvis viser **FLYTTEHJÆLP** uden lastbil-ikon.
- Bevar de nuværende relevante ikoner på hver konkret service.
- Kontrollér dropdownens linjeføring, valgte services og mobilbredde uden at ændre bestillingslogikken.

## 4. Kompakt “Aftaler uden rute” på mobil
- Behold sektionen permanent på siden i stedet for som popup.
- Gør aftalekortene væsentligt lavere med kunde, service, adresse/status og centrale handlinger i et tæt, stabilt layout.
- Tilpas sektionens højde efter den ledige skærmplads, så kort ikke afskæres, og både aftaler og ruter kan ses og trækkes mellem områderne.
- Gør touch-mål tydelige uden at gøre selve kortene unødigt store; vis samme valg-, drag-, loading- og fejltilstande som på computer.

## 5. Hurtigere fordeling og rutevalg
- Ændr teksten **Vælg rute manuelt** til **Vælg rute** overalt.
- Åbn rutevalget med det samme og vis data løbende, frem for at lade adresseopslag og ruteforslag blokere vinduet.
- Genbrug allerede hentede ruter, koordinater og forslag, så gentagne åbninger ikke starter de samme opslag igen.
- Gør auto-fordeling hurtigere ved at undgå én fuld ventecyklus pr. aftale, behandle uafhængige opslag i kontrollerede parallelle grupper og samle opdateringen af visningen til sidst.
- Bevar kapacitetskontrol, rækkefølge, fejloversigt og mulighed for at fortryde, også når flere aftaler behandles samtidigt.

## 6. Kontrol
- Test klik på alle rutekortets handlinger og bekræft, at de øvrige knapper ikke forsvinder.
- Test tomme, normale og travle kalenderdage med flere rutekort samt datoens visning.
- Gennemgå alle ruteplanlæggerens dialoger, sheets, popovers og bekræftelser visuelt og funktionelt.
- Test service-dropdownen, **Vælg rute** og **Auto-fordel 3 aftaler** med realistiske data.
- Kontrollér den indloggede visning ved 1305 px computer, 768 px tablet og 375 px mobil, inklusive hover, tastaturfokus, touch, drag/drop, loading og fejl.

## Tekniske detaljer
- De nuværende handlingsknapper i kalenderens rutekort er bekræftet bundet til `opacity-0` og `group-hover`, hvilket erstattes af en stabil handlingszone.
- Rutekortets bekræftede faste minimumshøjde reduceres og suppleres med kontrolleret indhold/overflow pr. kalenderdag.
- Dialoger samles omkring de eksisterende fælles header-, sektion-, felt- og footer-mønstre i stedet for lokale varianter.
- Servicegruppens ikon fjernes fra kategorioverskriften; ikonet på den enkelte service bevares.
- Auto-fordelingens nuværende sekventielle opslag og gemninger optimeres med begrænset samtidighed og én samlet cacheopdatering, så dataintegriteten bevares.
