# Ensret medarbejderpanelets ruter, print og statistik

## Resultat
- Brug de to nye ikoner ved **Vælg arbejdsplads** og **Genopstart dagen**.
- Gør branche- og kategoriikoner større i virksomhedens indstillinger.
- Ensret aftaledetaljer og stopdetaljer med ruteplanlæggerens fælles modaldesign på Aftaler, Min dag og under rutekørsel.
- Ret teksten i Print ruter og genbrug samme printoplevelse i medarbejderpanelet i stedet for den gamle kvitteringsvisning.
- Forbedr Statistik med én stabil indlæsningsvisning og en kalender, der markerer arbejdsdage, rutedage og dage med indtjening.
- Ensret Start rute-ikonerne på Min dag.
- Gør rutekortet robust ved manglende koordinater med bedre adresseopslag, genforsøg og konkrete fejlbeskeder.

## Arbejdsgang
1. Tilføj de vedhæftede ikoner gennem projektets fælles asset- og illustrationssystem.
2. Opdatér de fælles modalrammer og genbrug dem alle relevante steder frem for at skabe parallelle varianter.
3. Genbrug ruteplanlæggerens printkomponent med medarbejderens egne rutedata og fjern den gamle medarbejder-printdialog.
4. Udvid Statistik-kalenderens dagmarkeringer og gør skeletonen identisk med den færdige sides struktur.
5. Ret kortets adresse- og koordinatflow, så gyldige adresser vises og fejl kan genforsøges uden at forlade ruten.
6. Kontrollér Min dag, Statistik, Aftaler, print og rutekørsel på mobil og computer.

## Tekniske detaljer
- Eksisterende `planner-overlay`-komponenter og fælles sektionslayout er designkilden for alle vinduer.
- Eksisterende rute-, stop- og arbejdsdagsdata bruges til kalenderens markeringer; der tilføjes ingen ny datamodel.
- Kortet beholder den interne Leaflet-visning og bruger forbedret geokodning/fallback uden eksterne kortlinks.
