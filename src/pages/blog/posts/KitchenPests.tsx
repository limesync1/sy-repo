import { defineBlogPost } from "../defineBlogPost";

export default defineBlogPost({
  slug: "skadedyr-i-koekkenet-hvad-goer-jeg",
  keywords: "sølvfisk køkken, melmøl bekæmpelse, kakerlakker hjemme, skadedyr køkken, skadedyrsbekæmpelse, forebyggelse skadedyr",
  faq: [
    { q: "Hvordan slipper jeg af med sølvfisk i køkkenet?", a: "Sølvfisk trives ved fugt. Fjern fugtkilden, støvsug revner og brug Diatomé-jord langs paneler. Massive forekomster kræver professionel behandling." },
    { q: "Hvad er forskellen på melmøl og almindelige møl?", a: "Melmøl lægger æg i tørvarer (mel, gryn, müsli). Du ser larver og spind i pakkerne. Smid alle åbnede tørvarer ud og brug feromonfælder." },
    { q: "Hvornår skal jeg ringe efter professionel skadedyrsbekæmper?", a: "Ved kakerlakker (anmeldelsespligt i etageejendomme), gentagne udbrud trods rengøring, eller hvis du ser larver/æg flere steder." },
  ],
  sections: [
    { paragraphs: ["Skadedyr i køkkenet er sjældent et hygiejneproblem — det er et fugt-, opbevarings- eller sprækkeproblem. De fleste udbrud kan stoppes uden gift, hvis du handler hurtigt og systematisk."] },
    { heading: "De 4 mest almindelige køkkenskadedyr", list: [
      "Sølvfisk: foretrækker fugt og mørke — udluft, tjek vandrør, forsegl revner.",
      "Melmøl / hvedemøl: kommer med åbne tørvarer — smid ud, vask med eddike, brug feromonfælder i 6 uger.",
      "Husmus: små sorte ekskrementer langs paneler — sluk-fælder (ikke gift), bloker huller >6 mm.",
      "Kakerlakker: anmeldelsespligt i etageejendomme — altid professionel behandling.",
    ] },
    { heading: "Forebyggelse der virker", list: [
      "Opbevar mel, gryn og müsli i lufttætte beholdere",
      "Tjek og rens afløb i køkkenvask hver måned",
      "Hold relativ luftfugtighed under 55%",
      "Forsegl revner ved paneler, fodlister og kabelgennemføringer",
      "Lad ikke beskidt opvask stå natten over",
    ] },
  ],
});
