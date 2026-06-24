import { defineBlogPost } from "../defineBlogPost";

export default defineBlogPost({
  slug: "depositum-tilbage-flytteopgoerelse-lejer",
  keywords: "depositum tilbage, flytteopgørelse, nyistandsat lejlighed, normalt slid lejer, flytteafregning 2026, krav om istandsættelse",
  faq: [
    { q: "Hvor lang frist har udlejer til at sende flytteopgørelse?", a: "6 uger fra fraflytningsdagen. Sker det ikke, mister udlejer retten til at modregne i depositum (lejelovens § 187 fra 2022)." },
    { q: "Må udlejer kræve nyistandsat?", a: "Nej, ikke siden lejeloven blev ændret 1. juli 2015. Krav om \"nyistandsættelse\" er ugyldigt. Udlejer kan KUN kræve dækning for skader udover normalt slid, dokumenteret med faktura." },
    { q: "Hvad er normalt slid?", a: "Småmærker på vægge, lette ridser i gulv, krogehuller i normal tæthed, falmede farver fra sol. Det dækker du IKKE for. Hak, store huller, brud, brændemærker = skade." },
  ],
  sections: [
    { paragraphs: ["80% af alle depositumkonflikter handler om udlejer der kræver nyistandsat — selvom det har været ulovligt siden 2015. Læs hvad du har krav på, og hvordan du får dit depositum tilbage på 6 uger."] },
    { heading: "Det skal du gøre på flyttedagen", ordered: [
      "Foto/video AF ALT — hvert rum, gulve, vægge, vinduer, hårde hvidevarer.",
      "Aflæs el, vand og varme med foto af målere.",
      "Lav fælles flyttesynsrapport med udlejer — underskrevet.",
      "Aflever ALLE nøgler mod skriftlig kvittering.",
      "Send skriftlig anmodning om flytteopgørelse + bankkonto til depositum.",
    ] },
    { heading: "Hvad udlejer MÅ kræve", list: [
      "Reparation af skader udover normalt slid (huller, brud, brændemærker)",
      "Manglende rengøring — dokumenteret med faktura",
      "Skader fra husdyr (kradsmærker, urinpletter)",
      "Manglende elektriske pærer i fastmonteret armatur",
    ] },
    { heading: "Hvad udlejer IKKE må kræve", list: [
      "Nyistandsat overalt (forbudt siden 2015)",
      "Maling hvor du selv har malet pænt og lyst",
      "Polering af gulv ved normalt slid",
      "Vask af gardiner og persiener (udlejers ansvar)",
      "Småmærker, krogehuller, falmede farver",
    ] },
    { heading: "Hvis udlejer modregner urimeligt", ordered: [
      "Send skriftlig indsigelse indenfor 14 dage.",
      "Bed om faktura/dokumentation på hver post.",
      "Kontakt LLO (Lejernes LO) — gratis rådgivning for medlemmer.",
      "Klag til Huslejenævnet — sagsbehandling 2–6 mdr., gebyr ca. 320 kr.",
      "Sidste udvej: små krav-sag ved byretten (under 50.000 kr.).",
    ] },
  ],
});
