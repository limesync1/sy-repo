import { defineBlogPost } from "../defineBlogPost";

export default defineBlogPost({
  slug: "forhandl-prisen-paa-haandvaerker",
  keywords: "forhandl håndværker pris, spar på håndværker, billigere håndværker tilbud, sammenlign håndværkertilbud, materialer separat, prisaftale håndværker",
  faq: [
    { q: "Er det \"smålig\" at forhandle?", a: "Nej — håndværkere forventer det, og indregner ofte en buffer på 5–15% i første tilbud netop fordi de regner med forhandling. Det er fagligt acceptabelt at spørge ind." },
    { q: "Skal jeg vælge det billigste tilbud?", a: "Ikke nødvendigvis. Vælg det tilbud der har klarest specifikation og bedste garanti — selv hvis det er 5–10% dyrere. Det dyreste er sjældent en \"fejlbestilling\"." },
    { q: "Må man bruge ét tilbud til at presse et andet?", a: "Ja, hvis du er ærlig. Sig fx \"jeg har fået X kr. fra Y firma — kan du matche det med samme garanti?\". At lyve om tilbud er kortsigtet — branchen er lille." },
  ],
  sections: [
    { paragraphs: ["Forhandling om håndværkerpriser handler ikke om at presse leverandøren ned — det handler om at få det rigtige indhold for de rigtige penge. 5 teknikker der typisk sparer 8–15% uden at sænke kvaliteten."] },
    { heading: "1. Få altid 3 tilbud", paragraphs: ["Prisspredning er typisk 25–30% på samme opgave. Ét tilbud er ikke et tilbud — det er en oplysning. Først ved 3+ ved du om en pris er rimelig."] },
    { heading: "2. Spørg ind til poster med høj margin", paragraphs: ["Materialer og udkørsel er ofte hvor håndværkere lægger størst margin. Bed om materialeliste med priser — eller tilbyd at købe materialerne selv (men kun hvis det er aftalt skriftligt at det ikke ændrer garantien)."] },
    { heading: "3. Forhandl materialer separat", paragraphs: ["Mange håndværkere har 20–35% avance på materialer. Hvis du selv køber køkken, vask, fliser eller hvidevarer, kan du ofte spare betydeligt — men spørg først om håndværkeren accepterer det uden at fjerne sin garanti på arbejdet."] },
    { heading: "4. Brug tid som forhandlingskort", paragraphs: ["Har du tid? Tilbyd håndværkeren at opgaven kan starte i en \"lav-sæson\" (typisk januar-marts og august) hvor de har huller i kalenderen. Det giver ofte 5–10% rabat."] },
    { heading: "5. Spørg om \"klippekortsrabat\"", paragraphs: ["Skal du have flere mindre opgaver (male, små tømrerting, opsætning af lamper), så saml dem til ét tilbud. Mindre kørsel og opstart pr. opgave giver typisk 10–15% lavere samlet pris."] },
    { heading: "Det MÅ du ikke", list: [
      "Forhandle ned ved at fjerne forsikring eller garanti",
      "Acceptere kontant betaling for rabat — du mister forbrugerbeskyttelsen",
      "Forhandle ned hvis omfanget reelt er uklart — det fører til ekstraregninger",
    ] },
  ],
});