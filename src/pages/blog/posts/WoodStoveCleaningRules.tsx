import { defineBlogPost } from "../defineBlogPost";

export default defineBlogPost({
  slug: "braendeovn-traepilleovn-rensning-krav",
  keywords: "brændeovn rensning, træpilleovn rensning, brændeovn lovkrav 2026, skorstensfejning brændeovn, brændeovn miljøkrav, ny brændeovn regler",
  faq: [
    { q: "Hvor ofte skal en brændeovn renses?", a: "Skorsten renses lovpligtigt 1× årligt af skorstensfejer. Selve brændeovnen rengør du selv 1–2× pr. fyringssæson — fjern aske, rens glas og tjek pakninger." },
    { q: "Er alle brændeovne lovlige?", a: "Nej. Brændeovne installeret før 2003 må ikke længere bruges (svanemærkningskrav). Brændeovne fra 2003–2007 udfases trinvist. Tjek mærkning eller spørg skorstensfejer." },
    { q: "Hvad koster en ny brændeovn?", a: "Standard 5–8 kW: 12.000–25.000 kr. + montering 4.000–9.000 kr. Træpilleovn med automatik: 25.000–55.000 kr. installeret. Brug autoriseret installatør for forsikring og garanti." },
  ],
  sections: [
    { paragraphs: ["Brændeovne er populære i Danmark, men reglerne er skærpet markant siden 2020. Forkert installation eller for sjælden vedligehold koster forsikring, sundhed og potentielt huset selv."] },
    { heading: "Lovpligtige tjek 2026", list: [
      "Skorstensfejning: 1× årligt for brændeovn, 1× hvert 2. år for træpilleovn",
      "Visuel inspektion af pakninger og foring årligt",
      "Brandsikker afstand til møbler, gulv, vægge — tjek installationsmanual",
      "Ovne fra før 2003: forbudt fra 2020, skal afmonteres",
      "Ny ovn skal være svanemærket og opfylde NOx- og partikelkrav",
    ] },
    { heading: "Selvtjek hvert år", ordered: [
      "Tjek glasruden for revner — kan eksplodere ved opvarmning.",
      "Tag pakninger ud, tryk dem sammen — hvis de ikke fjedrer tilbage, udskift dem.",
      "Tjek foringen for revner og afskalning.",
      "Rens røgrør (op til ovnens skorsten) for sod.",
      "Tjek at trækluftspjæld bevæger sig frit.",
    ] },
    { heading: "Priser på service", body: (
      <div className="not-prose my-4 overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/60 text-foreground">
            <tr><th className="px-4 py-3">Ydelse</th><th className="px-4 py-3">Pris</th></tr>
          </thead>
          <tbody className="divide-y divide-border">
            <tr><td className="px-4 py-3">Skorstensfejning (lovpligtig)</td><td className="px-4 py-3">350–550 kr.</td></tr>
            <tr><td className="px-4 py-3">Pakningsudskiftning</td><td className="px-4 py-3">450–950 kr.</td></tr>
            <tr><td className="px-4 py-3">Ny foring (vermiculit)</td><td className="px-4 py-3">1.200–2.500 kr.</td></tr>
            <tr><td className="px-4 py-3">Ny glasrude</td><td className="px-4 py-3">800–2.000 kr.</td></tr>
            <tr><td className="px-4 py-3">Demontering ulovlig ovn</td><td className="px-4 py-3">1.500–3.500 kr.</td></tr>
            <tr><td className="px-4 py-3">Ny brændeovn installeret</td><td className="px-4 py-3">16.000–34.000 kr.</td></tr>
          </tbody>
        </table>
      </div>
    ) },
    { heading: "Faldgruber", list: [
      "Fyrer i ulovlig (præ-2003) ovn — forsikring kan afvise brandskade",
      "Glemmer skorstensfejning → kraftig sod kan antænde skorsten",
      "Bruger fugtig brænde (>20% fugt) → tjære + partikelforurening",
      "Installerer ny ovn uden anmeldelse til skorstensfejer",
      "Glemmer at tjekke afstandskrav ved gulvskift",
    ] },
  ],
});
