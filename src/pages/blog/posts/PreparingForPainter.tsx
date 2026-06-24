import { defineBlogPost } from "../defineBlogPost";

const Post = defineBlogPost({
  slug: "forberedelse-foer-maleren-kommer",
  keywords: "forberedelse maler, spar penge maler, tjekliste maler, afdække maleren",
  faq: [
    { q: "Hvor meget kan jeg spare?", a: "1.500–4.000 kr. på en stue ved selv at flytte, afdække og rydde af. Maleren tager 525 kr./time x 3–8 timer hvis du intet gør." },
    { q: "Skal jeg fjerne tapeter selv?", a: "Det er hurtigt at fjerne våd-aftageligt tapet selv — sparer 1.000–3.000 kr. på en stue. Gamle limede tapeter overlader du til maleren." },
    { q: "Hvad med møbler — flytte ud eller midt på gulvet?", a: "Flyt ud hvis det kan lade sig gøre. Ellers midt på gulvet med 80 cm afstand til vægge + plastik over." },
    { q: "Skal jeg selv pille stikkontakter af?", a: "Nej — risiko for el-skader. Maleren afdækker dem med malertape." },
  ],
  sections: [
    { heading: "Tjekliste — dagen før maleren kommer", list: [
      "Tag billeder af stuk, rosetter, lister.",
      "Flyt møbler ud af rummet (eller midt på gulvet + plastik).",
      "Tag billeder, planter, gardiner og gardinstænger ned.",
      "Spartl små huller selv (sparer 800–1.500 kr.).",
      "Vask vægge for fedt og snavs (især over radiatorer).",
      "Sørg for fri adgang fra dør til arbejdsområde.",
      "Skub større tæpper væk eller rul dem op.",
    ]},
    { heading: "Det du IKKE skal gøre selv", list: [
      "Afmontere stikkontakter eller kontaktudtag.",
      "Slibe gamle blymalede flader (før 1970).",
      "Skrabe blæremaling af uden støvsugning.",
      "Fjerne tunge spejle eller installeret indretning.",
    ]},
    { heading: "Spar mere — vælg klogt", list: [
      "Vælg lyse farver — 1 lag mindre.",
      "Få fast pris i stedet for timepris.",
      "Saml flere rum i ét tilbud (rabat 10–20%).",
      "Brug BoligJob-fradraget — 25% retur op til 12.900 kr.",
    ]},
    { heading: "Efter maleren — det du selv tager", list: [
      "Hænge billeder/spejle på samme dag (vådmaling = mærker).",
      "Vente 14 dage med at vaske væggene.",
      "Skifte gardiner først efter 48 timer.",
    ]},
  ],
});

export default Post;