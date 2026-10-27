import { defineBlogPost } from "../defineBlogPost";

export default defineBlogPost({
  slug: "ovnrens-guide",
  keywords: "ovnrens, rens ovn, ovnrens natron, rengøring af ovn, ovnrens eddike",
  faq: [
    { q: "Hvor ofte skal ovnen renses?", a: "Tør spild af efter brug, og giv ovnen en grundig rens et par gange om året — oftere hvis du bruger den dagligt." },
    { q: "Virker pyrolyse?", a: "Ja. Pyrolyse brænder snavset til aske ved meget høj varme. Bagefter tørrer du blot asken af." },
  ],
  sections: [
    { paragraphs: [
      "En fedtet ovn lugter, ryger og bager dårligere. Den gode nyhed: de fleste ovne kan blive rene med natron, vand og eddike — uden stærke ovnrensmidler.",
    ] },
    { heading: "Det skal du bruge", list: [
      "Natron.",
      "Vand og en sprayflaske med eddike.",
      "Blød klud, svamp og en plastskraber.",
      "Gummihandsker.",
    ] },
    { heading: "Sådan gør du — trin for trin", ordered: [
      "Tag rist og plader ud.",
      "Rør natron og vand til en tyk pasta.",
      "Smør pastaen på ovnens indvendige sider — undgå varmelegemerne.",
      "Lad den virke natten over.",
      "Tør pastaen af med fugtig klud og skraber.",
      "Spray med eddike, så rester bruser op, og tør efter.",
      "Læg risten i blød i varmt vand med opvaskemiddel og natron.",
    ] },
    { heading: "Ovnglasset", list: [
      "Brug den samme natronpasta på glasset.",
      "Skru evt. lågen af og rens mellem glassene efter manualen.",
    ] },
    { heading: "Det skal du undgå", list: [
      "Ståluld på emalje.",
      "Ovnrens på varmelegemer og pakninger.",
      "At blande klor og eddike.",
    ] },
    { body: (
      <p>
        <a href="/blog/hvad-koster-flytterengoering-2026">Flytterengøring pris</a> · <a href="/blog/flytterengoering-tjekliste">flytterengøring tjekliste</a> · <a href="/priser/rengoering">rengøring priser</a> · <a href="/tilbud">Indhent gratis tilbud</a> fra lokale firmaer.
      </p>
    ) },
  ],
});
