import { defineBlogPost } from "../defineBlogPost";

export default defineBlogPost({
  slug: "rengoering-af-emhaette",
  keywords: "rengøring af emhætte, rens emhætte filter, fedtfilter emhætte, kulfilter emhætte",
  faq: [
    { q: "Kan fedtfilteret komme i opvaskemaskinen?", a: "De fleste metalfiltre kan. Tjek manualen, og stil dem lodret." },
    { q: "Hvor ofte skal kulfilteret skiftes?", a: "Typisk 1–2 gange om året. Kulfiltre kan ikke vaskes, medmindre producenten skriver det." },
  ],
  sections: [
    { paragraphs: [
      "Emhætten samler fedt fra al madlavning. Et fedtet filter suger dårligt og kan være en brandrisiko.",
    ] },
    { heading: "Fedtfilteret", ordered: [
      "Tag filteret ud.",
      "Læg det i blød i meget varmt vand med natron og opvaskemiddel i 15 minutter.",
      "Børst og skyl.",
      "Lad det tørre helt.",
    ] },
    { heading: "Overfladen", list: [
      "Tør af med varmt sæbevand.",
      "Rustfrit stål: tør med fiberens retning.",
      "Undgå skuremidler.",
    ] },
    { body: (
      <p>
        <a href="/blog/ovnrens-guide">Ovnrens</a> · <a href="/priser/rengoering">rengøring priser</a> · <a href="/tilbud">Indhent gratis tilbud på rengøring</a>.
      </p>
    ) },
  ],
});
