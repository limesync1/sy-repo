# Plan: Bysider for alle brancher i hele Danmark

## Status i dag
- Rengøring, flytning, håndværker og have har allerede sider for 15–18 byer, og alle 10 af de største byer er med.
- Vinduespudser og maler har nu sider for de 10 største byer.
- I alt er der ca. 90 bysider. Prisguider findes for 21 brancher, men 15 af dem har ingen bysider.

## Mål
Ca. 1.000 bysider fordelt på 20 brancher og 50 byer, bygget i fire bølger. Hver bølge måles i Google, før næste bølge sættes i gang. Så kan vi stoppe, hvis Google ser siderne som tynde kopier.

## Byer (50)
- **Bølge A, eksisterende 18:** København, Frederiksberg, Aarhus, Odense, Aalborg, Esbjerg, Randers, Kolding, Vejle, Horsens, Silkeborg, Herning, Roskilde, Helsingør, Næstved, Hillerød, Holstebro, Slagelse.
- **Bølge B, +16:** Viborg, Fredericia, Køge, Holbæk, Sønderborg, Svendborg, Hjørring, Frederikshavn, Haderslev, Skive, Ringsted, Nykøbing F, Aabenraa, Nyborg, Kalundborg, Ikast.
- **Bølge C, +16 forstæder og mindre byer:** Gentofte, Lyngby, Gladsaxe, Ballerup, Taastrup, Hvidovre, Greve, Ishøj, Birkerød, Farum, Skanderborg, Hedensted, Thisted, Grenaa, Middelfart, Struer.

## Brancher (20)
- **Har bysider:** rengøring, flytning, håndværker, have, vinduespudser, maler.
- **Nye (bruger de eksisterende prisguider):** elektriker, VVS, tømrer, murer, gulvlægger, kloak, skorstensfejer, skadedyr, varmepumpe, nyt tag, badeværelse, nye vinduer, anlægsgartner, algebehandling.

## Bølger
1. **Bølge 1:** Alle 6 brancher, der har bysider, udvides til de samme 18 byer. Vinduespudser og maler får 8 byer mere hver. Ca. 16 sider.
2. **Bølge 2:** 6 nye brancher med flest søgninger (elektriker, VVS, tømrer, murer, kloak, skadedyr) i de 18 byer. Ca. 108 sider.
3. **Bølge 3:** De sidste 8 brancher i de 18 byer, og alle 20 brancher udvides til bølge B-byerne. Ca. 464 sider.
4. **Bølge 4:** Bølge C-byerne for de brancher, der klarede sig bedst i bølge 2–3. Op til ca. 320 sider.

Før hver bølge tjekker jeg Search Console: bliver siderne indekseret, og får de visninger? Hvis under ca. 50 % af den forrige bølges sider er indekseret efter 3–4 uger, holder vi pause og forbedrer indholdet i stedet.

## Indholdet på hver side (så siden ikke bliver en kopi)
- Lokale priser i et interval, der passer til den landsdækkende prisguide og er justeret efter byens prisniveau.
- 2 tekster, der er unikke for byen og branchen: lokale boligtyper og en lokal faktor (fx kystklima, ældre byhuse, nybyggeri).
- Bydele og nabobyer, prisliste, fradragsregler for branchen, typiske opgaver og «Få 3 tilbud».
- Hvis platformen har virksomheder i den pågældende by og branche, vises de på siden. Det giver ægte lokalt indhold.
- Links: branchens prisguide → alle byer; hver byside → andre byer i branchen og andre brancher i samme by.

## Nye oversigtssider
- **Byside-hub pr. by**, fx «Serviceydere i Aarhus», med links til alle brancher i byen.
- **Branche-hub**, fx «Elektriker i hele Danmark», med links til alle byer i branchen.
- Footer og «Find virksomhed» linker til hubsiderne.

## Ærlige forbehold
- Jeg skriver de lokale tekster og prisintervaller selv. De bygger på jeres prisguider, ikke på målinger i hver by. Du skal kunne rette dem.
- Google straffer mange sider, der ligner hinanden. Derfor er bølgerne og pausen ved for lav indeksering vigtige.
- Det tager 1–3 måneder, før bysiderne for alvor giver besøgende.

## Teknisk
- Én fælles bysideskabelon og et register pr. branche (`slug`, pris-felter, labels, kategori, fradrag, prisguide-sti), som erstatter de 4 separate side-komponenter. De gamle adresser (`/rengoering/:city` osv.) bevares uændret.
- Bydata (navn, region, postnumre, bydele, nabobyer, prisfaktor) ligger ét sted og deles af alle brancher. Branchespecifikke tekster ligger i branchens datafil.
- Nye ruter `/{branche}/:city` + hubs `/by/:city` og `/{branche}`, lazy-loadet; uregistrerede kombinationer sender videre til `/virksomheder?category=…`.
- Sitemap, prerender-titler, `site-paths` og `audit-orphans` genereres fra registeret; `seo-check` tjekker dubletter og unikke titler/beskrivelser.
- Test: hver kombination giver unik titel, beskrivelse og canonical; ingen to sider deler intro-tekst.
- Hver bølge pinges til IndexNow, og der sendes en indekseringsanmodning til Search Console for hubsiderne.
