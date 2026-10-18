# Grundig gennemgang og redesign af alle vinduer og mobilskærme

Målet: Ingen vinduer (modals, skuffer, bekræftelser) må føles forældede, for små, overlappe bundmenuen eller være svære at bruge på mobil. Der er ca. 69 filer med vinduer – alle gennemgås, ikke kun ruteplanlægningen.

## 1. Fuld kortlægning først (ingen ændringer)
- Lav en liste over hvert vindue: hvor det åbnes, størrelse, titel, knapper, rulning.
- Tag skærmbilleder af hvert vindue ved 390 px (mobil), 768 px (tablet) og 1280 px, lyst og mørkt tema, indlogget på en rigtig virksomhed (DK Renfyn) og som medarbejder.
- Notér konkrete fejl pr. vindue: afskåret indhold, knapper under bundmenu eller tastatur, små trykflader, utydelig kontrast, rodet rækkefølge, manglende luk-knap, engelske tekster.

## 2. Én fælles vinduesstandard
- Mobil: vinduer åbner som næsten-fuldskærm fra bunden med afrundede hjørner, fast titel øverst, rulbart indhold, fast knaplinje nederst over bundmenu/sikker zone.
- Tablet/computer: næsten-fuldskærm til store vinduer (som nu), kompakt centreret til små bekræftelser.
- Samme opbygning som "Opret bestilling" og "Ny rute": illustration/ikon uden ramme, tydelig titel, kort forklaring, primær knap til højre (mobil: fuld bredde), "Annullér" sekundær.
- Alle trykflader mindst 44 px, felter uden auto-zoom, dansk tekst, god kontrast i mørkt tema.

## 3. Udrulning i grupper
1. Ruteplanlægning (ca. 25 vinduer: ruteredigering, stopdetaljer, flyt/flet/slet, udskrift, optimering, forslag, sygdom, historik, live-position m.fl.).
2. Aftaler, bestillinger, fakturaer, kreditnota, services.
3. Kunder, medarbejdere, leads, regnskab, indstillinger.
4. Medarbejderpanelet (stop, annullering, profil, noter).
5. Offentlige sider (kurv, bestilling, login).

## 4. Mobilskærme ud over vinduer
- Gennemgå ruteplanlægningens topbar, dagsoversigt og ruteliste igen på rigtig data, plus begge panelers navigation og sidehoveder.

## 5. Kontrol
- Efter hver gruppe: nye skærmbilleder ved de tre bredder og begge temaer, sammenlignet med kortlægningen.
- Tests for fælles vindueskomponent (luk, fast knaplinje, rulning).
- Intet ændres i priser, aftaler, gentagelser eller regnskab.

## Teknisk
- Udvid `src/components/ui/dialog.tsx`/`sheet.tsx` med en fælles `ResponsiveModal` (Drawer på mobil, Dialog ellers) med `ModalHeader`, `ModalBody`, `ModalFooter`; respekterer `--panel-bottom-clearance` og `env(safe-area-inset-bottom)`.
- Migrér vinduerne til komponenten gruppevis; `AlertDialog` bevares til bekræftelser men får samme styling.
- Playwright-script der åbner hvert vindue og gemmer skærmbilleder pr. bredde/tema.
