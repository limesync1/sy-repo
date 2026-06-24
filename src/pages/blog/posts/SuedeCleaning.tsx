import { defineBlogPost } from "../defineBlogPost";

export default defineBlogPost({
  slug: "rens-og-vask-af-ruskind",
  keywords: "rens ruskind, vask ruskind, ruskind sko rens, ruskindsbørste, fjern pletter ruskind, ruskindsjakke pleje, ruskind imprægnering",
  faq: [
    { q: "Tåler ruskind vand?", a: "Kort tid, ja — men det skal tørres rigtigt: aldrig på radiator eller i sol. Brug avispapir indeni og lad tørre langsomt ved stuetemperatur." },
    { q: "Kan jeg vaske ruskindsko i maskinen?", a: "Nej. Maskinen filter ruskindets struktur og det bliver hård som karton. Brug altid tør- eller fugtmetode i hånden." },
    { q: "Hvad gør jeg ved fede pletter?", a: "Drys talkum eller babypudder på, lad ligge over natten, børst af. Gentag op til 3 gange. Indtørrede fedtpletter kræver ofte en skomager." },
  ],
  sections: [
    { paragraphs: ["Ruskind har en åben fiberstruktur der binder snavs anderledes end glat læder. Brug aldrig sæbe og vand som første instinkt — det ødelægger overfladen permanent."] },
    { heading: "Nødvendigt udstyr", list: [
      "Ruskindsbørste (med messingbørster på den ene side)",
      "Hvidt viskelæder eller specielt ruskindsviskelæder",
      "Imprægneringsspray",
      "Talkum eller babypudder",
    ] },
    { heading: "Daglig pleje", ordered: [
      "Børst altid efter brug — i én retning, med korn.",
      "Imprægnér nyt ruskind inden første brug.",
      "Genimprægnér efter hver 4. brug eller hver gang det bliver vådt.",
    ] },
    { heading: "Lette pletter (tør metode)", paragraphs: [
      "Børst pletten først. Gnid med viskelæder. Børst igen for at rejse fiberen.",
    ] },
    { heading: "Våde pletter (vandskjolder)", paragraphs: [
      "Lad tørre helt. Børst grundigt. Hvis skjolden bliver, fugt hele ruskindet let ud — så bliver hele overfladen ensartet. Tør langsomt.",
    ] },
    { heading: "Fedtpletter", ordered: [
      "Drys talkum tykt på pletten.",
      "Lad ligge over natten.",
      "Børst af.",
      "Gentag op til 3 gange. Sender til skomager hvis det stadig sidder.",
    ] },
    { heading: "Saltkanter på vintersko", paragraphs: [
      "Bland 50/50 vand + eddike. Fugt en klud, dup pletten. Lad tørre, børst, imprægnér igen."  ,
    ] },
    { heading: "Det skal du IKKE gøre", list: [
      "Vask i maskinen",
      "Vådt læderfedt — efterlader pletter",
      "Tørretumbler eller direkte varme",
      "Almindelig sko-cream",
    ] },
  ],
});