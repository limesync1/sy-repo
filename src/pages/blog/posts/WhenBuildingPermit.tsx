import { defineBlogPost } from "../defineBlogPost";

export default defineBlogPost({
  slug: "hvornaar-skal-du-have-byggetilladelse",
  keywords: "byggetilladelse hvornår, anmeldelse byggesag, kommune byggetilladelse, tilbygning byggetilladelse, carport byggetilladelse, småhusreglement",
  faq: [
    { q: "Skal jeg have byggetilladelse til en carport?", a: "Som hovedregel ja, hvis carporten er over 35 m² samlet med andre småbygninger på grunden. Under skal den anmeldes til kommunen — ikke fuld byggetilladelse." },
    { q: "Hvad koster en byggetilladelse?", a: "Kommunens sagsbehandlingsgebyr er typisk 1.500–4.500 kr. Hertil kommer tegninger fra arkitekt eller byggeteknisk rådgiver (5.000–25.000 kr.) — ofte krævet før kommunen kigger på sagen." },
    { q: "Hvor lang er sagsbehandlingstiden?", a: "Lovgivet max 60 dage for simple sager, op til 6 måneder for komplekse. Beregn realistisk 8–16 uger før du kan grave." },
  ],
  sections: [
    { paragraphs: ["At begynde at bygge uden tilladelse er ikke kun ulovligt — det kan tvinge dig til at rive det færdige byggeri ned igen og betale tvangsbøder. Tjek altid med kommunen FØR du beder håndværkeren starte."] },
    { heading: "Det kræver byggetilladelse", list: [
      "Tilbygning (alt der øger bygningens areal eller højde)",
      "Indvendige ændringer der berører bærende konstruktioner",
      "Nye vinduer/døre i bærende vægge",
      "Vådrum i rum der ikke tidligere har været vådrum",
      "Småbygninger over 50 m² samlet",
      "Tagudvidelse, kvist, ovenlysvindue større end 1 m²",
    ] },
    { heading: "Kun anmeldelse (lettere proces)", list: [
      "Carport/skur op til 35–50 m² samlet (afhænger af kommune)",
      "Drivhus under 10 m²",
      "Mindre skel- og hegnsændringer",
    ] },
    { heading: "Kræver IKKE tilladelse", list: [
      "Indvendig maling og gulvarbejde",
      "Udskift af køkken/bad uden ændring af installationer",
      "Tagrender og tagsten 1:1",
      "Terrasse op til 30 cm over terræn",
    ] },
    { heading: "Sådan gør du", ordered: [
      "Ring til kommunens byggesagsafdeling — beskriv opgaven kort.",
      "Få bekræftelse pr. mail om tilladelse er nødvendig.",
      "Hyr byggeteknisk rådgiver eller arkitekt til tegninger.",
      "Indsend ansøgning via Byg og Miljø (bygogmiljoe.dk).",
      "Vent på tilladelse FØR håndværker starter — ellers personligt ansvar.",
    ] },
  ],
});
