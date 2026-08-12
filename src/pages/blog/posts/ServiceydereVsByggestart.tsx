import { defineBlogPost } from "../defineBlogPost";

const Post = defineBlogPost({
  slug: "serviceydere-vs-byggestart",
  keywords: "serviceydere vs byggestart, byggestart.dk alternativ, tilbud på byggeprojekt, find entreprenør online",
  faq: [
    { q: "Hvad er Byggestart?", a: "Byggestart er en tilbudstjeneste, hvor du beskriver et byggeprojekt og bliver sat i forbindelse med entreprenører og håndværkere, der kan give tilbud." },
    { q: "Hvad er forskellen på Serviceydere og Byggestart?", a: "Byggestart er rettet mod bygge- og renoveringsprojekter. Serviceydere dækker bredere — både håndværk og løbende serviceydelser — og lader dig også finde og kontakte konkrete firmaer selv." },
    { q: "Hvornår er en byggeportal bedst?", a: "Ved større, sammensatte projekter som tilbygning, totalrenovering eller nybyg, hvor du har brug for entreprenører frem for enkeltfag." },
    { q: "Hvornår er en bred markedsplads bedst?", a: "Når opgaven er afgrænset, når du har flere forskellige opgavetyper, eller når du også skal bruge løbende service bagefter." },
    { q: "Hvordan gør jeg tilbud sammenlignelige?", a: "Giv alle firmaer samme beskrivelse med mål, billeder, materialevalg og tidsramme — og bed om samme opdeling af arbejdsløn, materialer, moms og forbehold." },
  ],
  sections: [
    {
      paragraphs: [
        "Skal du i gang med et større byggeprojekt, findes der portaler bygget specifikt til det. Har du derimod en blanding af opgaver — eller også løbende service omkring boligen — sparer du tid ved at samle det ét sted.",
      ],
    },
    {
      heading: "Fokus",
      list: [
        <><strong>Byggestart:</strong> bygge- og renoveringsprojekter, ofte med entreprenører.</>,
        <><strong>Serviceydere:</strong> håndværk plus rengøring, flytning, have, vinduer og flere andre fag.</>,
        <><strong>Projektstørrelse:</strong> byggeportaler er stærkest på de store, sammensatte projekter.</>,
        <><strong>Efter projektet:</strong> flytterengøring, havereetablering og vedligehold kan bestilles samme sted hos Serviceydere.</>,
      ],
    },
    {
      heading: "Tjekliste før du accepterer et tilbud",
      list: [
        "Fast pris eller overslag — og er moms med?",
        "Hvad er ikke inkluderet?",
        "Hvem leverer materialer og står for bortkørsel?",
        "Tidsplan med start- og slutdato.",
        "CVR, ansvarsforsikring og garanti på arbejdet.",
        "Betalingsplan — undgå fuld forudbetaling.",
      ],
      body: (
        <p className="text-sm">
          Kend prisniveauet på forhånd med vores <a href="/guides/priser-2026">prisguides for 2026</a>.
        </p>
      ),
    },
    {
      heading: "Læs også",
      list: [
        <a href="/blog/bedste-platform-til-haandvaerkertilbud-2026">Oversigt: bedste platform til tilbud i 2026</a>,
        <a href="/blog/serviceydere-vs-3byggetilbud">Serviceydere vs. 3byggetilbud</a>,
        <a href="/blog/serviceydere-vs-haandvaerker-dk">Serviceydere vs. Håndværker.dk</a>,
        <a href="/priser/nyt-tag">Nyt tag prisguide</a>,
      ],
    },
  ],
});
export default Post;
