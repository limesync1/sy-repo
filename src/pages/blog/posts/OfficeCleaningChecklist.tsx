import { defineBlogPost } from "../defineBlogPost";

export default defineBlogPost({
  slug: "erhvervsrengoering-hvad-er-med",
  keywords: "erhvervsrengøring, kontorrengøring, erhvervsrengøring tjekliste, erhvervsrengøring pris, rengøring kontor",
  faq: [
    { q: "Hvor ofte skal et kontor rengøres?", a: "Mindre kontorer klarer sig ofte med 1–2 gange om ugen; større arbejdspladser og køkkener har brug for daglig rengøring." },
    { q: "Hvordan sammenligner jeg tilbud?", a: "Sammenlign på samme opgaveliste og frekvens — ikke kun på prisen pr. besøg." },
  ],
  sections: [
    { paragraphs: [
      "Erhvervsrengøring handler om mere end gulvvask. Med en klar tjekliste er det nemt at sammenligne tilbud og sikre, at intet bliver glemt.",
    ] },
    { heading: "Tjekliste", list: [
      "Gulve: støvsugning og vask.",
      "Skriveborde og overflader.",
      "Toiletter: rengøring og opfyldning.",
      "Køkken: borde, vask, køleskab efter aftale.",
      "Affald og genbrug.",
      "Dørhåndtag og kontaktflader.",
    ] },
    { heading: "Sammenlign tilbud", ordered: [
      "Brug samme opgaveliste til alle firmaer.",
      "Spørg til frekvens og faste dage.",
      "Sammenlign pris uden moms.",
      "Spørg til kvalitetskontrol og afløser ved sygdom.",
    ] },
    { body: (
      <p>
        <a href="/blog/erhvervsrengoering-tilbud">Tilbud på erhvervsrengøring</a> · <a href="/blog/trappevask-guide">trappevask</a> · <a href="/priser/rengoering">rengøring priser</a> · <a href="/tilbud">Indhent gratis tilbud</a> fra lokale firmaer.
      </p>
    ) },
  ],
});
