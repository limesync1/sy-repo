# Bilen skal køre som en bil + optaget testtur

Der findes endnu ingen optagelser (0 optagede kørsler). Jeg kan ikke selv køre bil, så "rigtig kørsel" kræver din telefon. I stedet laver jeg en længere, realistisk testtur og gør bilens bevægelse mere bil-agtig.

## 1. Længere simuleret tur, afspillet i appen
- Ny testtur: Vistorpvej 30, Haderup → hele butiksruten → Bauhaus Herning, med motorvej-, by- og landevejsstrækninger.
- GPS-sporet laves som en rigtig telefon: 1 punkt pr. sekund, støj, rødt lys, rundkørsler, tunnel-hul, et spring på 150 m og iPhone uden retning.
- Sporet afspilles i appens rutekørsel (falsk GPS) og gemmes som en rigtig optagelse, så du kan åbne «Se optagelse» og se kortet.
- Jeg sender dig optagelseskortet som billede plus en kort rapport: hvor bilen afveg mere end 15 m.

## 2. Bilen bevæger sig som en bil
- **Fart ændres blødt:** acceleration og opbremsning har grænser, så bilen ikke rykker frem eller stopper brat.
- **Drejer i en bue:** retningen følger vejens kurve, ikke knæk i linjen, og drejer højst så hurtigt som en bil kan ved den fart.
- **Ingen drejning i stilstand:** står bilen stille, drejer den ikke.
- **Ingen baglæns kørsel**, undtagen ved bekræftet vending.
- **Glat rutelinje** i sving og rundkørsler, så bilen ikke følger hakkede hjørner.
- **Retningen ved start** kommes fra vejen, ikke fra et tilfældigt GPS-punkt.

## 3. Test
- Automatiske tests for acceleration, sving, rundkørsel, rødt lys og vending.
- Målbart krav: ingen sidelæns hop over 5 m, ingen drejning over 90°/s ved under 30 km/t.

## Hvad du kan gøre
Slå «Optag kørsel» til på serviceydere.dk og kør 2-3 stop. Så sammenligner jeg den rigtige tur med simuleringen.

## Tekniske detaljer
- `positionEngine.ts`: hastighedsmodel med maks. ±3 m/s² , kurvatur-baseret maks. vinkelhastighed (v/R), heading fra udglattet polylinje (`smoothPolyline`) med look-ahead 8-15 m.
- `scripts/simulate-drive.ts`: udvides med længere tur og gemmer sporet via `append_drive_trace` for Patrick's rute, så `DriveTraceDialog` viser det.
- Playwright afspiller sporet med mocket geolocation på reservekortet; screenshot af optagelseskortet til /mnt/documents.
- Vitest-scenarier i `__tests__/positionEngine.test.ts`.
