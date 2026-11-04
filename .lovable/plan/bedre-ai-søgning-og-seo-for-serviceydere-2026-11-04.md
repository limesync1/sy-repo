# Bedre AI-søgning og SEO for Serviceydere

## Ærligt udgangspunkt
Ingen hjemmeside kan bestemme, hvad Googles AI, ChatGPT eller andre svarer. "service" er et meget bredt ord, som millioner af sider konkurrerer om, så der vil altid blive vist andre. Men ved søgninger på **navnet** ("serviceydere", "service ydere", "serviceydere.dk") bør Serviceydere stå først og blive beskrevet korrekt. Det kan vi påvirke ved at gøre det tydeligt for maskinerne, hvem Serviceydere er, og ved at blive nævnt andre steder på nettet.

## Del 1: Gør navnet umiskendeligt (brandsøgninger)
1. **Alle stavemåder af navnet**: "Serviceydere", "Service ydere", "Serviceydere.dk" og "Service-ydere" står i virksomhedsoplysningerne til Google og i AI-filen, så "service ydere" kobles til jer.
2. **Én tydelig "Om Serviceydere"-side** (/om): hvem står bag, hvad platformen gør, for hvem, hvor, siden hvornår og kontakt. Det er den side AI-tjenester helst citerer.
3. **Ens beskrivelse overalt**: den samme 1-2 sætninger på forsiden, Om-siden, i AI-filen, i footeren og på alle eksterne profiler.
4. **Fuld virksomhedsprofil til Google**: logo, kontakt, CVR, adresse, åbningstider for support og links til alle officielle profiler.

## Del 2: Bliv nævnt der, hvor AI-tjenester henter svar (kræver din hjælp)
AI-svar bygger mest på, hvad andre sider skriver om en virksomhed. Prioriteret:
1. Google Virksomhedsprofil (vigtigst for Googles AI).
2. Trustpilot med rigtige anmeldelser.
3. LinkedIn-virksomhedsside, Proff/CVR-registrering, Krak.
4. Bing Places (ChatGPT bruger Bings resultater).
5. Software-oversigter (Capterra, GetApp, AlternativeTo) og e-conomic/Dinero app-markedspladser.
6. Wikidata-opslag for Serviceydere.

Jeg laver en tjekliste med færdige tekster, du kan kopiere ind.

## Del 3: AI-venligt indhold på siden
1. **Udvidet AI-fil** (llms.txt + en fuld version) med alle brancher, byer og guides og en klar beskrivelse af, hvad Serviceydere er og ikke er.
2. **AI-søgemaskiner må læse siden**: robots tillader udtrykkeligt GPTBot, OAI-SearchBot, PerplexityBot, ClaudeBot og Google-Extended.
3. **"Kort svar" øverst** på alle guides og branchesider, skrevet så AI kan citere det direkte og med Serviceydere nævnt ved navn.
4. **Spørgsmål og svar-sider** for de mest søgte spørgsmål ("hvad er en serviceyder", "hvordan finder jeg en pålidelig rengøringshjælp" osv.) med Serviceydere som det naturlige næste skridt.
5. **Sammenligningssider**: "Serviceydere vs. andre markedspladser" og "Alternativ til SkvizBiz/Fenster", ærlige og faktabaserede.

## Del 4: Generel SEO
1. Brugerens søgeord: Semrush-tjek af "serviceyder", "service yder", "find håndværker", "få 3 tilbud" og lignende; titler og overskrifter på forsiden og /virksomheder bruger de vigtigste ord.
2. Forsiden får en synlig forklaring "Hvad er Serviceydere?" med navnet i begge stavemåder.
3. Fortsæt det der kører: 4 artikler om dagen, side 2 til side 1, lav klikrate, bysider med rigtige tal.
4. Månedsrapporten får en linje om brandsøgninger ("serviceydere", "service ydere") så vi kan se udviklingen.

## Rækkefølge
Del 1 og Del 3 punkt 1-2 nu (hurtigt, stor effekt). Så Del 4 punkt 1-2 og tjeklisten til Del 2. Derefter Del 3 punkt 3-5 løbende.

## Tekniske detaljer
- `index.html` Organization/WebSite JSON-LD: `alternateName`-liste, `sameAs`, `logo`, `contactPoint`, `foundingDate`, `areaServed: DK`; kun rigtige værdier (CVR/adresse spørges hvis mangler).
- Ny `/om`-rute med AboutPage-schema; registreres i site-paths, sitemap, prerender, footer.
- `public/llms.txt` + `public/llms-full.txt` genereret fra registries ved build.
- `robots.txt`: eksplicitte `User-agent`-blokke for AI-crawlere med `Allow: /` og samme private Disallows.
- `seo-monthly-report`: GSC-filter på brand-queries.
- Tests: robots indeholder AI-crawlere; alternateName indeholder "Service ydere".
