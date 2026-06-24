import { defineBlogPost } from "../defineBlogPost";

export default defineBlogPost({
  slug: "vinduesudskift-pris-energi-stoejdaempning",
  keywords: "vinduesudskift pris 2026, energiruder pris, 3-lags vinduer, vinduer stoejdaempning, vinduesudskift parcelhus, tilskud nye vinduer",
  faq: [
    { q: "Hvad koster nye vinduer i et parcelhus?", a: "Standard træ/alu energiruder: 7.500–14.000 kr. pr. vindue inkl. montering. 12–18 vinduer i et 140 m² hus: 95.000–230.000 kr. samlet. Premium passivhus-vinduer: tillæg 25–40%." },
    { q: "Hvor meget sparer jeg på varmen?", a: "Udskifter du fra 2-lags termoruder (1985–2005) til moderne 3-lags energiruder: typisk 15–25% af varmeregningen. Fra ældre 1-lags vinduer: op til 40%." },
    { q: "Får jeg tilskud til vinduesudskift?", a: "Ja. Bygningspuljen giver tilskud til energiruder med U-værdi under 1,0 W/m²K — typisk 8.000–25.000 kr. afhængig af antal vinduer. Skal ansøges FØR arbejdet starter." },
  ],
  sections: [
    { paragraphs: ["Vinduer er det enkeltkomponent der typisk taber mest varme i en ældre bolig — op til 25% af det samlede varmetab. Udskift er dyrt, men tilbagebetalingstiden er typisk 8–14 år ved store huse med dårlige vinduer."] },
    { heading: "Materialevalg", body: (
      <div className="not-prose my-4 overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/60 text-foreground">
            <tr><th className="px-4 py-3">Type</th><th className="px-4 py-3">Pris/stk.</th><th className="px-4 py-3">Levetid</th><th className="px-4 py-3">Vedligehold</th></tr>
          </thead>
          <tbody className="divide-y divide-border">
            <tr><td className="px-4 py-3">Plast (PVC)</td><td className="px-4 py-3">5.500–9.000 kr.</td><td className="px-4 py-3">30–40 år</td><td className="px-4 py-3">Lavt</td></tr>
            <tr><td className="px-4 py-3">Træ</td><td className="px-4 py-3">7.500–12.000 kr.</td><td className="px-4 py-3">40–60 år</td><td className="px-4 py-3">Maling 8–12 år</td></tr>
            <tr><td className="px-4 py-3">Træ/alu</td><td className="px-4 py-3">9.500–16.000 kr.</td><td className="px-4 py-3">50–70 år</td><td className="px-4 py-3">Lavt</td></tr>
            <tr><td className="px-4 py-3">Aluminium</td><td className="px-4 py-3">11.000–18.000 kr.</td><td className="px-4 py-3">50+ år</td><td className="px-4 py-3">Lavt</td></tr>
            <tr><td className="px-4 py-3">Passivhus 3-lag</td><td className="px-4 py-3">13.000–22.000 kr.</td><td className="px-4 py-3">40–60 år</td><td className="px-4 py-3">Lavt</td></tr>
          </tbody>
        </table>
      </div>
    ) },
    { heading: "U-værdi — det vigtigste tal", list: [
      "U-værdi 2,8 (gamle 2-lags ruder fra 1985): meget varmetab",
      "U-værdi 1,4 (almindelige 2-lags energiruder): standard nybyggeri 2000",
      "U-værdi 1,0–1,2 (moderne 3-lags energiruder): standard i dag",
      "U-værdi 0,7–0,9 (passivhus-vinduer): max isolering, min. tilskud",
      "Lavere tal = mindre varmetab = lavere varmeregning",
    ] },
    { heading: "Støjdæmpning — hvis du bor ved vej", list: [
      "Standard energiruder: 30–32 dB dæmpning",
      "Asymmetriske ruder (4-16-6 mm): 35–38 dB",
      "Laminerede støjruder: 38–42 dB (anbefales tæt motorvej)",
      "Tillæg 1.500–4.000 kr. pr. vindue for støj-opgradering",
    ] },
    { heading: "Vigtigst: korrekt montering", paragraphs: ["75% af alle vinduesutætheder skyldes forkert montering, ikke vinduet selv. Sørg for: dampspærre indvendigt, ekspansionsbånd udvendigt, korrekt fugning og dokumenteret tæthedsprøvning. Spørg ALTID om montøren har vinduesmontør-uddannelse (VinduesIndustrien)."] },
    { heading: "Faldgruber", list: [
      "Vælger billige vinduer uden Nordic Swan eller VinduesIndustrien-mærkning",
      "Glemmer at ansøge tilskud før arbejdet starter",
      "Skifter kun nogle vinduer — kuldebro forværres",
      "Ingen dampspærre indvendigt → kondens og råd i karm",
      "Vælger forkert U-værdi til bygningsreglementet (BR18 kræver max 1,2)",
    ] },
  ],
});
