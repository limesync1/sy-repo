import { defineBlogPost } from "../defineBlogPost";

const Post = defineBlogPost({
  slug: "hvad-koster-flytterengoering-2026",
  keywords: "flytterengøring pris, hvad koster fraflytningsrengøring, fraflyt rengøring 2026, m2 pris flytterengøring",
  faq: [
    { q: "Hvad er gennemsnitsprisen for flytterengøring i 2026?", a: "60–110 kr./m² inkl. moms. En 75 m² lejlighed lander typisk på 4.500–8.250 kr. inkl. vinduer og hårde hvidevarer." },
    { q: "Er det med eller uden vinduer og hårde hvidevarer?", a: "Læs altid med! Mange billige tilbud udelukker disse. Standard hos seriøse firmaer: ja, men spørg altid skriftligt." },
    { q: "Skal jeg betale ekstra hvis udlejer kasserer rengøringen?", a: "Hos firmaer med 100% afleveringsgaranti: nej — de kommer tilbage. Uden garanti: ja. Det er den vigtigste linje i tilbuddet." },
    { q: "Er flytterengøring fradragsberettiget?", a: "Ja, BoligJob-fradraget gælder også flytterengøring (op til 12.300 kr./voksen i 2026). Firmaet skal være momsregistreret." },
    { q: "Hvornår skal jeg booke?", a: "3–6 uger før fraflytning i sommerhalvåret. 1–2 uger om vinteren. Tjek at de kan komme dagen FØR aflevering, så du kan udbedre småting." },
  ],
  sections: [
    { heading: "Pris pr. m² 2026 (inkl. moms)", body: (
      <div className="not-prose my-6 overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/60"><tr><th className="px-4 py-3">Type</th><th className="px-4 py-3">Pris pr. m²</th><th className="px-4 py-3">75 m² lejlighed</th></tr></thead>
          <tbody className="divide-y divide-border">
            <tr><td className="px-4 py-3">Standard flytterengøring</td><td className="px-4 py-3">60–90 kr.</td><td className="px-4 py-3">4.500–6.750 kr.</td></tr>
            <tr><td className="px-4 py-3">Inkl. vinduer + hvidevarer</td><td className="px-4 py-3">75–110 kr.</td><td className="px-4 py-3">5.625–8.250 kr.</td></tr>
            <tr><td className="px-4 py-3">Inkl. 100% afleveringsgaranti</td><td className="px-4 py-3">90–135 kr.</td><td className="px-4 py-3">6.750–10.125 kr.</td></tr>
          </tbody>
        </table>
      </div>
    )},
    { heading: "Hvad SKAL være med", list: [
      "Køkken: skabe ind/ud, ovn, emhætte, køl/frys (afrimet), opvaskemaskine.",
      "Bad: brusekabine, toilet, vask, fliser, fuger, spejl.",
      "Vinduer ind- og udvendigt (inkl. karme og rammer).",
      "Døre, lister, fodlister, kontakter.",
      "Gulve: støvsuget + vasket.",
      "Skabe og garderober: tørret af ind/ud.",
      "Tomning af tagrender ved udlejnings-rækkehuse.",
    ]},
    { heading: "Tjek tilbuddet for skjulte gebyrer", list: [
      "Kørselsgebyr (især uden for storbyer).",
      "Vinduestillæg (typisk 200–500 kr.).",
      "Tillæg for hårde hvidevarer separat (250–500 kr. pr. stk).",
      "Tillæg ved misvedligehold (fastbrændt fedt, kalk).",
      "Tillæg for haveskur, kælderum, loftrum.",
    ]},
    { heading: "Sådan sparer du 20–30%", ordered: [
      "Få 3 tilbud — pris-spændet er typisk 30–40%.",
      "Aflever boligen så ryddet som muligt (de tager timer på at flytte ting væk).",
      "Vælg midt på måneden (1. og 15. er travleste).",
      "Brug BoligJob-fradrag — 35% retur for de fleste.",
      "Forhandl: 5–10% rabat er normalt hvis du er prisbevidst.",
    ]},
  ]
});

export default Post;
