import { defineBlogPost } from "../defineBlogPost";

export default defineBlogPost({
  slug: "rengoering-af-traeoverflader",
  keywords: "rengøring af træ, rens trægulv, plej trækøkken, sæbebehandlet træ, lakeret træ rens, olieret bordplade pleje, terrassebrædder rens",
  faq: [
    { q: "Må jeg vaske trægulv med vand?", a: "Kun fugtigt — aldrig vådt. Vand der står på trægulv trænger ind i revner og får træet til at hæve og revne. Klem klude meget op."},
    { q: "Hvorfor må jeg ikke bruge eddike på træ?", a: "Eddike er syre og kan ødelægge fernis og olielag over tid. Brug mild sæbe eller specialprodukt til træ."},
    { q: "Hvor ofte skal en olieret bordplade plejes?", a: "Nyt: olie hver uge i en måned. Derefter hver 2.–3. måned afhængigt af brug. Når vandet ikke længere perler — så er det tid." },
  ],
  sections: [
    { paragraphs: ["Tre slags træoverflader kræver tre forskellige rens- og plejemetoder. Forkert metode = misfarvning, opsvulmning eller mistet beskyttelse."] },
    { heading: "1. Sæbebehandlet træ (lyst gulv, hvidolie)", paragraphs: [
      "Vask med trægulvssæbe (Faxe eller Skovgaard) opløst i lunkent vand — 1 spsk pr. 5 liter. Brug to spande: én med sæbevand, én med rent. Klem kluden så den knapt drypper. Sæben efterlader et beskyttende fedtlag — derfor bliver sæbebehandlet gulv pænere af brug, ikke værre."  ,
    ] },
    { heading: "2. Lakeret træ (klar lak eller olielak)", paragraphs: [
      "Mild allrens (uden ammoniak), fugtig microfiber. Aldrig brun sæbe — lakken kan ikke optage det og bliver klistret. Tør altid med tør klud bagefter for at undgå skjolder."  ,
    ] },
    { heading: "3. Olieret træ (køkkenbordplade, terrassebrædder)", ordered: [
      "Daglig: tør af med fugtig klud + lidt opvaskemiddel.",
      "Ugentlig: brun sæbe + lunkent vand.",
      "Månedligt: tør med lidt madlavningsolie (kun spiselig på bordplader).",
      "Når vand ikke perler: påfør hård voks-olie eller specialolie.",
    ] },
    { heading: "Ubehandlet træ", paragraphs: [
      "Brun sæbe eller specielt grovrens. Skyl med rent vand bagefter. Lad tørre helt før brug. Beskyt evt. med olie eller voks bagefter — ellers suger træet snavs igen."  ,
    ] },
    { heading: "Pletter på træ", list: [
      "Vand-skjold på olieret: slib let med 240 papir, olie igen",
      "Fedtplet på sæbebehandlet: drys natron, lad ligge, tør væk",
      "Misfarvning fra metal: citronsaft + sol",
      "Rødvinsplet: dup straks med talkum, vask med sæbe",
    ] },
    { heading: "Terrasse og havemøbler", paragraphs: [
      "Højtryksrenser kun på max 100 bar og 30 cm afstand — ellers river du fiberen op. Brug terrasse-vask eller brun sæbe. Olie eller terrasseolie en gang årligt."  ,
    ] },
  ],
});