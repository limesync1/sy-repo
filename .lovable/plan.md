# Plan: Flere virksomhedskunder via SEO + robust ruteoptimering

## Del 1 – Flere kunder som SPAREGODT ApS

SPAREGODT fandt os sådan: Google-søgning om vinduespudsning → blogartikel → software-/Fenster-sammenligning → kom tilbage næste dag og oprettede sig. Planen gentager den vej for alle brancher.

### 1. Mål hvad der virker (først)
- Gem kilde og første landingsside på hver ny virksomhed (fx "blog/vinduespudser-eller-selv"), så admin kan se, hvilke artikler der skaffer kunder.
- Vis i den månedlige SEO-rapport: "Nye virksomheder pr. artikel/branche".

### 2. Byg flere "SPAREGODT-veje"
- Find via Search Console + Semrush de artikler, som allerede får visninger fra branchefolk (vinduespudsning, rengøring, have, fliser, tagrens, snerydning).
- Giv hver af dem en tydelig boks: "Driver du selv et firma? Se hvordan andre vinduespudsere styrer ruter" → branchens softwareside → sammenligning → "Opret gratis profil" / 30 dages prøve.
- Ny artikeltype i SEO-motoren for virksomhedsejere: "Bedste ruteprogram til vinduespudsere", "Sådan prissætter du rengøring", "Skift fra [konkurrent]" – én pr. branche, med link til finderen og sammenligningerne.

### 3. Gør "Kun profil" til lokkemaden
- På hver by-/branchesside: "Er du [branche] i [by]? Kom på listen gratis" → gør det let at blive fundet og senere opgradere.
- Virksomhedsprofiler bliver selv SEO-sider (navn + by + service), som giver flere sider i Google.

### 4. Få dem tilbage
- Mange kommer igen næste dag. Tilføj "Send mig linket på mail" / gem påbegyndt oprettelse, og en venlig opfølgningsmail efter 1 dag, hvis oprettelsen ikke blev færdig (kun med samtykke).

### 5. Omtale og links
- Liste over danske brancheforeninger, kataloger og fora (fx vinduespudser-/rengøringsgrupper), tjekkes og gemmes i markedsføringsnoter, med færdige beskeder du selv sender.

## Del 2 – Giver ruteoptimeringen mening ved trafik og vejr?

Ærligt svar: algoritmen er god til at finde den korteste rækkefølge, men den kender i dag kun vejnettet + et fast myldretidstillæg. Den ved ikke om kø, uheld, vejarbejde, sne eller glatføre. Det betyder: rækkefølgen er stadig næsten altid fornuftig (dårligt vejr gør typisk alle veje langsommere), men ankomsttider kan skride.

Forbedringer:
1. **Vejrtillæg**: Vi har allerede rutevejr. Ved sne/is/kraftig regn/storm ganges køretider automatisk med fx 1,15–1,4, og der vises "Dårligt vejr – ekstra køretid lagt ind".
2. **Lær af virkeligheden**: Brug medarbejdernes faktiske tider (start/slut på stop) til at lære reelle køre- og opgavetider pr. område og tidspunkt, i stedet for faste antagelser.
3. **Genberegn undervejs**: Knap i kørselsvisningen "Planlæg resten af dagen igen" fra medarbejderens nuværende position, når de er forsinket. Låste/udførte stop røres ikke.
4. **Buffer**: Valgfri sikkerhedsmargin (fx 10 %) i indstillinger, så tidsvinduer holder selv ved forsinkelser.
5. **Advarsel i stedet for stille fejl**: Hvis en dag ikke kan nås pga. vejr/forsinkelse, vises hvilke stop der risikerer at blive for sent, så de kan flyttes.
6. **Live trafik (valgfrit, koster penge)**: Google Routes med trafik kan bruges til den endelige tidsberegning. Kræver jeres Google-nøgle og giver løbende omkostning – kun hvis I ønsker det.

Alt forbliver uden AI og med "aldrig dårligere end nuværende rækkefølge".

## Tekniske detaljer
- Kilde/landingsside: gem first-touch (referrer, utm, landing path) i browser ved første besøg og skriv til virksomhedens række ved oprettelse.
- Vejrfaktor: ny parameter i optimize-route fra eksisterende stop-vejrprognose; test at faktor >1 øger tider men ikke ændrer gyldighed.
- Lærte tider: aggregat af tidsregistrering pr. business/ugedag/time; fallback til nuværende model.
- Genberegning: kald optimize-route med kun resterende stop og startpunkt = GPS-position.

## Rækkefølge
1. Måling (Del 1.1) og vejrtillæg + buffer (Del 2.1, 2.4)
2. Artikel→software-veje og nye ejer-artikler
3. Genberegn undervejs og advarsler
4. Lærte tider, profil-SEO, opfølgningsmail, omtale
5. Live trafik kun hvis du siger ja
