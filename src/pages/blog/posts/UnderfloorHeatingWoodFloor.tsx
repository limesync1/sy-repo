import { defineBlogPost } from "../defineBlogPost";

export default defineBlogPost({
  slug: "gulvvarme-paa-traegulv-pris-krav",
  keywords: "gulvvarme trægulv, gulvvarme parket, krav til trægulv gulvvarme, lavprofil gulvvarme, gulvvarme renovering, trægulv tykkelse gulvvarme",
  faq: [
    { q: "Kan jeg få gulvvarme under massivt trægulv?", a: "Ja, hvis brædderne er max 22 mm tykke og lægges flydende eller limet til varmepladerne. Massive brædder over 22 mm har for stor isoleringsværdi — varmen kommer ikke op." },
    { q: "Hvad koster gulvvarme i et eksisterende rum?", a: "Lavprofil tørt system: 950–1.600 kr./m² inkl. lægning. Slibning og opretning hvis gulvet er skævt: tillæg 300–700 kr./m². 30 m² stue: 35.000–65.000 kr. samlet." },
    { q: "Skal gulvvarme styres anderledes på trægulv?", a: "Ja. Maks. overfladetemperatur 27°C (mod 35°C på fliser). Setup-tid 8–12 uger ved nyt anlæg — temperaturen skal øges 1–2°C pr. uge for at undgå træet revner." },
  ],
  sections: [
    { paragraphs: ["Gulvvarme på trægulv kræver præcis udførelse. Forkert valg af brædder eller temperaturstyring kan ødelægge et 80.000 kr. parketgulv på under et år. Her er reglerne og priserne."] },
    { heading: "Krav til træet", list: [
      "Max tykkelse: 22 mm for massivt træ",
      "Parket (flerlags) op til 15 mm anbefales",
      "Træsort: eg, ask, ahorn (stabile). Undgå bøg og lærketræ",
      "Træets fugtighed ved lægning: 8–10%",
      "Dampspærre under varmepladerne ved kælder/krybekælder",
    ] },
    { heading: "Tre typer gulvvarme — vælg den rette", body: (
      <div className="not-prose my-4 overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/60 text-foreground">
            <tr><th className="px-4 py-3">System</th><th className="px-4 py-3">Tykkelse</th><th className="px-4 py-3">Pris/m²</th><th className="px-4 py-3">Til</th></tr>
          </thead>
          <tbody className="divide-y divide-border">
            <tr><td className="px-4 py-3">Vandbåren i beton</td><td className="px-4 py-3">7–15 cm</td><td className="px-4 py-3">500–900 kr.</td><td className="px-4 py-3">Nybyg, renovering</td></tr>
            <tr><td className="px-4 py-3">Vandbåren lavprofil (tør)</td><td className="px-4 py-3">2–4 cm</td><td className="px-4 py-3">950–1.600 kr.</td><td className="px-4 py-3">Renovering uden opbrydning</td></tr>
            <tr><td className="px-4 py-3">El-gulvvarme (måtter)</td><td className="px-4 py-3">3–6 mm</td><td className="px-4 py-3">450–950 kr.</td><td className="px-4 py-3">Mindre rum, ikke hovedvarme</td></tr>
          </tbody>
        </table>
      </div>
    ) },
    { heading: "Indkøringsproces (vandbåren)", ordered: [
      "Lad anlægget tørre i 14 dage før opvarmning starter.",
      "Start ved 20°C i 3 dage.",
      "Øg 5°C pr. dag op til 25°C, hold 3 dage.",
      "Fortsæt 1–2°C/uge op til driftstemperatur.",
      "Aldrig over 27°C overflade ved trægulv.",
    ] },
    { heading: "Faldgruber", list: [
      "Tæpper og store møbler over gulvvarme = lokale hotspots og revner",
      "Skifter til træ uden at justere maksimal-temperatur",
      "Springer indkøringsproces over → træet revner indenfor 2–6 mdr.",
      "Vælger massivt eg over 22 mm — varmen kommer ikke op",
      "Glemmer rumføler — temperaturen svinger og træet bevæger sig",
    ] },
  ],
});
