import { defineBlogPost } from "../defineBlogPost";

export default defineBlogPost({
  slug: "stillads-faldsikring-regler-haandvaerker",
  keywords: "stillads regler, faldsikring håndværker, stillads pris villa, AT-regler stillads, bygherreansvar stillads, arbejdshøjde regler",
  faq: [
    { q: "Hvornår skal der bruges stillads?", a: "Ved arbejde over 2 m i højden, hvis det varer mere end kort tid eller hvis stigen ikke er sikker. AT-vejledning kræver stillads ved tagarbejde, facaderenovering og malerarbejde i højden." },
    { q: "Hvad koster et stillads?", a: "Standard parcelhus, 2 facader, 2 uger: 8.000–18.000 kr. Hele huset, 4 uger: 18.000–40.000 kr. Pris afhænger af højde, opbygning og lejeperiode." },
    { q: "Hvem har ansvar — bygherre eller håndværker?", a: "Som privat bygherre har du delt ansvar med håndværkeren. Du skal sikre at firmaet har styr på sikkerhed — sker der ulykke, kan du blive medansvarlig. Bed altid om dokumentation for AT-godkendt stillads." },
  ],
  sections: [
    { paragraphs: ["Hver uge sker der alvorlige faldulykker i Danmark — og som privat bygherre kan du faktisk blive medansvarlig. Her er reglerne, priserne og hvad du skal kræve af håndværkeren."] },
    { heading: "Reglerne (Arbejdstilsynet 2026)", list: [
      "Arbejde over 2 m: stillads eller faldsikringssystem KRÆVES",
      "Stillads skal være AT-godkendt med ibrugtagningsattest",
      "Skal tjekkes ugentligt og efter storm",
      "Tagarbejde: snorebørn (kantsikring) selv ved få timer",
      "Stiger må kun bruges til kortvarigt let arbejde",
    ] },
    { heading: "Stilladstyper og prisniveau", body: (
      <div className="not-prose my-4 overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/60 text-foreground">
            <tr><th className="px-4 py-3">Type</th><th className="px-4 py-3">Anvendelse</th><th className="px-4 py-3">Pris 2 uger</th></tr>
          </thead>
          <tbody className="divide-y divide-border">
            <tr><td className="px-4 py-3">Rullestillads</td><td className="px-4 py-3">Indvendigt, max 7 m</td><td className="px-4 py-3">800–2.500 kr.</td></tr>
            <tr><td className="px-4 py-3">Facadestillads — 1 side</td><td className="px-4 py-3">Maling, facade</td><td className="px-4 py-3">4.000–9.000 kr.</td></tr>
            <tr><td className="px-4 py-3">Facadestillads — hele huset</td><td className="px-4 py-3">Tag, facade</td><td className="px-4 py-3">12.000–25.000 kr.</td></tr>
            <tr><td className="px-4 py-3">Tagstillads + kantsikring</td><td className="px-4 py-3">Tagudskift</td><td className="px-4 py-3">15.000–35.000 kr.</td></tr>
          </tbody>
        </table>
      </div>
    ) },
    { heading: "Bygherreansvar — det skal du tjekke", ordered: [
      "Har håndværker AT-godkendt stillads med attest?",
      "Er der lavet plan for sikkerhed og sundhed (PSS) ved opgaver over 30 dage?",
      "Står sikkerhedsudstyr i tilbuddet — eller tilkøbes det?",
      "Er der forsikring der dækker faldulykker på din grund?",
      "Får du dokumentation for ugentlig stilladskontrol?",
    ] },
    { heading: "Røde flag", list: [
      "Maler arbejder på stige 4 m oppe — ulovligt",
      "Tagdækker uden snorebørn / kantsikring",
      "Stillads uden top-rækværk og fodliste",
      "Ingen attest på stilladset",
      "Lærling alene i højden uden instruktion",
    ] },
  ],
});
