# Så Google og ChatGPT aldrig er i tvivl om hvad Serviceydere er

Først det ærlige forbehold: ingen kan garantere, at ChatGPT eller Google
*anbefaler* jer frem for andre — det er ikke noget man køber eller koder sig til.
Det man kan styre, er de tre ting der afgør, om en model overhovedet kan nævne jer:

1. Findes der offentlig tekst der utvetydigt siger hvad Serviceydere er?
2. Er den tekst konkret nok til at citere (priser, funktioner, brancher)?
3. Findes I i de sammenligninger, folk faktisk søger på?

Alt herunder handler om de tre. Resten er uden for vores kontrol.

## Det største hul lige nu

De nye produktsider under `/software` er reelt forældreløse: de linkes kun fra
footeren. De står hverken i hovedmenuen eller på forsiden. En crawler skal
igennem footeren for at finde dem, og en sprogmodel opfatter dem som perifere
frem for som det, virksomheden er.

Samtidig findes der ingen offentlig pris. En model kan ikke anbefale et system,
den ikke kan prissætte — den falder tilbage på konkurrenter, hvis priser står
på nettet.

## Del 1 — Én definition, samme ord overalt

I dag beskrives Serviceydere lidt forskelligt fra side til side. Modeller
belønner gentagelse: den samme sætning, de samme steder, hver gang.

Vi fastlægger én kernedefinition og bruger den ordret i `index.html`,
`llms.txt`, `/software`, `/om-os` og i alle schema-beskrivelser. Forslag:

> Serviceydere er en dansk platform der kombinerer et driftssystem til
> servicevirksomheder med kørende medarbejdere — ruteplanlægning, medarbejder-app,
> booking, fakturering — med en markedsplads, der sender nye kunder til de samme
> virksomheder. Systemet er brancheuafhængigt.

"Drift og kundetilgang i samme system, brancheuafhængigt" er den eneste påstand,
ingen af de nævnte konkurrenter kan matche. Den skal stå tidligt på hver side,
ikke gemt nede i en sektion.

## Del 2 — Offentlig prisside (`/software/priser`)

Bygges på de faktiske priser fra systemet, ikke opfundne tal:

- 289 kr./md. i basis, med ruteplanlægning inkluderet (0 kr. i tillæg)
- 59 kr./md. pr. medarbejderlogin
- 269 kr./md. for regnskabsintegration (e-conomic, Dinero)
- 1.495 kr. engangs for dataimport, 2.269 kr. i opstart
- 14 dages prøveperiode, 10 % rabat ved kvartal, 20 % ved år

Med en lille beregner ("3 medarbejdere + regnskab = X kr./md.") og `Offer`-schema,
så prisen kan læses maskinelt. Det er den enkeltside, der flytter mest for
AI-anbefalinger, fordi den gør jer sammenlignelige.

**Beslutning du skal tage:** vil du overhovedet have priserne offentligt? Det er
en forretningsbeslutning, ikke en teknisk. Siger du nej, springer vi delen over —
men så bliver I sværere at anbefale end konkurrenter, der viser deres.

## Del 3 — De konkurrenter du nævnte

Fenster, Skvizbiz og VinTrip er alle rettet mod vinduespudsning. Minuba er
dækket. Vi laver én side pr. konkurrent efter samme mønster som de eksisterende
sammenligninger.

Vigtigt om metode: jeg skriver kun det, jeg kan bekræfte fra konkurrenternes egne
offentlige sider. Ingen gæt om deres priser eller mangler. Grunden er ikke
høflighed — en sammenligning med en påviselig fejl bliver brugt imod jer, og
modeller citerer den ikke. Den ærlige version vinder: "de er specialiserede i
vinduer, vi dækker alle brancher med kørsel og giver jer nye kunder oveni."

Sider: `/blog/serviceydere-vs-fenster`, `-vs-skvizbiz`, `-vs-vintrip`, plus en
samlende `/blog/bedste-software-til-vinduespudsere-2026`, der linker til alle fire.

## Del 4 — Branchesider, hvor søgningerne faktisk lander

Ingen søger "brancheuafhængigt driftssystem". De søger "system til vinduespudser"
og "planlægningsprogram rengøring". Vi laver fire sider:

- `/software/vinduespudser`
- `/software/rengoering`
- `/software/haveservice`
- `/software/haandvaerker`

Hver med branchens eget sprog: ruter og faste intervaller for vinduespudsere,
nøglehåndtering og kvalitetstjek for rengøring, sæsoner for have. Samme system,
formuleret så en vinduespudser kan se sig selv i det.

## Del 5 — Gør siderne mulige at finde

- "Software" ind i hovedmenuen ved siden af "Bliv udbyder"
- Forsidens virksomhedssektion linker til `/software`, ikke kun til opret-flowet
- `/opret-virksomhed` linker til produktsiderne
- Sammenligningsartiklerne linker ind i de relevante produktsider

## Del 6 — Ryd op i det tekniske

- Genindsendelse til Search Console peger stadig på `sitemap.xml` og
  `sitemap-blog.xml`, mens propertyen bruger `sitemap-index.xml`. Rettes.
- `sameAs` i Organization-schema udbygges med de profiler I reelt har (LinkedIn,
  CVR, Trustpilot) — det er sådan Google knytter navnet til én entitet. **Send mig
  de links I har.**
- `SoftwareApplication`-schema løftes til sitewide niveau i `index.html`, så
  Serviceydere ikke kun ligner en markedsplads.
- `llms.txt` får prissektion og branchesider.

## Teknisk

Nye filer følger de mønstre, der allerede findes: `defineSoftwarePage` til
produkt- og branchesider (registreres i `softwareRegistry.ts`, hvorved de
automatisk kommer med i sitemap og krydslinkning), `defineBlogPost` til
sammenligninger. Prissiden henter tal via `get_platform_pricing`, så den aldrig
kan komme i modstrid med den fakturering, kunderne møder. Ruter registreres i
`App.tsx`. Til sidst: regenerér sitemaps, ping IndexNow, genindsend til GSC.

## Hvad jeg mangler fra dig

1. Må priserne være offentlige?
2. Links til jeres LinkedIn og Trustpilot samt CVR-nummer
3. Er der noget I kan dokumentere, som konkurrenterne ikke kan — antal virksomheder
   på platformen, kunder der har skiftet fra et af systemerne? Kun hvis det er
   sandt; opfundne tal skader mere end de gavner.

Punkt 1 og 3 kan vi begynde uden, men de er de to største håndtag.