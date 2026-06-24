import { defineBlogPost } from "../defineBlogPost";

export default defineBlogPost({
  slug: "aconto-vs-slutfaktura",
  keywords: "aconto faktura, slutfaktura, forudbetaling håndværker, betalingsplan håndværker, milepælsbetaling, betaling håndværker rettigheder",
  faq: [
    { q: "Hvor stor må forudbetalingen være?", a: "Max 25–30% af samlet pris ved opgavestart. Resten i acontorater knyttet til konkrete milepæle. Aldrig 100% før afleveringsforretning." },
    { q: "Må håndværkeren sende aconto uden specifikation?", a: "Nej. En acontofaktura skal vise hvilken del af opgaven der er udført og betales for. \"Aconto 25.000 kr.\" uden tekst er ikke gyldig efter god skik." },
    { q: "Hvad sker der hvis slutfakturaen er højere end aftalt?", a: "Ved fast pris: du skal ikke betale mere end aftalt. Ved overslag: max 15% over uden skriftligt varsel. Du har krav på skriftlig redegørelse for hver ekstrapost." },
  ],
  sections: [
    { paragraphs: ["Aconto er delbetaling undervejs i en opgave — slutfaktura er den endelige afregning når arbejdet er afleveret. Forstår du forskellen, undgår du både at betale for tidligt OG at sidde med en uforventet ekstra­regning."] },
    { heading: "Hovedreglerne", list: [
      "Forudbetaling: max 25–30% ved opstart, kun mod kvittering.",
      "Aconto: betales mod milepæl (fx \"badeværelse vådrumssikret + flisearbejde færdigt\").",
      "Slutfaktura: udstedes EFTER afleveringsforretning og evt. mangeludbedring.",
      "Tilbageholdsret: 5–10% af slutfaktura må holdes tilbage indtil mangler er udbedret.",
    ] },
    { heading: "Eksempel — badeværelse 180.000 kr.", body: (
      <div className="not-prose my-4 overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/60 text-foreground">
            <tr><th className="px-4 py-3">Milepæl</th><th className="px-4 py-3">Andel</th><th className="px-4 py-3">Beløb</th></tr>
          </thead>
          <tbody className="divide-y divide-border">
            <tr><td className="px-4 py-3">Opstart + materialer</td><td className="px-4 py-3">25%</td><td className="px-4 py-3">45.000 kr.</td></tr>
            <tr><td className="px-4 py-3">Vådrum + rør færdig</td><td className="px-4 py-3">25%</td><td className="px-4 py-3">45.000 kr.</td></tr>
            <tr><td className="px-4 py-3">Fliser + installation</td><td className="px-4 py-3">35%</td><td className="px-4 py-3">63.000 kr.</td></tr>
            <tr><td className="px-4 py-3">Aflevering — godkendt</td><td className="px-4 py-3">15%</td><td className="px-4 py-3">27.000 kr.</td></tr>
          </tbody>
        </table>
      </div>
    ) },
    { heading: "Tjek hver acontofaktura", ordered: [
      "Står der hvilken milepæl der afregnes?",
      "Er beløbet i overensstemmelse med betalingsplanen?",
      "Er moms specificeret separat?",
      "Er der reference til den oprindelige aftale?",
    ] },
  ],
});