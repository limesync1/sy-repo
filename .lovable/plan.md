# Plan: Rigtige Meta-leads, virkende lead-knapper og fuld kvalitetsgennemgang af begge paneler

Planen er delt i 3 dele. Del 1 og 2 laves først. Del 3 er en stor gennemgang side for side, med screenshots af hver side på computer (1280 px), tablet (768 px) og mobil (390 px) i både lys og mørk visning.

---

## Del 1 – Meta: rigtige test-leads fra Facebook og Instagram

App ID, App Secret og webhook-token er nu gemt i Serviceydere, så forbindelsen kan testes for alvor.

1. **Tjek forbindelsen fra start til slut**: tryk "Forbind Meta" på Leads, log ind, vælg side og formularer, og bekræft at forbindelsen gemmes.
2. **Abonnér siden på leads automatisk**: når du vælger en Facebook-side, tilmelder Serviceydere selv siden til nye leads hos Meta, så du ikke skal gøre det manuelt.
3. **Knap "Send test-lead"** i Meta-sektionen: åbner Metas officielle test-værktøj til den valgte side/formular, og Leads-siden viser "Venter på test-lead…" indtil det lander (op til 2 minutter), derefter en grøn bekræftelse.
4. **Knap "Hent seneste leads nu"**: henter manuelt leads fra de valgte formularer, hvis et lead er gået tabt (fx hvis webhook ikke nåede frem).
5. **Konto og kilde på hvert lead**: Facebook- eller Instagram-mærke, sidens/kontoens navn og billede, formularnavn og kampagne vises i indbakken og i lead-vinduet.
6. **Webhook-status**: Meta-sektionen viser "Sidst modtaget lead" og en tydelig advarsel, hvis Meta ikke har sendt noget, eller hvis adgangen er udløbet ("Forbind igen").
7. **Trin-for-trin guide inde i siden** (foldbar), der matcher Meta-kontrolpanelet: Appdomæner, Facebook Login, returadresse, brugssituation med leads_retrieval, Webhooks (Page → leadgen) og App Review.
8. **Ærlig begrænsning**: indtil Meta har godkendt tilladelserne i App Review, virker det kun for konti med en rolle i Meta-appen. Det vil siden også forklare.

## Del 2 – "Send som mail", "Kopier" og "Gem udkast" skal virke

Årsager fundet i koden:
- "Send som mail" åbner kun dit eget mailprogram via et mailto-link. Inde i forhåndsvisningen bliver det blokeret, og uden mailprogram sker der intet. Knappen er også grå, når kunden ikke har e-mail, uden at forklare hvorfor.
- "Kopier" har ingen fejlhåndtering; når browseren nægter adgang til udklipsholderen, sker der ingenting.
- "Gem udkast" melder "gemt", selvom intet blev gemt, hvis databasen afviser ændringen stille.

Rettelser:
1. **"Send som mail" sender rigtigt fra Serviceydere** via den eksisterende e-mailtjeneste: emne + tekst, svar-til = virksomhedens e-mail, logges i leadets historik, status skifter til "Kontaktet". Bekræftelsesvindue før afsendelse viser modtager og emne.
2. Ekstra valg "Åbn i eget mailprogram" bevares som sekundær mulighed.
3. **Kopier**: virker med reserveløsning, når browseren blokerer, og kopierer emne + tekst. Tydelig fejlbesked hvis det slet ikke kan lade sig gøre.
4. **Gem udkast**: gemmer også emnefeltet, bekræfter at ændringen faktisk er gemt, viser "Gemt kl. 02:15", advarer om ikke-gemte ændringer når vinduet lukkes, og gemmer automatisk efter et par sekunders pause.
5. Knapper viser indlæsning, er låst mens de arbejder, og grå knapper forklarer hvorfor (fx "Kunden har ingen e-mail").

## Del 3 – Fuld gennemgang af virksomheds- og medarbejderpanelet

For hver side: screenshots i 3 bredder og lys/mørk, klik alle knapper, menuer, vinduer og formularer igennem som indlogget DK Renfyn og som medarbejder. Alle fund rettes. Faste krav på hver side:

