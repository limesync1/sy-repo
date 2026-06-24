import { defineBlogPost } from "../defineBlogPost";

export default defineBlogPost({
  slug: "rotter-eller-mus",
  keywords: "rotter eller mus, forskel rotter mus, rotteekskrementer, museekskrementer, rotter i huset, mus i huset, anmelde rotter",
  faq: [
    { q: "Hvordan ser jeg forskel på rotte- og museekskrementer?", a: "Museekskrementer er 3–6 mm lange, sorte og rislende. Rotteekskrementer er 12–20 mm lange, mørkebrune, formet som ris- eller olivenkerner. Find dem typisk langs vægge, bag møbler eller i køkkenskabe." },
    { q: "Er det lovpligtigt at anmelde rotter?", a: "Ja. Det er gratis og anmeldes til kommunen via borger.dk — de sender en autoriseret skadedyrsbekæmper. Mus skal IKKE anmeldes." },
    { q: "Kan jeg selv bekæmpe mus?", a: "Ja. Smækfælder, levendefangstfælder og elektroniske fælder virker. Gift bør undgås (børn, kæledyr, rovfugle). Vigtigst: find og tæt indgangshullerne, ellers kommer der nye." },
    { q: "Hvad gør jeg mens jeg venter på rotteinspektøren?", a: "Tag fotos af ekskrementer, gnav og lyde-noter. Luk køkken og spisekammer, opbevar mad i metal/glas, fjern hundefoder fra haven. Rotteinspektøren kommer typisk indenfor 1–5 hverdage." },
    { q: "Hvor kommer rotterne ind fra?", a: "Næsten altid kloak — defekte toiletbrønde, hullede gulvbrønde i kælder, åbne kloakudluftninger. Mindre ofte via revner i fundament. Mus kommer ind via huller på 6+ mm i loft, kvist, ventilationsriste eller døråbninger." },
  ],
  sections: [
    { paragraphs: [
      "Forskellen mellem rotter og mus er ikke kosmetisk — den afgør om du skal ringe til kommunen (rotter) eller selv kan håndtere det (mus). Sådan ser du forskel hurtigt og handler rigtigt.",
    ] },
    { heading: "Identifikation: rotter vs. mus", list: [
      "Størrelse: mus 6–10 cm krop + lige så lang hale. Rotter 18–28 cm krop + lang nøgen hale.",
      "Ekskrementer: museekskrementer 3–6 mm (som risengryn). Rotteekskrementer 12–20 mm (som olivensten).",
      "Lyd: mus knasen og pibelyde om aftenen. Rotter tunge tramp og kradsende lyde, ofte fra loft eller bag væg.",
      "Spor: musespor små, fine. Rottespor tydelige, slidsten omkring 4–5 cm brede langs vægge.",
      "Lugt: rotter har stærk muggen-urinerende lugt. Mus svagere og sødere.",
    ] },
    { heading: "Sådan håndterer du mus selv", ordered: [
      "Tæt alle huller > 6 mm — brug stålulds og fugemasse, ikke skum (de gnaver gennem skum).",
      "Stil 4–6 smækfælder lige op ad vægge med jordnøddesmør som lokkemad.",
      "Fjern al tilgængelig mad — også korn, hundefoder, frugter på køkkenbordet.",
      "Tjek hver morgen, fjern døde mus med handsker, desinficér området.",
      "Fortsæt 2 uger efter sidste fangst.",
    ] },
    { heading: "Sådan anmelder du rotter", ordered: [
      "Gå til borger.dk → 'Anmeld rotter'.",
      "Vælg kommune og udfyld adresse + observation (set, lyd, ekskrementer, gnav).",
      "Upload gerne fotos.",
      "Kommunens autoriserede skadedyrsbekæmper kontakter dig inden 1–5 hverdage.",
      "Bekæmpelsen er gratis for dig — finansieret via kommuneskat.",
    ] },
    { heading: "Forebyg fremtidige angreb", list: [
      "Få lavet en TV-inspektion af din kloak hvert 5.–10. år (3.000–6.000 kr.)",
      "Sæt rottespærre i toilet og gulvbrønde (200–800 kr. pr. stk.)",
      "Hold græsplænen kort, fjern brændestabel fra husmuren",
      "Opbevar hundefoder og fuglefrø i metalbeholder",
      "Tjek loftet for huller efter ræv, fugl, mår — også potentielle museindgange",
    ] },
  ],
});
