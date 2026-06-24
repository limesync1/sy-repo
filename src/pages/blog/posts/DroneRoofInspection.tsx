import { defineBlogPost } from "../defineBlogPost";

export default defineBlogPost({
  slug: "drone-tagtjek-pris-fordele",
  keywords: "drone tagtjek pris, drone inspektion tag, termografi drone, tagtjek uden stillads, drone bolig dokumentation, drone tagrender",
  faq: [
    { q: "Hvad koster et drone-tagtjek?", a: "Visuel inspektion parcelhus: 1.200–2.400 kr. Med termografi (varmetab): 2.500–4.500 kr. Med rapport og fotos: tillæg 500–1.200 kr. Markant billigere end stillads (8.000+ kr.) hvis du blot vil have status." },
    { q: "Hvad kan dronen finde?", a: "Manglende eller knækkede tagsten, mosvækst, rust på inddækninger, defekte tagrender, kuldebroer (med termografi), skader efter storm. Den kan IKKE erstatte fysisk inspektion ved konkret skadesvurdering." },
    { q: "Skal pilotеn være certificeret?", a: "Ja. Krav om EU-dronebevis (A1/A3 eller A2) og forsikring. Tjek pilotens nummer på Trafikstyrelsens register. Ulovlig dronefoto kan invalidere forsikringen." },
  ],
  sections: [
    { paragraphs: ["Et drone-tagtjek tager 30–60 minutter, koster 1.200–2.400 kr. og giver dig dokumentation du kan bruge ved køb/salg, forsikring eller bare planlægning af vedligehold. Her er hvad du får og hvad du skal vide."] },
    { heading: "Hvornår giver det mening", list: [
      "Før køb af bolig — bedre end fysisk inspektion hvis taget er højt eller stejlt",
      "Efter storm eller sne for at se skader uden risiko",
      "Før salg — som dokumentation til køber",
      "Hver 3–5 år som forebyggende vedligehold",
      "Ved mistanke om utætheder uden at vide hvor",
    ] },
    { heading: "Pakker og prisniveau", body: (
      <div className="not-prose my-4 overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/60 text-foreground">
            <tr><th className="px-4 py-3">Type</th><th className="px-4 py-3">Indhold</th><th className="px-4 py-3">Pris</th></tr>
          </thead>
          <tbody className="divide-y divide-border">
            <tr><td className="px-4 py-3">Standard tagtjek</td><td className="px-4 py-3">Højopløselige fotos + kort rapport</td><td className="px-4 py-3">1.200–2.400 kr.</td></tr>
            <tr><td className="px-4 py-3">Med termografi</td><td className="px-4 py-3">Varmebilleder + analyse</td><td className="px-4 py-3">2.500–4.500 kr.</td></tr>
            <tr><td className="px-4 py-3">Skadesdokumentation</td><td className="px-4 py-3">Til forsikringssag</td><td className="px-4 py-3">2.800–5.500 kr.</td></tr>
            <tr><td className="px-4 py-3">3D-model af tag</td><td className="px-4 py-3">Måling + arealer</td><td className="px-4 py-3">4.500–8.500 kr.</td></tr>
          </tbody>
        </table>
      </div>
    ) },
    { heading: "Hvad rapporten skal indeholde", ordered: [
      "Højopløselige fotos af alle 4 tagflader",
      "Detaljebilleder af kviste, skorsten og inddækninger",
      "Tagrendegennemgang i lukket loop",
      "Markering af findings på oversigtsbillede",
      "Anbefalinger med vedligehold/akut/akut prioritering",
      "Pilotens dronebevis-nummer som dokumentation",
    ] },
    { heading: "Faldgruber", list: [
      "Pilot uden EU-bevis = ulovlig flyvning, rapport uden værdi",
      "Lavopløselige fotos — kan ikke zoome ind på detaljer",
      "Ingen termografi når der mistænkes varmetab",
      "Glemmer at fotografere alle 4 sider af skorsten",
      "Får ikke rapport på skrift med dato og pilot-ID",
    ] },
  ],
});
