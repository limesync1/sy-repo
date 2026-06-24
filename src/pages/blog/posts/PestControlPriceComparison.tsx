import { defineBlogPost } from "../defineBlogPost";

export default defineBlogPost({
  slug: "skadedyrsbekaempelse-pris-sammenligning",
  keywords: "skadedyrsbekæmpelse pris, rotter pris, mus pris, hvepsebo pris, sølvfisk bekæmpelse, skadedyrsfirma vs kommunen",
  faq: [
    { q: "Hvad koster det at få fjernet rotter?", a: "Privatfirma: 1.500–4.500 kr. for udredning + bekæmpelse + 6 mdr. opfølgning. Kommunen: gratis ved indendørs rotter (lovpligtig pligt), men længere ventetid og kun standardløsning." },
    { q: "Skal jeg ringe til kommunen eller et privatfirma?", a: "RING ALTID til kommunen først ved indendørs rotter — det er lovpligtigt at anmelde og kommunen skal håndtere. Ved mus, sølvfisk, hvepse: privatfirma er hurtigere og bredere." },
    { q: "Er der nogen abonnementsordninger?", a: "Ja. Helårsabonnement med 3–4 årlige besøg koster typisk 2.500–5.000 kr./år og dækker forebyggende kontrol. Giver mening for landejendomme og virksomheder, sjældent for villaer i by." },
  ],
  sections: [
    { paragraphs: ["Skadedyr er en akut situation — men prisforskellene mellem firmaer er ofte 200%+. Lær hvad du skal betale, hvornår kommunen tager regningen, og hvilke faldgruber du skal undgå."] },
    { heading: "Prisoversigt — typiske skadedyr", body: (
      <div className="not-prose my-4 overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/60 text-foreground">
            <tr><th className="px-4 py-3">Skadedyr</th><th className="px-4 py-3">Typisk pris</th><th className="px-4 py-3">Bemærk</th></tr>
          </thead>
          <tbody className="divide-y divide-border">
            <tr><td className="px-4 py-3">Rotter (indendørs)</td><td className="px-4 py-3">Gratis via kommunen</td><td className="px-4 py-3">Lovpligtig anmeldelse</td></tr>
            <tr><td className="px-4 py-3">Rotter (udendørs)</td><td className="px-4 py-3">1.500–4.500 kr.</td><td className="px-4 py-3">Privatfirma, 2–4 besøg</td></tr>
            <tr><td className="px-4 py-3">Mus</td><td className="px-4 py-3">1.200–2.800 kr.</td><td className="px-4 py-3">Inkl. forsegling af huller</td></tr>
            <tr><td className="px-4 py-3">Hvepsebo</td><td className="px-4 py-3">600–1.400 kr.</td><td className="px-4 py-3">Ét besøg, samme dag</td></tr>
            <tr><td className="px-4 py-3">Sølvfisk</td><td className="px-4 py-3">900–2.200 kr.</td><td className="px-4 py-3">Kræver tørring af fugt</td></tr>
            <tr><td className="px-4 py-3">Væggelus</td><td className="px-4 py-3">4.000–9.000 kr.</td><td className="px-4 py-3">2–3 behandlinger nødvendige</td></tr>
            <tr><td className="px-4 py-3">Skæggekræ</td><td className="px-4 py-3">800–2.000 kr.</td><td className="px-4 py-3">Klæbefælder + sprøjtning</td></tr>
          </tbody>
        </table>
      </div>
    ) },
    { heading: "Spørg ALTID firmaet om", ordered: [
      "Hvor mange besøg er med i prisen?",
      "Er opfølgning inkluderet (typisk 3–6 mdr.)?",
      "Bruger I bekæmpelsesmidler godkendt af Miljøstyrelsen?",
      "Har I autorisation til R1/R2-bekæmpelse?",
      "Hvad er prisen hvis problemet kommer tilbage indenfor garantiperioden?",
    ] },
    { heading: "Forsikring dækker sjældent — men", paragraphs: ["Standard husforsikring dækker IKKE skadedyrsbekæmpelse. Men ved rotter kan boligens følgeskader (gnavet kabler, isolering) være dækket — bed altid om skriftlig rapport som dokumentation hvis firmaet finder gnaverskader."] },
  ],
});
