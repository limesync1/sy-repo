import { defineBlogPost } from "../defineBlogPost";

export default defineBlogPost({
  slug: "hpfi-relae-springer",
  keywords: "hpfi springer, hpfi relae udløser, hpfi springer hele tiden, fejlfinding hpfi, jordfejl, elektriker hpfi",
  faq: [
    { q: "Hvorfor springer HPFI'en hele tiden?", a: "HPFI udløser ved jordfejl — strøm der løber 'ved siden af' kredsløbet, typisk gennem fugt, beskadiget isolering eller defekte hårde hvidevarer. Den beskytter mod elektrisk stød, så den skal IKKE bare slås til igen uden fejlfinding." },
    { q: "Hvor farligt er det at have HPFI der springer?", a: "Selve HPFI'en der springer er IKKE farligt — det er din sikring der virker. Det farlige er årsagen: en jordfejl der uden HPFI ville give elektrisk stød." },
    { q: "Må jeg selv lave fejlfinding på HPFI?", a: "Du må trække stik ud, bryde gruppeafbrydere og teste hvilken kreds der udløser fejlen. Du må IKKE åbne stikkontakter, fastinstallationer eller selve eltavlen — det kræver autoriseret elektriker." },
    { q: "Hvad koster det at få elektrikeren til at finde fejlen?", a: "1.500–3.500 kr. for fejlfinding (1–3 timer + udrykning). Hvis fejlen er en defekt stikkontakt eller kabelfejl, kommer reparation oven i (typisk 800–2.500 kr.)." },
    { q: "Skal HPFI testes regelmæssigt?", a: "Ja. Tryk på testknappen (mærket T eller TEST) hver 6. måned — den skal udløse straks. Hvis ikke, ring elektriker øjeblikkeligt; den fungerer ikke som beskyttelse længere." },
  ],
  sections: [
    { paragraphs: [
      "Når HPFI-relæet udløser, beskytter det dig mod elektrisk stød. Det er ikke en fejl ved relæet — det er en fejl et sted i installationen, der kunne være livsfarlig uden HPFI. Sådan finder du fejlen sikkert, og hvornår du skal stoppe og ringe efter elektriker.",
    ] },
    { heading: "Trin-for-trin: isoler fejlen", ordered: [
      "Sluk alle elektriske apparater og træk de fleste stik ud.",
      "Slå alle gruppeafbrydere i eltavlen FRA.",
      "Slå HPFI'en TIL.",
      "Slå gruppeafbryderne TIL én ad gangen, vent 10 sekunder mellem hver. Når HPFI'en udløser — sidste indkoblede gruppe har fejlen.",
      "Slå denne gruppes afbryder TIL igen, tilslut nu apparater på den gruppe ÉT ad gangen, vent 30 sek.",
      "Det apparat der får HPFI'en til at udløse, er den sandsynlige fejl.",
    ] },
    { heading: "Hyppige syndere", list: [
      "Vaskemaskine eller opvasker med defekt varmelegeme (typisk efter 5+ år)",
      "Beskadiget oplader (mobil, robotstøvsuger, e-cykel)",
      "Udendørsstik eller -lampe med vand indenfor",
      "Tørretumbler med tilstoppet kondensbeholder",
      "Defekt vandvarmer eller varmtvandsbeholder",
      "Beskadiget kabel (knækket ved klemme, naglet ind i ledning)",
    ] },
    { heading: "Stop hér og ring elektriker hvis...", list: [
      "HPFI'en udløser uden at nogen apparater er tilsluttet (fast installation har fejl)",
      "Den udløser straks når en specifik gruppe slås til, uanset apparater (kabel- eller stikkontaktfejl)",
      "Du kan se brandskader, lugte brændt eller se røg",
      "Den udløser kun i fugtigt vejr (sandsynlig udendørsfejl)",
      "Du er i tvivl — el-fejl er IKKE et område at gætte på",
    ] },
    { heading: "Halvårligt test", paragraphs: [
      "Tryk på TEST-knappen på HPFI'en hver 6. måned. Den skal udløse straks. Hvis ikke — relæet beskytter dig ikke længere, og det skal udskiftes (1.200–2.500 kr. inkl. elektriker). HPFI har en levetid på 10–15 år.",
    ] },
  ],
});
