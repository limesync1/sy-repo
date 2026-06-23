import { defineBlogPost } from "../defineBlogPost";

export default defineBlogPost({
  slug: "skorstensfejer-pligt-og-pris",
  keywords: "skorstensfejer pris, skorstensfejning lovpligt, skorstenssyn, brændeovn skorstensfejer, fejning interval, brandsikkerhed brændeovn",
  faq: [
    { q: "Er det lovpligtigt at få skorstenen fejet?", a: "Ja — alle skorstene i brug er omfattet af det kommunale skorstensfejergebyr. Fejningen er lovpligtig og udføres typisk 1–2 gange årligt." },
    { q: "Hvad koster en skorstensfejer i 2026?", a: "Det lovpligtige gebyr opkræves typisk via ejendomsskatten og ligger på 350–650 kr./år afhængigt af kommune og antal skorstene." },
    { q: "Hvad sker der hvis jeg afmelder brændeovnen?", a: "Skorstenen skal stadig vedligeholdes, men du kan ansøge kommunen om reduceret eller bortfaldet gebyr hvis ovnen er afmeldt og skorstenen lukket." },
  ],
  sections: [
    { paragraphs: ["Skorstensfejning er en af de få lovpligtige boligservices i Danmark. Reglerne findes i bygningsreglementet, og fejningen håndteres af den kommunalt udpegede skorstensfejer."] },
    { heading: "Hvor ofte skal der fejes?", list: [
      "Brændeovn i daglig brug: 2 gange årligt",
      "Lejlighedsvis brug: 1 gang årligt",
      "Pejs i lejlighedsvis brug: 1 gang årligt",
      "Centralvarme på fast brændsel: 2 gange årligt",
      "Olie- eller gasfyr: 1 gang årligt (typisk via servicekontrakt)",
    ] },
    { heading: "Andre opgaver skorstensfejeren udfører", paragraphs: ["Ud over selve fejningen kan skorstensfejeren udføre nybygningssyn (lovpligtigt ved ny brændeovn), tæthedsprøvning, kamerainspektion ved mistanke om revner, og kontrolbesøg efter skorstensbrand. Ny brændeovn skal altid godkendes af skorstensfejer inden ibrugtagning."] },
  ],
});
