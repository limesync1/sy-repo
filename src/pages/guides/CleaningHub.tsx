import { defineGuidePage } from "./defineGuidePage";
import CityListSection from "@/components/content/CityListSection";
import { CITIES as CLEANING_CITIES } from "@/pages/cities/cleaningCityData";

export default defineGuidePage({
  canonicalPath: "/guides/rengoering",
  metaTitle: "Rengøring 2026 — komplet guide til priser, typer og firmaer | Serviceydere",
  metaDescription:
    "Alt om rengøring i ét sted: priser pr. type, fast rengøring vs. engang, firmavalg, fradrag og lokal hjælp i hele Danmark. Den ultimative reference.",
  keywords: "rengøring guide, rengøring 2026, rengøringspriser, rengøringsfirma, fast rengøring, hovedrengøring",
  heroEyebrow: "Hub · Rengøring",
  heroTitle: "Rengøring i Danmark 2026 — den komplette guide",
  heroSubtitle:
    "Alt du behøver vide om rengøring — fra realistiske priser og firmavalg til BoligJob-fradrag og lokal hjælp i alle de største byer.",
  breadcrumbLabel: "Rengøring",
  ctaCategory: "Rengøring",
  publishedAt: "2027-03-20",
  quickFacts: [
    <>Timepris privat rengøring: <strong>225–450 kr./t</strong> inkl. moms</>,
    <>Fast besøg 75 m² hver 14. dag: <strong>485–950 kr.</strong></>,
    <>BoligJob-fradrag: op til <strong>12.300 kr./voksen</strong></>,
    <>Dækning: <strong>20+ byer</strong> over hele Danmark</>,
  ],
  priceTable: {
    headers: { label: "Type rengøring", price: "Typisk pris", note: "Fradragsklart" },
    rows: [
      { label: "Fast rengøring (timepris)", price: "225–450 kr./t", note: "Ja" },
      { label: "Hovedrengøring (90 m²)", price: "1.495–2.495 kr.", note: "Ja" },
      { label: "Flytterengøring (100 m²)", price: "1.995–4.495 kr.", note: "Ja" },
      { label: "Erhvervsrengøring", price: "8–18 kr./m²", note: "Erhverv" },
      { label: "Vinduespudser", price: "595–1.495 kr.", note: "Ja" },
    ],
    footnote: "Priser inkl. moms. BoligJob-fradraget reducerer reel udgift med ca. 26–37%.",
  },
  sections: [
    { heading: "Typer af rengøring — vælg den rette guide", list: [
      <a href="/priser/rengoering">Rengøring prisguide 2026 (privat + erhverv)</a>,
      <a href="/blog/hovedrengoering-pris-pr-m2-2026">Hovedrengøring pris pr. m²</a>,
      <a href="/blog/privatrengoering-timepris-2026">Privat rengøring timepris 2026</a>,
      <a href="/blog/kontorrengoering-koebenhavn-pris-2026">Kontorrengøring København pris</a>,
      <a href="/blog/erhvervsrengoering-pris-pr-m2-2026">Erhvervsrengøring pris pr. m²</a>,
      <a href="/blog/flytterengoering-pris-2026">Flytterengøring pris 2026</a>,
    ]},
    { body: <CityListSection base="/rengoering" label="rengøring" cities={CLEANING_CITIES} /> },
    { heading: "Sådan vælger du det rigtige firma", list: [
      <a href="/blog/saadan-vaelger-du-rengoeringsfirma">Sådan vælger du rengøringsfirma (9 ting)</a>,
      <a href="/blog/privat-vs-firma-rengoering">Privat hjælper vs. rengøringsfirma</a>,
      <a href="/blog/abonnement-vs-engangsrengoering">Abonnement vs. engangsrengøring</a>,
      <a href="/blog/serviceydere-vs-happyhelper">Serviceydere vs. Happyhelper</a>,
      <a href="/blog/robotstoevsuger-vs-rengoeringshjaelp">Robotstøvsuger vs. rengøringshjælp</a>,
    ]},
    { heading: "Specifikke opgaver og pletter", list: [
      <a href="/blog/madras-rengoering">Madrasrengøring</a>,
      <a href="/blog/sofa-rengoering">Sofarengøring</a>,
      <a href="/blog/taeppe-rengoering">Tæpperengøring</a>,
      <a href="/blog/rensning-af-mug-i-fuger">Skimmelsvamp i fuger</a>,
      <a href="/blog/fjern-rodvinspletter">Fjern rødvinspletter</a>,
      <a href="/blog/fjern-kaffepletter">Fjern kaffepletter</a>,
      <a href="/blog/fjern-blodpletter">Fjern blodpletter</a>,
      <a href="/blog/fjern-graespletter">Fjern græspletter</a>,
    ]},
    { heading: "Fradrag og økonomi", list: [
      <a href="/guides/servicefradrag-2026">Servicefradrag 2026 — komplet guide</a>,
      <a href="/guides/haandvaerkerfradrag-2026">Håndværkerfradrag 2026</a>,
    ]},
  ],
  faq: [
    { q: "Hvad er en realistisk pris for fast rengøring?", a: "I 2026 ligger timepris på 225–450 kr./t inkl. moms — under fradrag 140–285 kr./t. Fast besøg 75 m² hver 14. dag koster 485–950 kr." },
    { q: "Hvilken type rengøring skal jeg vælge?", a: "Til løbende drift → abonnement (14-dags). Til hovedrengøring → engang 2× årligt. Til fraflytning → flytterengøring med garanti." },
    { q: "Får jeg automatisk BoligJob-fradrag?", a: "Når du betaler digitalt og bruger CVR-firma. Firmaet indberetter timer direkte til SKAT — du ser fradraget i din årsopgørelse." },
    { q: "Hvor mange tilbud bør jeg indhente?", a: "3–5 tilbud giver den bedste sammenligning. Beskriv opgaven én gang via tilbudsflowet, så går forespørgslen direkte ud til relevante firmaer i dit område." },
  ],
  cta: {
    heading: "Klar til at finde et rengøringsfirma?",
    body: "Indhent 3 gratis tilbud på rengøring fra CVR-godkendte firmaer i dit område.",
    secondaryLabel: "Se alle prisguides",
    secondaryHref: "/guides",
  },
});