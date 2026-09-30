# Fælles navigation i virksomheds- og medarbejderpanelet

## Resultat
- Erstat de to separate panelrammer med den vedhæftede fælles `PanelShell`, så sidebar, topbar, mobil-drawer og indholdsbredden altid følger hinanden.
- Saml virksomhedspanelets navigation i én konfiguration, som bruges af desktop, drawer og mobilens bundnavigation.
- Brug den fælles bundnavigation i begge paneler med et “Mere”-ark til sekundære punkter.
- Indfør de vedhæftede, rolige sidebar-dele: arbejdspladsrække, fremdriftskort, profilmenu, enkel aktiv markering og kantplaceret sammenfoldningsknap.
- Opdatér sidebarens gemte tilstand, så den synkroniseres mellem faner og tastaturgenvejen ikke reagerer i formularfelter.

## Tilpasning til det eksisterende projekt
- Bevar alle nuværende props og eksisterende flows for DPA-godkendelse, kundeservice, notifikationer, arbejdspladsskift, rolle-skift og ruteplanlægning.
- Bevar ældre exports, som platformadministrationen stadig bruger; platformadministrationen migreres ikke i denne ændring.
- Justér den globale sidebarflade fra let grå til den nye hvide kortflade, mens mørk tilstand fortsat bruger den eksisterende mørke paneltoken.
- Bevar kundeserviceknappens mørke kontrast, så det eksisterende ikon forbliver tydeligt.

## Kontrol
- Tilføj og kør de vedhæftede tests for navigation og sidebarens gemte tilstand.
- Kontrollér virksomhedspanelet, ruteplanlæggeren og medarbejderpanelet på desktop samt mobil/tablet-drawer og bundnavigation.
- Kontrollér, at sammenfoldning, tooltips, “Mere”, arbejdspladsskift og aktivt menupunkt fungerer uden layoutskift.

## Teknisk
- Nye filer: fælles panelramme, fælles bundnavigation og virksomhedens navigationskonfiguration.
- Opdaterede filer: begge panelshells, sidebarens byggeklodser, collapse-hook og den semantiske sidebarbaggrund i global CSS.
- Ingen ændringer i forretningsdata, backend eller platformadministrationens navigation.
