import { Link } from "react-router-dom";
import { defineBlogPost } from "../defineBlogPost";

export default defineBlogPost({
  slug: "haek-og-traefaeldning-regler",
  keywords:
    "hækklipning regler, hækhøjde skel, hegnsloven, træfældning tilladelse, fælde træ nabo, hækklipning pris 2026, anlægsgartner, stubfræsning, hegnssyn",
  faq: [
    { q: "Hvor høj må min hæk være mod naboen?", a: "Som tommelfingerregel 1,80 meter — men hegnsloven trumfer: hvis I er uenige, indkaldes Hegnssynet via kommunen, og de fastsætter en højde der passer til området. Typisk 1,80 m i parcelhusområder, 2,0–2,5 m hvor det er normalt for kvarteret." },
    { q: "Må jeg fælde et stort træ uden tilladelse?", a: "På egen grund: som hovedregel ja. Undtagelser: træet er fredet, omfattet af lokalplan, bevaringsplan eller naturbeskyttelseslovens § 3. Tjek altid kommunens hjemmeside og din lokalplan først — bøden for ulovlig fældning starter ved 10.000 kr." },
    { q: "Hvad koster træfældning i 2026?", a: "Løvtræ op til 10 m: 2.000–5.500 kr. Træer 10–15 m: 4.500–9.000 kr. Træer over 15 m eller tæt på huset (kranfældning): 6.000–18.000 kr. Stubfræsning: 800–1.800 kr. pr. stub." },
    { q: "Hvad koster hækklipning hos en anlægsgartner?", a: "Standardklipning af thuja, liguster eller bøg: 35–55 kr./lbm for 2 m høj hæk inkl. bortskaffelse. Timepris: 450–650 kr. inkl. moms. Få altid fast pris ved hække over 20 lbm." },
    { q: "Må naboen klippe grene der vokser over skel?", a: "Ja — naboen må klippe grene i skellet, men kun det der hænger ind over hans grund, og kun til skel. Han må ikke gå ind på din grund uden tilladelse, og afklippet skal afleveres til dig." },
    { q: "Hvad gør Hegnssynet, og hvad koster det?", a: "Hegnssynet er tre uvildige personer udpeget af kommunen, der træffer afgørelse i naboskel-sager. Et hegnssyn koster ca. 1.875 kr. (2026) — typisk lægges udgiften på den part der taber sagen." },
    { q: "Hvornår er det bedst at klippe hæk?", a: "Hovedklip: slut juni eller august, så væksten er stoppet. Formklip om foråret før løvspring. Aldrig klip bøg eller avnbøg efter september — så får snittet ikke tid til at lukke før frost." },
    { q: "Er hækklipning og træfældning fradragsberettiget?", a: "Hækklipning, beskæring og almindelig vedligehold: ja under BoligJob. Træfældning som engangsopgave: kun arbejdsløn, ikke materialer eller bortkørsel. Op til 17.500 kr. pr. voksen i 2026." },
  ],
  sections: [
    {
      paragraphs: [
        "Hæk- og trækonflikter med naboen er en af de hyppigste sager hos Hegnssynet. Reglerne er enklere end mange tror — og en hurtig naboaftale på papir sparer både ærgrelse og advokatregninger.",
      ],
    },
    {
      heading: "Hegnsloven kort fortalt",
      list: [
        "Fælleshegn (i skel) skal vedligeholdes ligeligt af begge naboer",
        "Eget hegn på egen grund må stå op til 1,80 m uden naboens samtykke (typisk)",
        "Grene der vokser over skel må naboen klippe af i skellet",
        "Hegnssyn kan indkaldes via kommunen ved uenighed — ca. 1.875 kr. (2026)",
        "Lokalplaner og servitutter kan overstyre — tjek altid først",
        "Døde grene over fortov skal fjernes (vejmyndighedens påbud)",
      ],
    },
    {
      heading: "Træfældning — sådan gør du det rigtigt",
      ordered: [
        "Tjek lokalplan, bevaringsplan og naturbeskyttelseslov",
        "Tal med naboen først, især hvis træet står tæt på skel",
        "Vælg sæson: vinter (november–februar) er bedst for både træet og prisen",
        "Hent 2–3 tilbud — pris varierer 30–50 % afhængig af adgang",
        "Spørg om kranfældning hvis træet står tæt på hus, ledninger eller hegn",
        "Aftal bortkørsel + stubfræsning som del af prisen",
        "Bed om dokumentation for ansvarsforsikring (mindst 10 mio. kr.)",
      ],
    },
    {
      heading: "Priser 2026 — træfældning og hækarbejde",
      list: [
        "Træfældning løvtræ <10 m: 2.000–5.500 kr.",
        "Træfældning 10–15 m: 4.500–9.000 kr.",
        "Kranfældning >15 m: 6.000–18.000 kr.",
        "Stubfræsning: 800–1.800 kr. pr. stub",
        "Beskæring/topkapning af stort træ: 3.500–8.500 kr.",
        "Hækklipning pr. lbm (2 m højde): 35–55 kr.",
        "Hækklipning timepris: 450–650 kr. inkl. bortskaffelse",
        "Nyplantning af bøgehæk (3 planter/m): 95–145 kr./lbm",
      ],
      paragraphs: [
        "Se også vores ",
      ],
      body: (
        <p>
          <Link to="/blog/anlaegsgartner-terrasse-og-have">guide til anlægsgartner</Link>, <Link to="/blog/aarshjul-for-haveservice">årshjul for haveservice</Link> og <Link to="/blog/haveservice-priser-2026">aktuelle priser på haveservice</Link>.
        </p>
      ),
    },
    {
      heading: "Konflikt med naboen — trin for trin",
      ordered: [
        "Tag billeder og dokumentér problemet (højde, skygge, grene)",
        "Skriv et venligt brev/sms med konkret forslag",
        "Få et skriftligt svar — eller manglende svar — på papir",
        "Indkald til møde med uvildig tredjepart (fx ejendomsmægler)",
        "Sidste udvej: Hegnssyn via kommunen (ca. 1.875 kr.)",
        "Domstol kun ved meget store værdier — typisk ikke prisen værd",
      ],
    },
    {
      heading: "Læs også",
      body: (
        <ul>
          <li><Link to="/blog/anlaegsgartner-terrasse-og-have">Anlægsgartner — terrasse og have</Link></li>
          <li><Link to="/blog/aarshjul-for-haveservice">Årshjul for haveservice</Link></li>
          <li><Link to="/blog/haveservice-priser-2026">Haveservice priser 2026</Link></li>
          <li><Link to="/blog/boligjob-fradrag-2026">BoligJob-fradrag 2026</Link></li>
        </ul>
      ),
    },
  ],
});
