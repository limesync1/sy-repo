import { defineBlogPost } from "../defineBlogPost";

export default defineBlogPost({
  slug: "rens-opvaskemaskine",
  keywords: "rens opvaskemaskine, rengøring opvaskemaskine, afkalk opvaskemaskine, opvaskemaskine filter",
  faq: [
    { q: "Hvorfor bliver opvasken ikke ren?", a: "Ofte et tilstoppet filter, blokerede spulearme eller manglende salt. Start med filteret." },
  ],
  sections: [
    { paragraphs: [
      "Når opvasken kommer ud med rester eller hvide skjolder, er det tid til en rens. Det tager under en halv time.",
    ] },
    { heading: "Trin for trin", ordered: [
      "Tag filteret ud og skyl det under varmt vand med en børste.",
      "Tag spulearmene af og rens hullerne med en tandstik.",
      "Tør pakninger og lågekant af.",
      "Sæt en skål eddike eller en spsk. citronsyre i bunden og kør et varmt program uden service.",
      "Fyld salt og afspænding efter.",
    ] },
    { heading: "Gode vaner", list: [
      "Skrab tallerkener — men skyl dem ikke.",
      "Rens filteret hver måned.",
      "Brug salt, hvis vandet er hårdt.",
    ] },
    { body: (
      <p>
        <a href="/blog/afkalkning-komplet-guide">Afkalkning</a> · <a href="/blog/rens-vaskemaskine">rens vaskemaskine</a> · <a href="/tilbud">Indhent gratis tilbud på rengøring</a>.
      </p>
    ) },
  ],
});
