import { defineBlogPost } from "../defineBlogPost";

const Post = defineBlogPost({
  slug: "goer-det-selv-vs-haandvaerker",
  keywords: "gør det selv vs håndværker, hvornår hyre håndværker, diy bolig, autorisation",
  faq: [
    { q: "Hvad må jeg lave selv?", a: "Maling, gulv, fliser, kontaktude på dyvler, samle køkken, lette VVS-tilslutninger med skiftestik. Ikke fast el eller gas." },
    { q: "Hvad kræver autorisation?", a: "Fast elinstallation, gas, vand bag væg, kloak. Ulovligt arbejde gør forsikringen ugyldig ved skade." },
    { q: "Sparer jeg altid penge ved DIY?", a: "Nej. Materialer er ofte 20–40% dyrere uden håndværkerrabat, og en fejl koster typisk 3–10× det du sparede." },
    { q: "Hvornår er BoligJob-fradraget afgørende?", a: "Det halverer reelt timeprisen for håndværker når du bruger fagmand. Det gør grænsen for hvornår DIY betaler sig meget snævrere." },
  ],
  sections: [
    { heading: "5 opgaver hvor DIY næsten altid betaler sig", list: [
      "Male væg/loft.",
      "Skifte håndtag og hængsler.",
      "Samle fladpakkemøbler.",
      "Skifte termostat på radiator.",
      "Lægge vinyl- eller laminatgulv (klikgulv).",
    ]},
    { heading: "7 opgaver hvor håndværker næsten altid betaler sig", list: [
      "Elinstallation — ALT bag væg.",
      "Vand/afløb bag væg og gulv.",
      "Brusenicher med fugefri overflade.",
      "Større tagarbejde over 3 m.",
      "Bærende vægge.",
      "Gas.",
      "Pejs/brændeovn med skorstenstilslutning.",
    ]},
    { heading: "Sådan regner du den hjem", paragraphs: [
      "Håndværker 525 kr./time bliver til 262 kr./time efter BoligJob-fradrag. Tag selvarbejdet i timer og gang med din egen timeløn — er det dyrere end fagmandens 262 kr., er DIY ofte en dårlig forretning.",
    ]},
    { heading: "Forsikringsfælden", paragraphs: [
      "Bygnings- og indboforsikring dækker ikke skader fra uautoriseret el- eller VVS-arbejde. En vandskade fra DIY-tilslutning kan koste dig 80.000–250.000 kr. som du selv skal betale.",
    ]},
  ],
});

export default Post;