# Plan: Samlet redesign af virksomheds- og medarbejderpanelet

## Mål
Genskab den tidligere, naturlige typografi og saml begge paneler i ét roligt, professionelt og responsivt designsystem. Funktioner og arbejdsgange bevares, mens hierarki, tæthed, tilstande og vinduer ensrettes.

## Første rettelser
1. **Genskab den tidligere skrifttype overalt**
   - Fjern de nyligt tilføjede Sora- og Manrope-skrifttyper.
   - Brug igen Inter med den eksisterende systemfont-reserve på offentlige sider, i virksomhedspanelet, medarbejderpanelet og rutekørslen.
   - Kontrollér tekstbredder, knapper og overskrifter efter skiftet, så intet bliver skåret eller flytter sig.

2. **Ret “Kontakt medarbejder” i “Rediger rute”**
   - Udvid medarbejderdata i renteredigereringen med det eksisterende profilbillede.
   - Vis et rundt medarbejderbillede i både det valgte felt og listen; brug tydelige initialer som reserve, når intet billede er uploadet.
   - Forenkle sektionen til én kompakt modtagerlinje, ét beskedfelt og én tydelig sendehandling.
   - Bevar ulæst markering på den valgte rute eller aftale.

3. **Genskab et roligt “Rediger rute”-vindue**
   - Fjern den blå/teal venstrekant, som aktuelt kommer fra renteredigeringsvinduets særlige kantregel.
   - Ensret top, indhold, sektioner og fast handlingsområde med de øvrige vinduer.
   - Reducér unødvendige bokse-i-bokse, og skab et tydeligt forløb: navn → farve → dato → medarbejderkontakt → ruteoplysninger → handlinger.
   - Bevar farvevalg som rutedata uden at bruge rutefarven som dekorativ modalramme.

## Samlet paneldesign
4. **Etabler ét fælles panelsystem**
   - Brug samme typografiske skala, mellemrum, hjørner, kanter, skygger, ikoner og kontrolhøjder på tværs af begge paneler.
   - Bevar den let lysegrå navigation, de neutrale arbejdsflader og en afdæmpet marine/teal-identitet.
   - Brug accentfarven målrettet til valg, fokus og primære handlinger; succes, advarsel og fejl beholder deres semantiske farver.
   - Saml fælles byggeklodser for sidehoveder, statistik, sektioner, tomme tilstande, indlæsning, fejl og handlingslinjer.

5. **Virksomhedspanelet**
   - Ensret alle sider med samme sidehoved, værktøjslinjer, søgning, filtre, kort/lister og primære handlinger.
   - Standardisér hvornår detaljer åbner fra siden, og hvornår korte valg åbner centralt.
   - Ensret kunde-, medarbejder-, aftale-, service-, anmeldelses-, regnskabs-, indstillings-, import- og livechatvisninger.
   - Gør tabeller og tætte lister mobilvenlige uden skjulte handlinger eller vandret afskæring.
   - Lad indlæsningsvisninger have samme form som det indhold, der kommer frem, så siden ikke hopper.

6. **Medarbejderpanelet**
   - Ensret “Min dag”, statistik, livechat, arbejdspladsvalg, rutedetaljer, listekørsel og kortkørsel.
   - Giv almindelige sider samme lyse top og navigation; behold kun særskilt, fokuseret udtryk under aktiv rutekørsel.
   - Saml notifikationer i ét genkendeligt mønster med tydelig rute-/aftalekontekst og dansk handlingstekst.
   - Ensret feedback efter handlinger samt tomme, indlæste, fejl- og afsluttede tilstande.
   - Brug én fælles skærmgrænse for mobil/tablet, så navigation, kalender og vinduer ikke skifter adfærd ved forskellige bredder.

7. **Knapper, vinduer og tilstande**
   - Gennemgå alle knapper, menuer, dropdowns, popups, modaler og sidevinduer i begge paneler.
   - Ensret normal, hover, trykket, valgt, tastaturfokus, deaktiveret, indlæser, succes, advarsel og fejl.
   - Sørg for stabile mål, synlige handlinger og mindst 44 px trykflade på mobil, uden at computerudgaven bliver unødigt stor.
   - Fjern rå farver og lokale særregler, der omgår de fælles designværdier og mørk tilstand.

## Teknisk afgrænsning
- Arbejdet er en præsentationsændring; eksisterende forretningslogik og dataflows ændres kun, hvor medarbejderbilledet skal føres frem til den eksisterende kontaktsektion.
- De eksisterende semantiske farveværdier og fælles UI-elementer er fundamentet; lokale afvigelser samles eller fjernes.
- Det nuværende profilbilledefelt for medarbejdere genbruges. Ingen ny billedlagring er nødvendig.

## Verifikation
- Test de centrale arbejdsgange som indlogget virksomhed og medarbejder.
- Kontrollér lys og mørk visning ved 393 px, 768 px og 1280 px bredde.
- Kontrollér især renteredigerering, medarbejderfoto/reserveinitialer, dropdowns, handlingsområder, lange tekster, tastaturfokus og manglende vandret overlap.
- Kør typesikring, relevante tests og app-build, og ret alle nye fejl før afslutning.
