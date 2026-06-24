import { defineBlogPost } from "../defineBlogPost";

const Post = defineBlogPost({
  slug: "robotstoevsuger-vs-rengoeringshjaelp",
  keywords: "robotstoevsuger vs rengøringshjælp, pris robotstøvsuger, fast rengøringshjælp, sammenligning",
  faq: [
    { q: "Hvad koster en fast rengøringshjælp pr. måned?", a: "1.200–2.400 kr./md. for 2 timer hver 14. dag i en 90 m² bolig — afhængigt af region og BoligJob-fradrag." },
    { q: "Kan en robotstøvsuger erstatte en rengøringshjælp?", a: "Den kan tage 30–40% af det daglige støv, men ikke vådt, badeværelse, køkkenflader, vinduer eller hjørner. Du sparer tid — ikke arbejde." },
    { q: "Hvad er totalprisen over 5 år?", a: "Robotstøvsuger: ca. 5.000–9.000 kr. Rengøringshjælp: 72.000–144.000 kr. minus BoligJob (37.000 kr.). Kombinationen er typisk billigst." },
    { q: "Hvem passer bedst sammen med kæledyr?", a: "Mid-tier robot (Roborock/Roomba) til daglig pelshygiejne + en pro-rengøring hver 14. dag på badeværelse og køkken." },
  ],
  sections: [
    { heading: "Hvad robotten kan — og ikke kan", list: [
      "Kan: dagligt støv og pels på frie gulvflader.",
      "Kan: kortlægge etager og programmeres efter zoner.",
      "Kan ikke: våd-tørre badeværelse, pudse vandhaner, vinduer.",
      "Kan ikke: hjørner, sokkellister og bag møbler.",
    ]},
    { heading: "Rengøringshjælpens styrker", list: [
      "Badeværelse — kalk, fuger, toilet.",
      "Køkkenflader — fedt, krummer, ovn.",
      "Vinduer og spejle.",
      "Sengelinned, støvsugning af møbler, polstring.",
    ]},
    { heading: "Totalpris over 5 år (90 m² bolig)", list: [
      "Kun robot: 6.000 kr.",
      "Kun rengøringshjælp 2 t/14. dag: 108.000 kr. − 37.000 kr. (BoligJob) = 71.000 kr.",
      "Robot + hjælp hver 4. uge: 6.000 + 54.000 − 18.000 = 42.000 kr.",
    ]},
    { heading: "Anbefaling efter livsfase", list: [
      "Single i lejlighed: robot + dybderens 4× årligt.",
      "Børnefamilie: robot + ugentlig rengøringshjælp.",
      "Erhverv/hjemmekontor: ugentlig rengøringshjælp uden robot.",
    ]},
  ],
});

export default Post;