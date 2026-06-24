import { defineBlogPost } from "../defineBlogPost";

export default defineBlogPost({
  slug: "energimaerke-bolig-hvad-betyder-bogstaverne",
  keywords: "energimærke bolig, energimærkning A B C D, hvad betyder energimærke, forbedre energimærke, pris energimærke, energimærke ved salg",
  faq: [
    { q: "Hvad koster et energimærke?", a: "Lejlighed: 2.000–3.500 kr. Parcelhus under 200 m²: 3.500–6.500 kr. Større huse og erhverv: 6.000–14.000 kr. Energimærket er gyldigt i 10 år." },
    { q: "Hvornår er energimærke lovpligtigt?", a: "Ved salg, udlejning og overdragelse af enhver bolig over 60 m². Skal indhentes FØR boligen sættes til salg. Manglende energimærke kan stoppe handel ved tinglysning." },
    { q: "Hvad er en god karakter?", a: "A2020 er højeste, G er laveste. Nybyggeri 2020+ ligger typisk A. Hus fra 1970'erne uden renovering: D–F. Hus fra 1950'erne: F–G. C eller bedre giver typisk 5–8% højere salgspris." },
  ],
  sections: [
    { paragraphs: ["Energimærket er ikke kun en formalitet ved boligsalg — det er den vigtigste indikator for fremtidige varmeregninger OG fortæller dig præcis hvor du kan spare mest. Her er hvad bogstaverne betyder og hvordan du forbedrer karakteren."] },
    { heading: "Skala — kWh/m²/år", body: (
      <div className="not-prose my-4 overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/60 text-foreground">
            <tr><th className="px-4 py-3">Karakter</th><th className="px-4 py-3">Forbrug</th><th className="px-4 py-3">Typisk bolig</th></tr>
          </thead>
          <tbody className="divide-y divide-border">
            <tr><td className="px-4 py-3">A2020</td><td className="px-4 py-3">&lt; 20</td><td className="px-4 py-3">Lavenergi-byggeri 2020+</td></tr>
            <tr><td className="px-4 py-3">A2015</td><td className="px-4 py-3">20–37</td><td className="px-4 py-3">Nybyggeri 2015–2020</td></tr>
            <tr><td className="px-4 py-3">A2010</td><td className="px-4 py-3">37–52</td><td className="px-4 py-3">Nybyggeri 2010–2015</td></tr>
            <tr><td className="px-4 py-3">B</td><td className="px-4 py-3">52–95</td><td className="px-4 py-3">Renoveret ældre bolig</td></tr>
            <tr><td className="px-4 py-3">C</td><td className="px-4 py-3">95–135</td><td className="px-4 py-3">Hus 1980–2000</td></tr>
            <tr><td className="px-4 py-3">D</td><td className="px-4 py-3">135–175</td><td className="px-4 py-3">Hus 1970'erne</td></tr>
            <tr><td className="px-4 py-3">E</td><td className="px-4 py-3">175–225</td><td className="px-4 py-3">Hus 1960'erne</td></tr>
            <tr><td className="px-4 py-3">F</td><td className="px-4 py-3">225–290</td><td className="px-4 py-3">Hus 1950'erne, uisoleret</td></tr>
            <tr><td className="px-4 py-3">G</td><td className="px-4 py-3">&gt; 290</td><td className="px-4 py-3">Ældre, helt uisoleret</td></tr>
          </tbody>
        </table>
      </div>
    ) },
    { heading: "Forbedring — hvad rykker mest", ordered: [
      "Loftsisolering 100→400 mm (5.000–18.000 kr.) — løfter typisk 1–2 trin",
      "Hulmurs-isolering (12.000–25.000 kr.) — kun ældre huse uden isolering",
      "Varmepumpe i stedet for olie/naturgas (60.000–130.000 kr.) — løfter 2–3 trin",
      "Energiruder i alle vinduer (60.000–180.000 kr.) — løfter 1 trin",
      "Solceller (85.000–165.000 kr.) — løfter 1–2 trin",
    ] },
    { heading: "Sådan bestiller du", list: [
      "Brug certificeret energikonsulent fra Energistyrelsens register",
      "Bestil 4–6 uger før boligen sættes til salg",
      "Hav byggetegninger og vedligeholdshistorik klar",
      "Få mundtlig debrief udover skriftlig rapport — den fortæller hvad du skal prioritere",
    ] },
    { heading: "Salgsværdi pr. trin (mæglerstatistik 2024–2025)", paragraphs: ["Hvert trin op (fx fra E til D) hæver typisk salgsprisen 2–4% på et parcelhus. Springet fra D til B (via varmepumpe + isolering) kan løfte salg 6–12% — ofte mere end omkostningerne ved renovering, særligt før et planlagt salg."] },
  ],
});
