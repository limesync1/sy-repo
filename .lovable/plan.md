# Tal-ikoner, header og forsidekort

## Det bygger jeg
- Bruger de vedhæftede statiske og animerede tal 1–4 som tydelige trin på `/tilbud` og **Bliv udbyder**; animationerne vises kun ved det aktuelle trin, mens resten er rolige statiske ikoner.
- Bruger de fem nye handlingsikoner i den fælles header til kunde-, virksomheds-, medarbejder- og adminpanel samt log ud, så de automatisk ses på forsiden og alle offentlige undersider.
- Justerer headerens knapper og mobilmenu, så ikoner, tekst og aktive valg er tydelige uden at gøre navigationen tung.
- Retter kortene i **Det siger kunderne** og **Find den rette branche**, så rammer og skygger ikke klippes ved hover, swipe eller forskellige skærmbredder.
- Gennemgår hele forsiden for kontrast, synlighed, fokusmarkeringer og mobil/desktop-opførsel.

## Tekniske detaljer
- Billedfilerne lægges i appens medielager; SVG-kilder konverteres til PNG, fordi de ellers kan blive hentet som filer i stedet for vist.
- Animationer respekterer brugerens indstilling for reduceret bevægelse.
- Til sidst kontrolleres forsiden, `/tilbud` og `/opret-virksomhed` på mobil og computer samt den aktuelle fejllog.
