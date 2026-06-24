import { defineBlogPost } from "../defineBlogPost";

export default defineBlogPost({
  slug: "badevaerelse-renovering-tidsplan-koordinering",
  keywords: "badeværelse renovering tidsplan, badeværelse uger renovering, vådrumssikring proces, koordinering håndværkere bad, badeværelse trin for trin",
  faq: [
    { q: "Hvor lang tid tager en badeværelses-renovering?", a: "Komplet renovering med vådrumssikring: 4–6 uger. Mindre opgraderinger (samme installationer): 2–3 uger. Tørringstider for membran og fuger kan ikke speedes op — derfor ikke under 2 uger." },
    { q: "Kan jeg bruge badet undervejs?", a: "Nej, fra dag 1 til ibrugtagning er badet ude af drift. Planlæg adgang til andet bad/toilet — eller lej et badeværelse via familie/venner. Beregn min. 3 uger uden eget bad." },
    { q: "Skal jeg have anmeldelse eller byggetilladelse?", a: "Vådrumsarbejde skal anmeldes til kommunen. Brug autoriseret VVS-installatør og autoriseret el — ellers er installationen ulovlig OG forsikring dækker ikke ved vandskade." },
  ],
  sections: [
    { paragraphs: ["Badeværelses-renovering er den mest komplekse boligrenovering der findes: 6–8 fag skal koordineres i præcis rækkefølge, og en enkelt fejl kan koste 50.000+ kr. ved vandskade. Her er den professionelle tidsplan."] },
    { heading: "Tidsplan — komplet renovering 5 uger", body: (
      <div className="not-prose my-4 overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/60 text-foreground">
            <tr><th className="px-4 py-3">Uge</th><th className="px-4 py-3">Aktivitet</th></tr>
          </thead>
          <tbody className="divide-y divide-border">
            <tr><td className="px-4 py-3">1</td><td className="px-4 py-3">Nedrivning, bortskaffelse, tørringsperiode</td></tr>
            <tr><td className="px-4 py-3">2</td><td className="px-4 py-3">VVS-rør, el-forberedelse, gulvopbygning</td></tr>
            <tr><td className="px-4 py-3">3</td><td className="px-4 py-3">Vådrumsmembran, primer, 24 timers hærdning</td></tr>
            <tr><td className="px-4 py-3">3–4</td><td className="px-4 py-3">Fliselægning gulv + væg, fuger</td></tr>
            <tr><td className="px-4 py-3">4</td><td className="px-4 py-3">Sanitet, blandingsbatterier, brusekabine</td></tr>
            <tr><td className="px-4 py-3">5</td><td className="px-4 py-3">El-tilslutning, silikonefuger, afleveringsforretning</td></tr>
          </tbody>
        </table>
      </div>
    ) },
    { heading: "Vådrumssikring — det vigtigste punkt", list: [
      "Skal udføres af person med GVK- eller MK-godkendelse",
      "Membran skal være MK-godkendt og dokumenteret",
      "Mindst 100 mm membran op på væg over bademiljø",
      "Gennemføringer (rør) skal tætnes med manchetter",
      "Få dokumentation OG fotos af membran før fliselægning",
    ] },
    { heading: "Faldgruber", list: [
      "VVS-rør lægges efter membran → utætheder",
      "For tynd betonopretning af gulvfald (skal være min. 1:50)",
      "Silikonefuger lægges før vådrumstest",
      "Glemmer afløb under brusekabine eller dørtrin",
      "Bestiller fliser med leveringstid 4 uger uden plan B",
    ] },
    { heading: "Pris — eksempel 6 m² standardbad", paragraphs: ["Komplet renovering (nedrivning, VVS, el, membran, fliser, sanitet): 95.000–160.000 kr. Premium med stenfliser, indbygget cisterne og gulvvarme: 180.000–280.000 kr. Sjældent rentabelt at gå under 90.000 kr. — så går VVS eller membran ofte i kompromis."] },
  ],
});
