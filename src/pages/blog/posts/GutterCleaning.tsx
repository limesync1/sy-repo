import { Link } from "react-router-dom";
import { defineBlogPost } from "../defineBlogPost";

export default defineBlogPost({
  slug: "tagrender-vedligehold-og-rens",
  keywords:
    "rens af tagrender, tagrendevedligehold, tagrender pris, tilstoppede tagrender, fugtskade tagrender, professionel tagrenderens, nedløbsrør rens",
  faq: [
    { q: "Hvor ofte skal tagrender renses?", a: "Mindst én gang om året, typisk i november efter løvfald. Bor du tæt på løvtræer (eg, lind, ahorn), anbefales 2 gange årligt: maj og november." },
    { q: "Hvad koster professionel tagrenderens i 2026?", a: "Parcelhus 30–45 lbm: 1.500–2.800 kr. inkl. moms. Villa i 2 plan: 2.500–4.500 kr. Inkl. nedløbsrør med højtryksspuling: tillæg 400–900 kr." },
    { q: "Kan jeg selv rense tagrender sikkert?", a: "Ja, hvis huset er i ét plan og taget ikke er for stejlt. Brug A-stige med stigedæmper, aldrig en stige der står direkte mod tagrenden — den bliver skæv. I 2 plan eller derover anbefales professionel hjælp pga. faldrisiko." },
    { q: "Er det dækket af BoligJob-fradraget?", a: "Ja — rens af tagrender er omfattet af BoligJob-ordningen i 2026 (op til 17.500 kr. pr. voksen i husstanden). Betal elektronisk for at få fradraget." },
    { q: "Hjælper løvgitter eller tagrendebørste?", a: "Delvist. Det reducerer mængden af løv der lander i renden, men nåle og fint støv passerer alligevel. Du sparer typisk 1 rens om året — men skal stadig tjekke nedløbet." },
    { q: "Hvad er typiske tegn på at tagrenden er utæt?", a: "Grønne striber på facaden, fugtskjolder i tagetage, mos der vokser i renden, eller vand der løber over kanten ved kraftig regn — og ikke gennem nedløbet." },
    { q: "Skal nedløbet også spules?", a: "Ja — en ren tagrende uden frit nedløb er værdiløs. Bed altid om at få nedløbet spult med vand for at konstatere at fald og brønd virker." },
  ],
  sections: [
    {
      paragraphs: [
        "Tilstoppede tagrender er den hyppigste enkeltårsag til fugtskader på facade og sokkel — og en skade der nemt løber op i 30.000–80.000 kr. at udbedre. Den årlige rens koster en brøkdel og er den bedste forsikring du kan tegne for dit hus.",
      ],
    },
    {
      heading: "Tegn på at dine tagrender trænger",
      list: [
        "Vand der løber over kanten ved kraftig regn",
        "Grønne striber på facaden under tagrenden",
        "Mos, græs eller endda småtræer der vokser i renden",
        "Fugtskjolder på indvendige vægge i tagetagen",
        "Vandpøl ved soklen efter regnvejr",
        "Rust ved samlinger eller løse beslag",
        "Lyden af klukkende vand bag facadepladerne",
      ],
    },
    {
      heading: "Hvad gør en professionel?",
      ordered: [
        "Mekanisk fjernelse af løv, mos og slam (med spand, ikke fra taget)",
        "Højtryksspuling af tagrenden for at fjerne det sidste slam",
        "Skylning og test af fald — vandet skal løbe mod nedløbet",
        "Spuling af nedløbsrør og tjek af brønd",
        "Inspektion af samlinger, beslag, endebund og nedløb",
        "Dokumentation med billeder før/efter",
        "Anbefaling af reparationer (løs samling, manglende beslag)",
      ],
    },
    {
      heading: "Priser 2026",
      list: [
        "Parcelhus 1 plan, 30–45 lbm: 1.500–2.800 kr.",
        "Villa 2 plan, 45–70 lbm: 2.500–4.500 kr.",
        "Bungalow med tagvinduer: tillæg 400–800 kr.",
        "Nedløbsspuling pr. nedløb: 150–300 kr.",
        "Reparation af samling: 350–700 kr. pr. stk.",
        "Nyt beslag inkl. montering: 250–450 kr. pr. stk.",
        "Komplet udskiftning af 30 lbm zink: 12.000–22.000 kr.",
      ],
      paragraphs: [
        "Se også vores artikler om ",
      ],
      body: (
        <p>
          <Link to="/blog/algebehandling-tag-og-facade">algebehandling af tag og facade</Link> og <Link to="/blog/aarshjul-for-haveservice">årshjul for haveservice</Link>.
        </p>
      ),
    },
    {
      heading: "Selvgør — sikkerhedstjekliste",
      ordered: [
        "Brug A-stige med stigedæmper og hjælper på jorden",
        "Aldrig ræk længere end albuelængde — flyt stigen",
        "Brug handsker og spand (fugleekskrementer er farlige)",
        "Spul nedefra med haveslangen — ikke fra taget",
        "Tjek fra jorden efter regn at vandet løber rigtigt",
      ],
    },
    {
      heading: "Læs også",
      body: (
        <ul>
          <li><Link to="/blog/algebehandling-tag-og-facade">Algebehandling af tag og facade</Link></li>
          <li><Link to="/blog/aarshjul-for-haveservice">Årshjul for haveservice</Link></li>
          <li><Link to="/blog/boligjob-fradrag-2026">BoligJob-fradrag 2026</Link></li>
        </ul>
      ),
    },
  ],
});
