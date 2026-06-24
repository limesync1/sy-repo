import { Link } from "react-router-dom";
import { defineBlogPost } from "../defineBlogPost";

const ElectricianRules = defineBlogPost({
  slug: "hvornaar-skal-du-have-autoriseret-elektriker",
  keywords:
    "autoriseret elektriker, gør det selv el, el-arbejde regler, elektriker pris, sikkerhedsstyrelsen, HPFI",
  faq: [
    { q: "Hvad må jeg selv lave af el-arbejde?", a: "I 2026 må du selv skifte stikkontakter/afbrydere samme sted, montere lamper med DCL-stik og tilslutte hvidevarer med stik. Alt andet kræver autoriseret elektriker." },
    { q: "Hvad koster en elektriker i timen?", a: "Typisk 550–750 kr./time inkl. moms. Akut udkald aften/weekend 900–1.500 kr./time + udkaldsgebyr." },
    { q: "Hvad sker der hvis jeg laver ulovligt el-arbejde?", a: "Du risikerer bøde, og ved brand- eller personskade kan forsikringen afvise dækning. Ved boligsalg skal ulovligt arbejde lovliggøres." },
    { q: "Hvordan tjekker jeg om elektrikeren er autoriseret?", a: "Slå firmaet op på el-sikker.dk eller hos Sikkerhedsstyrelsen. Autorisationen er personlig — det er ikke nok at firmaet 'bruger en autoriseret'." },
    { q: "Hvor ofte skal HPFI testes?", a: "2 gange om året — tryk på testknappen, og HPFI skal slå fra. Sker det ikke, er relæet defekt og skal udskiftes straks (1.500–3.500 kr.)." },
    { q: "Er el-arbejde fradragsberettiget?", a: "Vedligehold er omfattet af BoligJob. Nybyg og tilbygning er ikke. Spørg elektrikeren om opgaven kan faktureres som fradragsberettiget arbejdsløn." },
    { q: "Hvad gør jeg ved akut el-fejl?", a: "Sluk for gruppen eller hovedafbryderen. Brug ikke installationen. Ring 112 ved røg eller flammer, ellers akut elektriker. Brug aldrig vand på el-brand." },
  ],
  sections: [
    {
      paragraphs: [
        "El-reglerne i Danmark er klare: nogle ting må du selv lave, det meste skal udføres af autoriseret elektriker. Forskellen handler om sikkerhed, forsikring og videresalg af boligen. Her er den fulde liste plus tjeklisten du burde have hængt op i bryggerset.",
      ],
    },
    {
      heading: "Hvad du SELV må lave (2026)",
      list: [
        "Skifte stikkontakter og afbrydere — samme sted, samme type, gruppen afbrudt",
        "Montere lamper med almindelig lampetilslutning (DCL-stik)",
        "Tilslutte hvidevarer med stik",
        "Skifte sikringer (men ikke ændre på gruppen eller HPFI)",
        "Skifte pære i loftslampe og udskifte standard lyskilde",
        "Skifte LED-driver i fast monteret armatur (med DCL-stik)",
      ],
    },
    {
      heading: "Hvad der KRÆVER autoriseret elektriker",
      list: [
        "Trække nye kabler i væg, loft eller gulv",
        "Etablere nye stik, afbrydere eller lampeudtag",
        "Ændre på el-tavlen — nye grupper, HPFI, sikringer",
        "El i badeværelser (zone 0–2)",
        "El til udestue, garage, skur eller udendørs belysning fastmonteret",
        "Solceller, ladestander til elbil og varmepumper",
        "El til swimmingpool, spa eller springvand",
      ],
    },
    {
      heading: "Elektriker-priser 2026",
      list: [
        "Timepris faglært elektriker: 550–750 kr. inkl. moms",
        "Akut udkald aften/weekend: 900–1.500 kr./time",
        "Udkaldsgebyr: 600–1.200 kr.",
        "Skift af HPFI: 1.500–3.500 kr. inkl. arbejde og materiale",
        "Ny gruppe i tavle: 2.500–5.500 kr.",
        "Ladestander til elbil (11 kW): 12.000–22.000 kr. inkl. installation",
      ],
      body: (
        <p>
          Sammenlign med <Link to="/blog/hvad-koster-elektriker-pr-time-2026">elektriker pris pr. time 2026</Link>{" "}
          og <Link to="/blog/hvad-koster-akut-vvs-tilkald">akut tilkald (VVS)</Link>.
        </p>
      ),
    },
    {
      heading: "Tjek autorisationen før du booker",
      paragraphs: [
        "Slå firmaet op på el-sikker.dk eller hos Sikkerhedsstyrelsen. Autorisationen er personlig — det er ikke nok at firmaet 'bruger en autoriseret'. Bed om autorisationsnummer skriftligt i tilbuddet. Ved fejl kan du klage til Elklagenævnet, men kun hvis firmaet er autoriseret.",
      ],
    },
    {
      heading: "Sikkerhedstjekliste til boligen",
      ordered: [
        "Test HPFI-relæet 2 gange om året (testknap → skal slå fra)",
        "Ingen skrubrune Bakelit-afbrydere fra før 1950 — udskiftes",
        "Brune mærker eller lugt af brændt plast = ring til elektriker straks",
        "Forlængerledninger kun midlertidigt — aldrig i serie ('daisy-chain')",
        "Stikkontakter med børnesikring i hjem med småbørn",
        "Røgalarm på hver etage — testes hver 6. måned",
      ],
      body: (
        <p>
          Springer HPFI hele tiden? Læs <Link to="/blog/hpfi-relae-springer">HPFI-relæ springer — fejlfinding</Link>.
        </p>
      ),
    },
    {
      heading: "Hvornår er det akut?",
      paragraphs: [
        "Ring akut, hvis HPFI gentagne gange slår fra, du lugter brændt plast, stikkontakter er varme at røre ved, eller du får stød fra en hvidevare. Sluk for gruppen og vent på elektrikeren — brug ikke installationen. Ved røg eller flammer: 112.",
      ],
    },
    {
      heading: "BoligJob og el-arbejde",
      paragraphs: [
        "Almindeligt el-vedligehold (skift af afbrydere, lampeudtag, mindre reparationer) er fradragsberettiget. Nybyg, om- og tilbygninger er ikke. Spørg elektrikeren om opgaven kan faktureres som fradragsberettiget arbejdsløn — husk elektronisk betaling.",
      ],
      body: (
        <p>
          Se de aktuelle fradragssatser i <Link to="/blog/boligjob-fradrag-2026">BoligJob-fradrag 2026</Link>.
        </p>
      ),
    },
    {
      heading: "Læs også",
      body: (
        <ul>
          <li><Link to="/blog/hvad-koster-elektriker-pr-time-2026">Elektriker timepris 2026</Link></li>
          <li><Link to="/blog/hpfi-relae-springer">HPFI springer — fejlfinding</Link></li>
          <li><Link to="/blog/el-tjek-foer-koeb-af-bolig">El-tjek før køb af bolig</Link></li>
          <li><Link to="/blog/saadan-bestiller-du-haandvaerker-rigtigt">Sådan bestiller du håndværker rigtigt</Link></li>
          <li><Link to="/blog/boligjob-fradrag-2026">BoligJob-fradrag 2026</Link></li>
        </ul>
      ),
    },
  ],
});

export default ElectricianRules;