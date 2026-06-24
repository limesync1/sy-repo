import { defineBlogPost } from "../defineBlogPost";

const Post = defineBlogPost({
  slug: "fjern-huller-i-vaeg-selv",
  keywords: "huller i væg, spartle vaeg, lukke huller diy, fjern huller fra soem",
  faq: [
    { q: "Hvad bruger jeg til små søm- og skruehuller?", a: "Letspartelmasse (fx Polyfilla) på finger eller spartel. Tørrer på 30 min, slibes med 220-korn, kan overmales samme dag." },
    { q: "Hvad med dyvelhuller?", a: "Skub dyvlen helt i bund eller skær den af. Spartl 2 gange — første lag krymper, andet lag glattes." },
    { q: "Store huller op til 10 cm?", a: "Lap med gipsplade-lapper eller selvklæbende vævs-tape, spartl 2–3 gange med våd kant." },
    { q: "Skal hele væggen males bagefter?", a: "På malede vægge: oftest ja, da pletmaling ses i sidelys. På strukturtapet/væv kan pletmaling være nok hvis farven er ny." },
  ],
  sections: [
    { heading: "Sådan lukker du små huller (under 5 mm)", ordered: [
      "Skub eventuel støv/papir ud af hullet.",
      "Påfør spartelmasse med finger eller lille spartel.",
      "Skrab over med kanten — overskud væk.",
      "Lad tørre 30 min.",
      "Slib med 220-korn slibeklods.",
      "Pletmal med samme maling som væggen.",
    ]},
    { heading: "Sådan lukker du dyvelhuller (8–12 mm)", ordered: [
      "Skær dyvlen lige med væggen eller bank den 2 mm ind.",
      "Fyld med spartelmasse — pres ind.",
      "Lad tørre 1 time.",
      "Spartl andet lag for at udjævne krympningen.",
      "Slib og mal.",
    ]},
    { heading: "Sådan lapper du store huller (5–10 cm)", ordered: [
      "Skær hullet rent i firkant med hobbykniv.",
      "Læg gipsplade-lap bagved eller selvklæbende vævstape over.",
      "Spartl første lag — pres ind, lad tørre 4 timer.",
      "Spartl andet lag med våd kant — træk 5 cm ud over hullet.",
      "Spartl tredje lag tyndt — trækker over kanterne.",
      "Slib hele området og mal HELE væggen for at undgå skyggetegninger.",
    ]},
    { heading: "Værktøj og materiale", list: [
      "Letspartelmasse 500 g — 45 kr.",
      "Spartler 5/10/20 cm — 80 kr.",
      "Slibeklods 220-korn — 35 kr.",
      "Gipsplade-rest + vævstape til store huller — 75 kr.",
    ]},
  ],
});

export default Post;