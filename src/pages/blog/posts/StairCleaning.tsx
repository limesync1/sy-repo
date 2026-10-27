import { defineBlogPost } from "../defineBlogPost";

export default defineBlogPost({
  slug: "trappevask-guide",
  keywords: "trappevask, trappevask pris, rengøring opgang, trappevask boligforening, trappevask ejerforening",
  faq: [
    { q: "Hvor ofte skal der vaskes trapper?", a: "Typisk hver uge eller hver 14. dag. Store opgange med mange beboere har ofte brug for ugentlig vask." },
    { q: "Hvem betaler?", a: "I udlejningsejendomme indgår det ofte i huslejen; i ejerforeninger betales det via fællesudgifterne." },
  ],
  sections: [
    { paragraphs: [
      "En ren opgang er det første, beboere og gæster ser. Trappevask er en klassisk fast serviceaftale — og en god aftale undgår diskussioner.",
    ] },
    { heading: "Det indgår typisk", list: [
      "Fejning og vask af trin og reposer.",
      "Aftørring af gelændere og dørhåndtag.",
      "Pletfjernelse på vægge og døre.",
      "Måtter og indgangsparti.",
    ] },
    { heading: "Det bør aftalen indeholde", ordered: [
      "Frekvens og faste ugedage.",
      "Præcis liste over opgaver.",
      "Pris pr. besøg eller måned.",
      "Hvad der sker ved helligdage.",
      "Kontaktperson og opsigelse.",
    ] },
    { body: (
      <p>
        <a href="/blog/erhvervsrengoering-hvad-er-med">Erhvervsrengøring</a> · <a href="/priser/rengoering">rengøring priser</a> · <a href="/tilbud">Indhent gratis tilbud</a> fra lokale firmaer.
      </p>
    ) },
  ],
});
