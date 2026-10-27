import { defineBlogPost } from "../defineBlogPost";

export default defineBlogPost({
  slug: "rens-vaskemaskine",
  keywords: "rens vaskemaskine, rengøring vaskemaskine, vaskemaskine lugter, rens filter vaskemaskine",
  faq: [
    { q: "Hvor ofte skal vaskemaskinen renses?", a: "Rens filter og sæbeskuffe hver 1.–2. måned, og kør et varmt tomt program cirka en gang om måneden." },
    { q: "Kan jeg bruge eddike?", a: "Ja, i små mængder. Brug hellere citronsyre eller maskinrens, hvis producenten anbefaler det." },
  ],
  sections: [
    { paragraphs: [
      "En vaskemaskine bliver ikke ren af sig selv. Sæberester, fnug og kalk samler sig — og giver dårlig lugt og grå vask. Fem trin løser det.",
    ] },
    { heading: "5 trin", ordered: [
      "Rens filteret i bunden — hav en bakke og et håndklæde klar.",
      "Tag sæbeskuffen ud og skyl den i varmt vand.",
      "Tør gummiringen af — også inde i folderne.",
      "Kør et tomt program på 90 grader med maskinrens eller citronsyre.",
      "Lad lågen og skuffen stå åben efter vask.",
    ] },
    { heading: "Forebyg", list: [
      "Dosér rigtigt — for meget sæbe giver belægninger.",
      "Vask indimellem på 60 grader.",
      "Tag vasketøjet ud med det samme.",
    ] },
    { body: (
      <p>
        <a href="/blog/lugt-i-vaskemaskine-loesninger">Lugt i vaskemaskine</a> · <a href="/blog/afkalkning-komplet-guide">afkalkning</a> · <a href="/tilbud">Indhent gratis tilbud på rengøring</a>.
      </p>
    ) },
  ],
});
