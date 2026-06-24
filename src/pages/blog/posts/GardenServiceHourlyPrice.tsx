import { defineBlogPost } from "../defineBlogPost";

const Post = defineBlogPost({
  slug: "hvad-koster-haveservice-pr-time-2026",
  keywords: "haveservice pris, havemand timepris, haveservice 2026, pris havemand, graesslaaning pris",
  faq: [
    { q: "Hvad er gennemsnits timepris for haveservice i 2026?", a: "295–595 kr./time inkl. moms. Hovedstaden ligger højest, Nordjylland og Vestjylland lavest." },
    { q: "Fast pris eller timepris til haveopgaver?", a: "Fast pris til afgrænsede opgaver (hækklipning, græsslåning). Timepris til vedligehold og blandet arbejde. Spørg altid om begge muligheder." },
    { q: "Hvad koster græsslåning pr. besøg?", a: "250–750 kr. afhængig af havestørrelse og frekvens. Fast 14-dags aftale er typisk 30% billigere pr. besøg end engangs." },
    { q: "Er haveservice fradragsberettiget?", a: "Ja, under serviceloven (BoligJob-fradrag) — op til 12.300 kr./voksen i 2026. Krav: momsregistreret firma og digital betaling." },
    { q: "Bortskaffelse af haveaffald — betaler jeg ekstra?", a: "Næsten altid ja. 200–600 kr. pr. tilladelse afhængig af mængde. Spørg ind, så du ved hvad totalbeløbet bliver." },
  ],
  sections: [
    { heading: "Timepris 2026 efter region (inkl. moms)", body: (
      <div className="not-prose my-6 overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/60"><tr><th className="px-4 py-3">Region</th><th className="px-4 py-3">Timepris</th><th className="px-4 py-3">Note</th></tr></thead>
          <tbody className="divide-y divide-border">
            <tr><td className="px-4 py-3">Hovedstaden</td><td className="px-4 py-3">395–595 kr.</td><td className="px-4 py-3">Højest pga. løn + transport</td></tr>
            <tr><td className="px-4 py-3">Midtjylland</td><td className="px-4 py-3">365–545 kr.</td><td className="px-4 py-3">Aarhus + opland</td></tr>
            <tr><td className="px-4 py-3">Syddanmark</td><td className="px-4 py-3">305–525 kr.</td><td className="px-4 py-3">Trekantsområdet aktivt</td></tr>
            <tr><td className="px-4 py-3">Nordjylland</td><td className="px-4 py-3">325–495 kr.</td><td className="px-4 py-3">Snerydning inkluderet ofte</td></tr>
            <tr><td className="px-4 py-3">Vestjylland</td><td className="px-4 py-3">295–465 kr.</td><td className="px-4 py-3">Billigst i landet</td></tr>
          </tbody>
        </table>
      </div>
    )},
    { heading: "Fast pris vs. timepris", list: [
      "Hækklipning: fast pris pr. lbm. (25–75 kr.) — meget mere forudsigeligt.",
      "Græsslåning: fast pris pr. besøg ved abonnement, timepris ved engangs.",
      "Forårsoprydning: timepris (svært at estimere).",
      "Plantning og anlæg: fast pris efter besigtigelse.",
    ]},
    { heading: "Sådan får du den bedste pris", ordered: [
      "Tegn årsaftale — typisk 15–25% billigere end engangs.",
      "Få 3 tilbud — pris-spændet er 25–40%.",
      "Saml opgaver: hæk + græs + bortskaffelse i ét besøg = lavere pr. opgave.",
      "Vinterpris (november–februar): mange firmaer giver rabat.",
      "Brug BoligJob-fradrag.",
    ]},
  ]
});

export default Post;
