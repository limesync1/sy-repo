import { Link } from "react-router-dom";
import { defineBlogPost } from "../defineBlogPost";

const Landscaping = defineBlogPost({
  slug: "anlaegsgartner-terrasse-og-have",
  keywords:
    "anlægsgartner pris, ny terrasse pris, fliseterrasse, træterrasse, anlæg af have, drænarbejde",
  faq: [
    { q: "Hvad koster en ny fliseterrasse?", a: "Typisk 1.200–2.200 kr. pr. m² inkl. flise, bærelag, opretning og lægning. Special-fliser (granit, klinker) ligger højere på 2.500–4.000 kr. pr. m²." },
    { q: "Holder en træterrasse længere end fliser?", a: "Nej. En fliseterrasse holder typisk 30–50 år, mens trykimprægneret fyr holder 12–20 år. Hårdttræ som ipe/cumaru holder 25–40 år." },
    { q: "Skal jeg have byggetilladelse til terrasse?", a: "Generelt nej — terrasser under 30 cm uden tag er fritaget. Hævede terrasser, overdækninger og pergolaer kan kræve tilladelse. Tjek altid kommunen." },
    { q: "Er anlægsgartner-arbejde fradragsberettiget?", a: "Almindelig haveservice og vedligehold er omfattet af BoligJob. Anlæg af ny terrasse, ny belægning og plantning er ikke — det betragtes som nyanlæg." },
    { q: "Kan jeg dele projektet op?", a: "Ja. Mange anlægsgartnere fakturerer i etaper: jordarbejde + dræn, derefter belægning, og til sidst beplantning. Det giver bedre likviditet og lader dig stoppe efter etape 1, hvis økonomien ændrer sig." },
    { q: "Hvor lang tid tager et terrasseprojekt?", a: "30 m² fliseterrasse uden komplikationer: 4–7 arbejdsdage. Med dræn og afrømning af eksisterende beton: 1,5–3 uger. Vejret kan forlænge — regn over 5 mm/dag stopper jordarbejdet." },
    { q: "Hvad koster en anlægsgartner i timen?", a: "Typisk 425–575 kr./time inkl. moms for faglært anlægsgartner. Maskintimepriser (minigraver, pladevibrator) lægges typisk oveni." },
  ],
  sections: [
    {
      paragraphs: [
        "En anlægsgartner laver det blivende — terrasse, belægning, dræn og beplantning. Det er den dyreste håndværker i haven, men også den der gør den største forskel for husets værdi. Her er prisniveauer, proces og faldgruber for 2026.",
      ],
    },
    {
      heading: "1. Start med funktionen, ikke æstetikken",
      paragraphs: [
        "Skal terrassen bruges til solnedgang, til grill, til leg eller alle dele? Antal personer ved bordet (1,2 m² pr. person + 80 cm bag stolen) afgør størrelsen. Skygge fra hus og træer afgør placeringen — en sydvendt terrasse skal måske have pergola, mens en østvendt skal placeres så morgensol når frem.",
      ],
    },
    {
      heading: "2. Materialevalg — pris og levetid",
      list: [
        "Beton-/granitfliser: 30–50 år, lav vedligehold, ensartet udseende",
        "Trykimprægneret fyr: 12–20 år, billigt, kræver olie hvert 2.–3. år",
        "Hårdttræ (ipe, cumaru): 25–40 år, smukt, dyrt, tungt",
        "Komposit (WPC): 20–30 år, vedligeholdsfrit, kan blive varmt i solen",
        "Klinker/keramiske fliser: 30+ år, slidstærkt, kræver præcis lægning",
      ],
    },
    {
      heading: "3. Realistiske priser for hele haven (2026)",
      list: [
        "Fliseterrasse (30 m²): 35.000–65.000 kr.",
        "Træterrasse (30 m²): 28.000–50.000 kr.",
        "Anlæg af bede med planter (10 m²): 7.000–18.000 kr.",
        "Hækplantning (10 lbm liguster): 2.500–4.500 kr. inkl. jord og plantning",
        "Drænarbejde i lerjord: 500–900 kr./lbm",
        "Ny indkørsel i SF-sten (40 m²): 50.000–95.000 kr.",
        "Anlægsgartner timepris: 425–575 kr./time inkl. moms",
      ],
      body: (
        <p>
          Sammenlign med <Link to="/blog/terrassebygning-pris-pr-m2-2026">terrassebygning pris pr. m²</Link>,{" "}
          <Link to="/blog/indkoersel-belaegning-pris-pr-m2-2026">indkørsel belægning pris pr. m²</Link> og{" "}
          <Link to="/blog/haveservice-pris-aarhus-2026">haveservice Aarhus 2026</Link>.
        </p>
      ),
    },
    {
      heading: "4. Proces — fra første møde til færdig have",
      ordered: [
        "Indledende besøg + opmåling (gratis hos de fleste)",
        "Skitseforslag og tilbud — gerne 2–3 firmaer",
        "Detailplan med plantevalg, fliser, drænløsning og tidsplan",
        "Anlægsperiode — typisk 1–3 uger for parcelhushave",
        "Aflevering med plejevejledning og 1-års opfølgning",
      ],
    },
    {
      heading: "5. Faldgruber",
      list: [
        "For lidt fald — terrassen skal hælde ~2 % væk fra huset",
        "For tyndt bærelag (under 20 cm stabilgrus) — flisen sætter sig efter første frost",
        "Planter der vokser sig for store i forhold til bedet — krævende beskæring efter 2–3 år",
        "Manglende dræn i lerjord — leder til våde sokler og fugtskader",
        "Sort arbejde — du mister garanti, BoligJob-fradrag og forsikringsdækning",
      ],
      body: (
        <p>
          Læs også <Link to="/blog/havemand-vs-anlaegsgartner">havemand vs. anlægsgartner</Link>,{" "}
          <Link to="/blog/aarshjul-for-haveservice">årshjul for haveservice</Link> og{" "}
          <Link to="/blog/klargoer-haven-til-vinter">klargør haven til vinter</Link>.
        </p>
      ),
    },
    {
      heading: "Læs også",
      body: (
        <ul>
          <li><Link to="/blog/terrassebygning-pris-pr-m2-2026">Terrassebygning pris pr. m²</Link></li>
          <li><Link to="/blog/indkoersel-belaegning-pris-pr-m2-2026">Indkørsel belægning pris</Link></li>
          <li><Link to="/blog/hegn-opsaetning-pris-pr-meter-2026">Hegn opsætning pris pr. meter</Link></li>
          <li><Link to="/blog/havemand-pris-koebenhavn-2026">Havemand København 2026</Link></li>
          <li><Link to="/blog/haveservice-pris-aarhus-2026">Haveservice Aarhus 2026</Link></li>
        </ul>
      ),
    },
  ],
});

export default Landscaping;