- **Fejlhåndtering**: ingen blanke skærme; hver side har fejlvisning med "Prøv igen"; alle handlinger viser dansk succes-/fejlbesked; rå tekniske fejl oversættes til dansk.
- **Indlæsning**: skeletter med samme form som indholdet, ingen hop.
- **Tomme tilstande**: forklaring + næste handling.
- **Formularer**: dansk validering ved feltet, låst knap under gem, ingen dobbelt-indsendelse, advarsel om ikke-gemte ændringer.
- **Mobil**: ingen vandret scroll, trykflader mindst 44 px, intet afskåret tekst, vinduer passer på skærmen og kan scrolles.
- **Konsistens**: samme sidehoved, statistik-kort, knapper, ikonstørrelser, afstande og vindueopbygning; ingen engelske tekster.
- **Mørk visning**: korrekt kontrast, ingen hårdkodede farver.
- **Tastatur**: synligt fokus, Esc lukker vinduer, Enter sender formularer.

### Virksomhedspanelet – side for side
1. **Navigation**: sidebar, sammenfoldning, mobilmenu, bundmenu, panel-skift, aktiv markering, brugermenu.
2. **Overblik**: statistikker, Næste skridt, genveje, tal der passer med data.
3. **Kom godt i gang**: trin, fremdrift, at trin markeres korrekt.
4. **Services**: opret/rediger/slet, prisberegner-trin, "Tilføj trin", AI-beskrivelse, billeder, kategorier.
5. **Aftaler / ruteplanlægger**: kalender, træk-og-slip, rediger rute, kontakt medarbejder, fortryd udført, mobilvisning, konflikter.
6. **Leads**: indbakke, filtre, status, opfølgning, tidsvælger, lead-indstillinger, Meta-sektion (Del 1–2).
7. **Kunder**: liste, søgning, privat/erhverv, kontakter, dokumenter, notifikationer, rediger og slet.
8. **Medarbejdere**: opret, invitér, fravær, kompetencer, arbejdstider, profilbillede/initialer.
9. **Anmeldelser**: liste, svar, tomme tilstande.
10. **Livechat**: samtaler, skabeloner, ulæste, mobil.
11. **Regnskab**: integrationer (e-conomic, Dinero, Zenegy), synkstatus, fejlkø, fakturamenu.
12. **Dataimport**: upload, kortlægning af kolonner, fejlrapport.
13. **Indstillinger**: profil, konto, beskeder, åbningstider, helligdage, abonnement, farezone/slet virksomhed.
14. **Bannere**: prøveperiode, databehandleraftale, genaktivering.

### Medarbejderpanelet – side for side
1. **Vælg arbejdsplads**: valg, ikon, flere virksomheder.
2. **Min dag**: start/genstart arbejdsdag, tidsregistrering HH:MM:SS, dagens ruter, notifikationer.
3. **Rutedetaljer**: stopkort, kontakt, noter, åbningsvalg tjekliste/kort.
4. **Rutekørsel – tjekliste**: start/afslut aftale, markér uden tid, fremdrift, offline-kø.
5. **Rutekørsel – kort**: GPS, navigation, knapper, batterivenlighed.
6. **Statistik**: tal, perioder, tomme tilstande.
7. **Livechat**: beskeder, ulæste, mobil.
8. **Udskriv rute**: layout på papir.

### Rapport til dig
Efter hver side får du en kort liste: hvad der blev fundet og hvad der blev rettet, med før/efter-screenshots af de vigtigste ændringer. Fund der kræver din beslutning (fx ændring af en arbejdsgang) samles og stilles som spørgsmål i stedet for at blive ændret på egen hånd.

---

## Tekniske detaljer
- Meta: ved sidevalg kalder serveren `POST /{page_id}/subscribed_apps?subscribed_fields=leadgen` med sidens token; ny server-handling "sync" henter `/{form_id}/leads` og upserter via samme normalisering som webhook (onConflict source,external_lead_id). Formularnavn hentes og gemmes i `source_metadata`. Realtime på `quote_request_matches` driver "Venter på test-lead".
- E-mail: ny edge function `send-lead-reply` (auth + ejerskabstjek via RLS), bruger eksisterende transaktionel e-mailopsætning, logger i `email_send_log` og `order_proposal_history`/lead-noter; `ai_draft_subject`-kolonne tilføjes via migration.
- Kopier: `navigator.clipboard` med try/catch og `execCommand('copy')`-reserve. Gem: `.select()` efter update for at opdage 0 rækker.
- Gennemgang: Playwright-scripts pr. side med session-injektion, screenshots i `/tmp/browser/audit/`, konsol- og netværksfejl logges; typecheck, tests og build køres efter hver blok.
- Ingen ændring af forretningsregler, roller eller tidsregistreringens præcision.
