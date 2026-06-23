import { defineBlogPost } from "../defineBlogPost";

export default defineBlogPost({
  slug: "el-tjek-foer-koeb-af-bolig",
  keywords: "el-tjek bolig, eltjek inden boligkøb, autoriseret elektriker, el-installationsrapport, HFI-relæ, sikkerhedsgennemgang el",
  faq: [
    { q: "Er et el-tjek lovpligtigt før salg af bolig?", a: "Nej, men sælger har oplysningspligt om kendte fejl. En el-installationsrapport beskytter både sælger og køber." },
    { q: "Hvad koster et el-tjek?", a: "Et standard el-tjek af en bolig op til 150 m² koster typisk 1.500–2.800 kr. inkl. moms." },
    { q: "Hvad finder elektrikeren typisk?", a: "Manglende HFI/HPFI-relæ, gamle stofledninger, manglende jord i stikkontakter, ulovlige forlængere bag køkkenelementer og overophedede klemmer i tavlen." },
  ],
  sections: [
    { paragraphs: ["Et el-tjek inden boligkøb er en af de bedste forsikringer du kan tegne for under 3.000 kr. — det kan afsløre fejl der ellers ville koste 20.000–80.000 kr. at rette efter overtagelse."] },
    { heading: "Det gennemgår elektrikeren", list: ["El-tavle og automatsikringer", "HFI/HPFI-relæets funktion", "Jordforbindelse i alle stikkontakter", "Kabelføring på loft og i krybekælder", "Køkken og bad (særlige zoner)", "Lampeudtag, dimmere og lyskontakter", "Synlige installationer i bryggers og garage"] },
    { heading: "Hvornår er det især vigtigt?", paragraphs: ["Huse bygget før 1975 har ofte stofledninger der knækker når isoleringen tørrer ud. Boliger med eget HFI uden HPFI er ikke længere tilladt at tilslutte ny installation til. Og keramiske skruesikringer i tavlen indikerer at hele installationen typisk skal opgraderes."] },
  ],
});
