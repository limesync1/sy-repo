import { defineBlogPost } from "../defineBlogPost";

const Post = defineBlogPost({
  slug: "utaet-tag-akut-hvad-gor-du",
  keywords: "utæt tag akut, vandskade tag, tagdækker akut, forsikring vandskade",
  faq: [
    { q: "Hvor hurtigt skal jeg reagere?", a: "Inden for 24 timer — ellers kan vandet trænge ned i konstruktionen og give skimmelsvamp + tabt forsikringsdækning." },
    { q: "Dækker forsikringen?", a: "Bygningsforsikring dækker pludselige skader (orkan, hagl, knækkede tagsten). Den dækker IKKE råd, alder eller manglende vedligehold." },
    { q: "Skal jeg op på taget selv?", a: "Nej — aldrig på vådt tag. Stop indvendigt vandet og afmonter alt vand på loftet. Ring tagdækker udefra." },
    { q: "Hvad koster akut tagdækker?", a: "Udkald aften/nat: 1.500–3.500 kr. + timepris 595–895 kr./t. + materialer. Foreløbig presenning + tætning: 3.000–8.000 kr." },
  ],
  sections: [
    { heading: "Trin 1 — Stop vandskaden indvendigt (de første 5 min)", ordered: [
      "Sluk strømmen til området.",
      "Stil spand under dryp.",
      "Læg presenning eller plastik over møbler.",
      "Bor evt. lille hul i loftspletten så vandet samles ét sted — bedre end at det breder sig.",
      "Tag billeder af alt — til forsikringen.",
    ]},
    { heading: "Trin 2 — Dokumenter for forsikringen", list: [
      "Billeder af loft, vægge, skadede møbler.",
      "Video af dryppet i gang.",
      "Vejrudsigt + dato (skybrud/orkan).",
      "Anmeld inden for 48 timer for max dækning.",
    ]},
    { heading: "Trin 3 — Ring tagdækker", list: [
      "Akut udkald hvis det stadig regner.",
      "Standard udkald hvis vandet er stoppet.",
      "Bed om foreløbig sikring + endeligt tilbud bagefter.",
      "Bed dem dokumentere skadens årsag — vigtigt for forsikringen.",
    ]},
    { heading: "Hvad du IKKE må gøre", list: [
      "Gå på vådt tag — livsfarligt.",
      "Vente til regnen stopper — vandet trænger ned.",
      "Selv lave permanent reparation — kan koste dig forsikringsdækning.",
      "Smide noget væk inden forsikringen har set det.",
    ]},
  ],
});

export default Post;