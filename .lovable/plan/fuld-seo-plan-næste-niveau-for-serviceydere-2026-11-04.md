# Fuld SEO-plan: næste niveau for Serviceydere

Grundlaget er stærkt: SEO-motoren skriver artikler, alle artikler har billeder, sitemap er indsendt, og titler med få klik bliver løbende forbedret. Planen her dækker det, der mangler eller er blevet glemt.

## 1. Opdatering af gamle artikler (glemt indtil nu)
- SEO-motoren skriver kun nye artikler. Den skal også opdatere artikler, der er over 6 måneder gamle eller falder i Google: nye priser for 2026, ekstra afsnit og "Opdateret"-dato.
- Artikler, der ligner hinanden og konkurrerer om samme søgning, lægges sammen og omdirigeres til den bedste, så de ikke stjæler plads fra hinanden.

## 2. Side 2 til side 1
- Hver uge finder motoren sider på plads 8-20 i Google og udbygger dem med de søgninger, folk faktisk bruger (fra Search Console).
- Flere interne links fra stærke sider (forside, branchesider) til de sider, der er tæt på side 1.

## 3. Lokale sider der rangerer
- By- og branchesiderne får rigtigt lokalt indhold: priser i området, nærliggende byer og links til relevante guides, så de ikke ligner skabeloner.
- Kun de byer med reel søgevolumen udbygges først, så vi ikke laver tynde sider.

## 4. Troværdighed (E-E-A-T)
- Forfatter-/redaktionsside med navn, baggrund og hvordan priser og fakta tjekkes.
- Kildehenvisninger i artikler med regler og priser (fx skorstensfejning, moms).
- Synlige "Sidst opdateret"-datoer på alle artikler.

## 5. AI-søgning (ChatGPT, Google AI-svar, Perplexity)
- Hver artikel får en kort, klar opsummering øverst, der direkte besvarer spørgsmålet.
- llms.txt udvides automatisk med de vigtigste artikler og branchesider.

## 6. Hastighed og teknik
- Måle hastigheden på mobil for forsiden, en artikel og en brancheside; rette det tungeste først.
- Tjek at alle nye artikler kommer med i sitemappet og den forberedte HTML samme dag, de udgives.
- Ødelagte links og omdirigeringskæder findes og rettes automatisk hver uge.

## 7. Måling og rapport
- Den månedlige SEO-rapport udvides med: sider der steg/faldt, artikler opdateret, billeder indekseret og de 10 nærmeste "næsten side 1"-søgninger.
- Admin-fanen viser samme tal.

## 8. Uden for siden (kræver dig)
- Google Virksomhedsprofil for Serviceydere.
- Omtale/links fra brancheforeninger og samarbejdspartnere. Jeg kan lave en liste og udkast til henvendelser.

## Rækkefølge
1. Opdatering af gamle artikler + side 2 til side 1 (størst effekt hurtigt)
2. Troværdighed og AI-opsummeringer
3. Lokale sider
4. Hastighed, teknik og rapport
5. Liste til arbejde uden for siden

## Tekniske detaljer
- `seo-engine`: nye opgavetyper `refresh` og `boost` i samme idempotente daglige kørsel; vælg via GSC (position 8-20, faldende klik, alder > 180 dage); gem `updated_at`/`refreshed_count` på `seo_articles`; dateModified i Article JSON-LD fra registre.
- Kannibalisering: gruppér artikler pr. top-søgning fra GSC; flet og tilføj 301 i redirect-registret.
- Forfatterside som ny offentlig rute i SEO-registret + Person-schema koblet til Article.
- Opsummering som nyt blok-felt i `seo_articles` (plain text), renderet i `BlogArticleLayout` og prerender.
- llms.txt genereres i build fra samme registre som sitemap.
- Regeltests for udvælgelse (refresh/boost-tærskler) ved siden af eksisterende `topic-selection`-tests.
