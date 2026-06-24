import { defineBlogPost } from "../defineBlogPost";

export default defineBlogPost({
  slug: "tagrender-pris-udskift-vedligehold",
  keywords: "tagrender pris, udskift tagrender, rensning tagrender pris, zink vs plast tagrender, tagrender vedligehold, nedløbsrør pris",
  faq: [
    { q: "Hvad koster nye tagrender på et parcelhus?", a: "Plast (PVC): 250–450 kr./m inkl. montering. Stål/lakeret: 400–650 kr./m. Zink: 600–1.100 kr./m. Et 140 m² hus med 35–45 m tagrende ender typisk på 12.000–45.000 kr." },
    { q: "Hvor ofte skal tagrender renses?", a: "1–2× årligt: efter løvfald (oktober/november) og igen om foråret. Står træer tæt på huset: 3–4× årligt. Tilstoppede tagrender er årsag #1 til fugtskader på facaden." },
    { q: "Plast eller zink — hvad er bedst?", a: "Plast: billigst, 25–30 års levetid, men blegner og kan revne ved frost. Zink: 50–70 års levetid, patinerer pænt, men kræver kompetent montering for at undgå utætheder." },
  ],
  sections: [
    { paragraphs: ["Tagrender er noget af det billigste på huset, men når de svigter, koster det dyrt: fugtskadede facader, råd i tagkonstruktion og oversvømmede kældre. Her er hvad du betaler i 2026 og hvordan du vælger rigtigt."] },
    { heading: "Pris pr. løbende meter (inkl. montering)", body: (
      <div className="not-prose my-4 overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/60 text-foreground">
            <tr><th className="px-4 py-3">Type</th><th className="px-4 py-3">Pris pr. meter</th><th className="px-4 py-3">Levetid</th></tr>
          </thead>
          <tbody className="divide-y divide-border">
            <tr><td className="px-4 py-3">Plast (PVC)</td><td className="px-4 py-3">250–450 kr.</td><td className="px-4 py-3">25–30 år</td></tr>
            <tr><td className="px-4 py-3">Stål, lakeret</td><td className="px-4 py-3">400–650 kr.</td><td className="px-4 py-3">30–40 år</td></tr>
            <tr><td className="px-4 py-3">Zink</td><td className="px-4 py-3">600–1.100 kr.</td><td className="px-4 py-3">50–70 år</td></tr>
            <tr><td className="px-4 py-3">Kobber</td><td className="px-4 py-3">1.100–1.800 kr.</td><td className="px-4 py-3">80+ år</td></tr>
          </tbody>
        </table>
      </div>
    ) },
    { heading: "Pris for rensning", list: [
      "Parcelhus 35–45 m tagrende: 1.200–2.200 kr.",
      "Villa 50–70 m tagrende: 1.800–3.200 kr.",
      "Tillæg for nedløb og tagbrønde: 400–800 kr.",
      "Tillæg for ekstra højde / stillads: 800–1.800 kr.",
    ] },
    { heading: "Selv-tjek 2× årligt", ordered: [
      "Tjek for nedhængende dele eller skævheder",
      "Se efter mosvækst og blade i renderne",
      "Test nedløb: hæld vand i tagrenden, se om det løber frit",
      "Kig på facaden under tagrenden — våde striber = utæthed",
      "Tjek samlinger ved hjørner — typisk svageste punkt",
    ] },
    { heading: "Hvornår skal du udskifte?", list: [
      "Synligt revnede eller brudte sektioner",
      "Skæve fald så vand står stille",
      "Rust gennem hele profilen (stål)",
      "Flere lapper i samme sektion",
      "Når du alligevel skifter tag — ALTID gør det samtidig",
    ] },
  ],
});
