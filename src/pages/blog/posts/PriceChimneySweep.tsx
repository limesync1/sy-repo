import { Link } from "react-router-dom";
import { defineBlogPost } from "../defineBlogPost";

const Post = defineBlogPost({
  slug: "skorstensfejer-pris-2026",
  keywords: "skorstensfejer pris 2026, lovpligtigt skorstensfejer, brændeovn skorsten pris",
  faq: [
    { q: "Hvad koster lovpligtigt skorstensfejning?", a: "350–650 kr./år inkl. moms for én brændeovn. Tillægsovn: +175–325 kr." },
    { q: "Er det lovpligtigt?", a: "Ja — alle brændeovne, pejse og fyr skal fejes mindst 1× årligt. Manglende fejning kan give bøde og er forsikringsbrist." },
    { q: "Hvad koster ny indfor til skorsten?", a: "Stålindfor 145 mm: 18.000–35.000 kr. inkl. montering." },
    { q: "Er udgiften BoligJob-berettiget?", a: "Den lovpligtige fejning er IKKE — men reparationer, ny indfor og renovering ER." },
  ],
  sections: [
    { heading: "Priser på skorstensfejer-ydelser", list: ["Lovpligtig fejning (brændeovn): 350–650 kr./år.","Røgprøve: 595–1.250 kr.","Tilbygning af ny ovn: 950–1.850 kr.","Skorstensindfor: 18.000–35.000 kr.","Udvidet sikkerhedstjek: 695–1.450 kr."] },
    { heading: "Når du SKAL ringe akut", list: ["Skorstensbrand — ring 112 FØRST.","Røg slår ud i stuen.","Synlige revner i skorstensrør.","Sod i unormale mængder."] },
    { heading: "Læs også", body: (
      <ul>
        <li key="l0"><Link to="/blog/skorstensfejer-hvor-ofte">Hvor ofte skal skorsten fejes?</Link></li>
        <li key="l1"><Link to="/skorstensfejer">Find skorstensfejer</Link></li>
      </ul>
    ) },
  ],
});

export default Post;
