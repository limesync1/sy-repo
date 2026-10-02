# Ikongennemgang og stabil kortnavigation

## Resultat
- De 11 vedhæftede ikoner bruges konsekvent til arbejdsdag, statistik og rutekørsel.
- Ikoner på Om os, Tilbud, ruteplanlæggeren samt virksomhedens og medarbejderens sider får størrelser, luft og baggrunde, der passer til deres visning.
- Statistikfelter bruger ét fælles, roligt ikonformat uden beskæring eller tilfældige størrelsesspring.
- Rutekørslens kort kommer videre fra “Henter koordinater til kortet…” og viser kort eller en brugbar fejltilstand.

## Gennemførelse
1. Tilføj de 11 nye ikoner til det fælles illustrationsregister med én fast betydning pr. ikon.
2. Erstat de nuværende arbejdsdags-, statistik- og rutekørselsikoner med de nye filer.
3. Gennemgå ikonbeholdere på Om os, Tilbud, ruteplanlæggeren samt alle virksomhedens og medarbejderens sider; ret kun størrelse, luft, baggrund og beskæring.
4. Ensret statistikfelter gennem de delte panelkomponenter og lav lokale undtagelser kun, hvor indholdet kræver det.
5. Ret kortets koordinatforløb, så adresser geokodes robust, ventetilstanden afsluttes, og manglende koordinater giver en tydelig handling i stedet for en endeløs besked.
6. Kontrollér centrale sider og rutekørsel på mobil og desktop samt fejl og appens build.

## Teknisk
- SVG-filerne uploades som CDN-medier og bruges gennem `BrandedIllustration`.
- Eksisterende `PanelIcon`, `UiArtwork`, `StatIconTile` og semantiske farver bevares som fælles system.
- Almindelige kontrolsymboler som tilbage, luk, menu og pile ændres ikke.
