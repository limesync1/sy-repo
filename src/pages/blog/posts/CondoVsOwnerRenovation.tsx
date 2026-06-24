import { defineBlogPost } from "../defineBlogPost";

export default defineBlogPost({
  slug: "andelsbolig-vs-ejerbolig-renovering-regler",
  keywords: "andelsbolig renovering regler, ejerbolig renovering, andelsforening tilladelse, vedtægter ombygning, råderet andelsbolig, ejerlejlighed renovering",
  faq: [
    { q: "Skal jeg have foreningens tilladelse i en andelsbolig?", a: "Ja, ved alt der ændrer bærende konstruktioner, installationer (vand/el/varme) eller facadens udtryk. Indvendig maling og gulve er fri. Tjek altid vedtægter og husorden FØR håndværker bestilles." },
    { q: "Hvad er forskellen ved ejerlejlighed?", a: "Ejerlejlighed har større råderet end andel — du må normalt ændre frit indvendigt. Men bærende vægge, badeværelser (vådrumssikring) og vinduer kræver stadig ejerforeningens godkendelse." },
    { q: "Hvad sker der hvis jeg ombygger uden tilladelse?", a: "Foreningen kan kræve det ført tilbage på din regning, og du risikerer bod i vedtægterne. Ved fraflytning kan din andel/ejerlejlighed ikke godkendes til salg uden lovliggørelse — meget dyrt." },
  ],
  sections: [
    { paragraphs: ["Renovering i andels- eller ejerlejlighed har helt andre regler end i en villa. Springer du tilladelsen over, kan en pæn badeværelses-renovering forvandles til 100.000 kr. i ekstra omkostninger ved næste vurdering."] },
    { heading: "Andelsbolig — det skal du have godkendt", list: [
      "Alt vådrumsarbejde (bad, toilet, køkken-installationer)",
      "Flytning eller fjernelse af vægge (også ikke-bærende)",
      "Ændring af el-tavle eller stikkontakters placering",
      "Nye vinduer eller døre i facaden",
      "Køkkenudskift med ny placering af vand/afløb",
      "Gulvtyper (mange foreninger forbyder klinker på etage)",
    ] },
    { heading: "Ejerlejlighed — kræver fælles godkendelse", list: [
      "Brud i bærende vægge — kræver ingeniørberegning",
      "Vådrumsændringer — ofte tilstandsrapport krævet",
      "Ny altan eller udvendige ændringer",
      "Vinduesudskift (typisk fælles eje i facaden)",
      "Brandceller / lyddæmpning ved gulvskift",
    ] },
    { heading: "Sådan gør du — trin for trin", ordered: [
      "Læs vedtægter, husorden og evt. råderetsregler.",
      "Send skriftlig ansøgning til bestyrelse med tegninger.",
      "Vent på SKRIFTLIG godkendelse — referater er ikke nok.",
      "Indhent håndværkertilbud med reference til godkendelsen.",
      "Få vådrumssikring og el-installation udført af AUTORISERET firma.",
      "Gem dokumentation til næste vurdering eller salg.",
    ] },
    { heading: "Råderet — hvad du faktisk har krav på", paragraphs: ["Almindelig råderet giver dig ret til at modernisere køkken og bad uden bestyrelsens tilladelse, men foreningen må stille krav til materialer, faglig udførelse og dokumentation. Forbedringer kan medregnes i din andelsværdi ved salg — kun hvis udført med godkendt firma og dokumentation."] },
  ],
});
