import { defineBlogPost } from "../defineBlogPost";

const Post = defineBlogPost({
  slug: "tilstoppet-afloeb-selv-eller-vvs",
  keywords: "tilstoppet afløb, afløb stoppet, rense afløb, vvs afløb, hjemme afhjælpning",
  faq: [
    { q: "Hvad er bedst — kemisk afløbsrenser eller mekanisk?", a: "Mekanisk (skraber eller spiral) er bedst og skader ikke rør. Kemiske midler kan ætse ældre rør og er en kortvarig løsning. Brug kun kemisk ved blødt blokeret afløb." },
    { q: "Virker natron + eddike rigtigt?", a: "På overfladisk fedt og biofilm: ja. På massive tilstopninger eller hårklumper: nej. Brug det forebyggende 1× månedligt." },
    { q: "Hvornår skal jeg ringe efter VVS?", a: "Hvis du har prøvet svuppert + spiral uden held, hvis flere afløb er stoppet samtidig, hvis der kommer lugt fra flere rum, eller hvis det er kloakgenne. 800–2.500 kr. inkl. udkald." },
    { q: "Hvad koster en VVS til afløbsrens?", a: "Hverdage: 800–1.500 kr. Aften/weekend: 1.500–3.500 kr. inkl. kørsel og 1 time. Kloak-spuling: 1.500–4.500 kr." },
    { q: "Kan jeg forebygge?", a: "Ja: si i bruseafløbet (hår), undgå fedt i vasken (køl af og smid i skrald), ren afløbene med natron + kogende vand 1× månedligt." },
  ],
  sections: [
    { heading: "Trin 1 — vurder situationen", list: [
      "Kun ét afløb stoppet? Sandsynligvis lokal blokering.",
      "Flere afløb stoppet eller toilet boblende? Sandsynligvis hovedkloak — ring VVS.",
      "Lugt fra alle afløb? Tør vandlås (luft i kloak) eller kloak-blokering.",
    ]},
    { heading: "Trin 2 — DIY metoder i rækkefølge", ordered: [
      "Kogende vand (2–3 l) hældt i 3 omgange — virker på fedt.",
      "Natron + eddike: 1 dl natron, derefter 2 dl 8% eddike, prop til, lad virke 15 min, skyl med kogende vand.",
      "Svuppert (toiletpumpe): luk overløb, dæk med vand, pump kraftigt 10–20× — virker på luftlås.",
      "Afløbsspiral (300–600 kr. i byggemarked): før ind, drej, træk ud — virker på hårklumper.",
      "Skil vandlåsen ad (under håndvasken): læg spand under, skru af, rens, sæt på igen.",
    ]},
    { heading: "Hvad du IKKE skal gøre", list: [
      "Hælde kemisk renser i hvis vandet allerede står højt — det bliver i røret og kan ætse.",
      "Bruge svuppert hvis du lige har hældt kemikalier i — kan sprøjte op.",
      "Banke på røret med hammer.",
      "Ignorere lugt fra flere afløb — det er ofte hovedkloak.",
    ]},
    { heading: "Hvornår VVS er hurtigste vej", list: [
      "Toilet boblende når du bruger vasken: hovedkloak.",
      "Vand kommer op i bruseafløb når du skyller ud: hovedkloak.",
      "Stærk kloaklugt: stankprøp eller kloakgenne.",
      "Du har prøvet alt ovenfor uden held.",
    ]},
  ]
});

export default Post;
