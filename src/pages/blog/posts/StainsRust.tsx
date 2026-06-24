import { defineBlogPost } from "../defineBlogPost";

export default defineBlogPost({
  slug: "fjern-rustpletter-fra-toej",
  keywords: "rustpletter tøj, fjern rust fra tøj, rustfjerner stof, citronsyre rust, rust på hvidt tøj, oxalsyre, rust hvid skjorte",
  faq: [
    { q: "Hvor kommer rustpletter på tøj fra?", a: "Som regel fra metalbøjler, snapknapper, jernpartikler i vaskemaskinens trommel eller jernholdigt brøndvand. Tjek altid kilden, ellers kommer pletterne igen." },
    { q: "Virker klor på rust?", a: "Nej — klor fikserer rustpletter og kan gøre dem permanente. Brug syre (citronsyre, eddike eller oxalsyre)." },
    { q: "Er oxalsyre farlig?", a: "Ja, den er ætsende og kræver handsker + udluftning. Den virker godt på indtørrede rustpletter, men brug citronsyre først hvis pletten er ny." },
  ],
  sections: [
    { paragraphs: ["Rust fjernes med syre, ikke base. Den vigtigste regel: aldrig klor og aldrig tørretumbler før pletten er væk."] },
    { heading: "Metode 1: Citronsyre + sol (mild)", ordered: [
      "Drys friskpresset citronsaft eller 1 tsk citronsyre opløst i ½ dl varmt vand på pletten.",
      "Drys salt ovenpå — salt accelererer reaktionen.",
      "Læg tøjet i direkte sol i 2 timer.",
      "Skyl i koldt vand og vask som normalt.",
    ] },
    { heading: "Metode 2: Hvid eddike + salt", paragraphs: [
      "Bland 50/50 hvid eddike og vand, tilsæt 1 spsk groft salt. Læg pletten i blød i 30 min, skyl, vask.",
    ] },
    { heading: "Metode 3: Oxalsyre / rustfjerner (gamle pletter)", paragraphs: [
      "Køb rustfjerner med oxalsyre på byggemarked. Følg anvisningen — typisk 5 min på pletten, skyl grundigt. BÆR HANDSKER OG SØRG FOR UDLUFTNING.",
    ] },
    { heading: "Specialtilfælde", list: [
      "Hvid bomuld: alle tre metoder kan bruges",
      "Kulørt tøj: kun citronsyre — eddike og oxalsyre kan blege",
      "Uld og silke: send til renseri",
      "Denim: citronsyre + sol; pas på falmning",
    ] },
    { heading: "Find kilden — ellers kommer rusten igen", list: [
      "Tjek vaskemaskinens trommel for jernpartikler (brug citronsyre i tom maskine)",
      "Brøndvand med jern kræver filter eller central afkalker",
      "Metalbøjler — skift til plast eller trælagre",
      "Snapknapper og lynlåse — patiner med klar lak indvendigt",
    ] },
  ],
});