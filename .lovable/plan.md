# Rutevalg, fælles ankomsttid og et ægte natkort

## Forbedringer
- Gør **Hvordan vil du køre ruten?** enklere: to tydelige valg, ens ikonstørrelse, kortere tekst og god plads til lukkeknappen. Behold de nye ikoner og det fælles modaldesign; ingen ekstra bekræftelse eller strømlabels.
- Lad kørselsguide og tjekliste bruge samme ankomstinformation for samme stop. Registreret ankomst vises identisk, og seneste beregnede ankomst fra guiden følger med ved skift til tjeklisten. Skeln tydeligt mellem beregnet og faktisk ankomst; opfind aldrig et tidspunkt, hvis der mangler position eller rutedata.
- Erstat farvefilteret på det lyse kort med en rigtig mørk kortstil med tydelige veje, vejnavne og adresser. Behold den blå rutelinje og stopmarkørerne. Kontroller leverandørens adgang og anvendelsesvilkår; vis en konkret fejl og et dæmpet reservekort, hvis natkortet ikke kan hentes.
- Kontroller lys/mørk visning af rutevalget, kørselsguiden, tjeklisten, stopvinduet og afslutningen på telefonstørrelse.

## Kontrol
- Sammenlign starttid, køretid og ankomst for samme stop før og efter skift mellem visningerne, inklusive genindlæsning og manglende lokationstilladelse.
- Brug isolerede testdata til Udført → Fortryd → Udført og sammenlign stopnummer, udførelsesnummer og indtjening før/efter. Eksisterende kundeaftaler ændres ikke.
- Tag mobilskærmbilleder af dialog, natkort, tjekliste og stopvindue; kontroller synlige knapper, læsbar tekst og fejlbeskeder.
- **Rigtig bilkørsel og hørbar lyd på en fysisk telefon kræver dig.** Browserens positionssimulation er ikke en biltest og bliver ikke omtalt som sådan.

## Tekniske detaljer
- Fælles, stopafgrænset ankomsttilstand med øjeblikkelig opdatering efter registrering, tidsstempel på beregninger og udløb af gamle værdier.
- Tjeklisten monterer fortsat ikke Leaflet eller løbende GPS. Den viser den fælles registrerede ankomst og den seneste gyldige beregning, ikke et selvstændigt planlagt tidspunkt forklædt som live-ankomst.
- Kortflisernes fejl håndteres særskilt fra adresseopslag og GPS. Ingen privat kortnøgle i klientkode.
