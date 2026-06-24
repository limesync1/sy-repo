import { defineBlogPost } from "../defineBlogPost";

export default defineBlogPost({
  slug: "koekken-renovering-trin-for-trin-guide",
  keywords: "køkken renovering trin for trin, køkken udskift proces, køkken renovering tidsplan, køkken pris parcelhus, IKEA vs snedker køkken, koordinering håndværkere køkken",
  faq: [
    { q: "Hvor lang tid tager en køkkenrenovering?", a: "Standardkøkken med samme placering af installationer: 5–10 arbejdsdage. Med flytning af vand/afløb og el-tavle: 3–5 uger. Beregn 2–4 uger ekstra hvis du venter på særbestilte fronter eller bordplader." },
    { q: "Skal jeg være køkkenløs hele perioden?", a: "Ja, regn med 7–14 dage uden funktionelt køkken selv ved standardprojekt. Indret et midlertidigt køkken med mikrobølgeovn, vandkoger og engangsservice i kælder eller bryggers." },
    { q: "Hvad koster det at få monteret et IKEA-køkken?", a: "Selve køkkenet 25.000–80.000 kr. Montering 12.000–30.000 kr. VVS-tilkobling 3.000–8.000 kr. El-arbejde 4.000–9.000 kr. Bordplade montering 2.000–6.000 kr. Samlet typisk 50.000–130.000 kr." },
  ],
  sections: [
    { paragraphs: ["En køkkenrenovering har flere fag der skal koordineres i den rette rækkefølge. Her er den komplette tidsplan — så du ikke ender med en flisesætter der venter en uge på en VVS'er."] },
    { heading: "Tidsplan — standardkøkken 8 arbejdsdage", body: (
      <div className="not-prose my-4 overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/60 text-foreground">
            <tr><th className="px-4 py-3">Dag</th><th className="px-4 py-3">Aktivitet</th><th className="px-4 py-3">Fag</th></tr>
          </thead>
          <tbody className="divide-y divide-border">
            <tr><td className="px-4 py-3">1</td><td className="px-4 py-3">Demontering, bortskaffelse</td><td className="px-4 py-3">Tømrer</td></tr>
            <tr><td className="px-4 py-3">2</td><td className="px-4 py-3">El-forberedelse, nye stik</td><td className="px-4 py-3">Elektriker</td></tr>
            <tr><td className="px-4 py-3">2–3</td><td className="px-4 py-3">VVS-forberedelse</td><td className="px-4 py-3">VVS</td></tr>
            <tr><td className="px-4 py-3">3</td><td className="px-4 py-3">Spartling, maling vægge/loft</td><td className="px-4 py-3">Maler</td></tr>
            <tr><td className="px-4 py-3">4–5</td><td className="px-4 py-3">Køkkenmontage</td><td className="px-4 py-3">Køkkenmontør</td></tr>
            <tr><td className="px-4 py-3">6</td><td className="px-4 py-3">Bordplade måltagning + skæring</td><td className="px-4 py-3">Leverandør</td></tr>
            <tr><td className="px-4 py-3">7</td><td className="px-4 py-3">Bordplade montering + fuger</td><td className="px-4 py-3">Montør</td></tr>
            <tr><td className="px-4 py-3">8</td><td className="px-4 py-3">VVS + el slut-tilslutning + test</td><td className="px-4 py-3">VVS + el</td></tr>
          </tbody>
        </table>
      </div>
    ) },
    { heading: "Faldgruber der koster tid og penge", list: [
      "Bordplade bestilles før montage — kan ikke måles før skabene står",
      "Glemmer at bestille emhætte-rør og kuldebrosbånd ved ydervæg",
      "Vådrumsmembran glemmes ved opvaskemaskine-tilslutning",
      "Skifter til induktion uden at tjekke om el-tavlen kan klare effekten",
      "Bestiller hvidevarer for sent — leveringstid 2–6 uger",
    ] },
    { heading: "Pris — eksempel parcelhus", paragraphs: ["Standard 18 m² køkken med behold af installationer, mellem-segment fronter, laminat-bordplade og standard hvidevarer: 95.000–145.000 kr. Premium med massiv stenbordplade, integrerede tyske hvidevarer og snedkerfronter: 220.000–350.000 kr."] },
    { heading: "Tjekliste — før du bestiller", ordered: [
      "Mål rum nøjagtigt + tag billeder af eksisterende installationer",
      "Få 2–3 tilbud på samme tegning (IKEA, lokal snedker, kædekøkken)",
      "Tjek leveringstid på fronter OG hvidevarer FØR du underskriver",
      "Sørg for at have én ansvarlig hovedentreprenør",
      "Bestil midlertidigt køkken-setup 1 uge før start",
    ] },
  ],
});
