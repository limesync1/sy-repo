import { defineBlogPost } from "../defineBlogPost";

export default defineBlogPost({
  slug: "energirenovering-tilskud-2026",
  keywords: "energirenovering tilskud 2026, bygningspuljen 2026, varmepumpe tilskud, isolering tilskud, energiforbedring fradrag, klimapulje bolig",
  faq: [
    { q: "Hvilke tilskud findes i 2026?", a: "Bygningspuljen (tilskud til varmepumpe, isolering, vinduer): typisk 15.000–50.000 kr. Skrotpræmie ved oliefyr-udskiftning. Håndværkerfradrag på arbejdsløn op til 12.300 kr./voksen." },
    { q: "Hvordan søger jeg?", a: "Du skal søge FØR arbejdet starter via sparenergi.dk eller energistyrelsens portal. Få tilsagn skriftligt, og brug kun godkendte installatører. Tilsagnet falder bort hvis du starter inden godkendelse." },
    { q: "Kan jeg kombinere flere ordninger?", a: "Ja. Bygningspuljen + BoligJob-fradrag + evt. skrotpræmie kan kombineres på samme projekt. Sørg for at fakturaen specificerer materialer og arbejdsløn separat." },
  ],
  sections: [
    { paragraphs: ["Energirenovering er en af de sjældne investeringer hvor staten både giver tilskud OG fradrag OG sænker dine varmeregninger. Korrekt søgt kan en varmepumpe-installation gå fra 130.000 kr. til 65.000 kr. netto."] },
    { heading: "De vigtigste puljer i 2026", list: [
      "Bygningspuljen — varmepumper, isolering, vinduer (op til 50.000 kr.)",
      "Skrotpræmie ved oliefyr-udskiftning (typisk 20.000 kr.)",
      "Fjernvarmepulje — tilskud ved tilslutning",
      "BoligJob-fradrag — 35–45% af arbejdsløn (max 12.300 kr./voksen)",
      "Kommunale klimapuljer — varierer pr. kommune",
    ] },
    { heading: "Rækkefølgen er afgørende", ordered: [
      "Bestil energimærke / energirådgivning (1.500–4.000 kr.) — fortæller hvad der giver mest.",
      "Indhent 2–3 tilbud fra godkendte installatører.",
      "Ansøg pulje + få SKRIFTLIGT tilsagn før arbejde starter.",
      "Underskriv aftale med installatør med reference til tilsagn.",
      "Få faktura med specificeret arbejdsløn og materialer.",
      "Indberet BoligJob-fradrag på tastselv.skat.dk samme år.",
    ] },
    { heading: "Eksempel — luft/vand varmepumpe", body: (
      <div className="not-prose my-4 overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/60 text-foreground">
            <tr><th className="px-4 py-3">Post</th><th className="px-4 py-3">Beløb</th></tr>
          </thead>
          <tbody className="divide-y divide-border">
            <tr><td className="px-4 py-3">Installation total</td><td className="px-4 py-3">130.000 kr.</td></tr>
            <tr><td className="px-4 py-3">Bygningspuljen tilskud</td><td className="px-4 py-3">–35.000 kr.</td></tr>
            <tr><td className="px-4 py-3">Skrotpræmie oliefyr</td><td className="px-4 py-3">–20.000 kr.</td></tr>
            <tr><td className="px-4 py-3">BoligJob-fradrag (par)</td><td className="px-4 py-3">–10.000 kr.</td></tr>
            <tr><td className="px-4 py-3"><strong>Netto</strong></td><td className="px-4 py-3"><strong>65.000 kr.</strong></td></tr>
          </tbody>
        </table>
      </div>
    ) },
    { heading: "Faldgruber", list: [
      "Starter arbejde før skriftligt tilsagn — mister hele tilskuddet",
      "Bruger ikke-godkendt installatør",
      "Glemmer at indberette BoligJob-fradrag inden 1. maj",
      "Tilskud udbetales først efter dokumenteret afslutning — likviditet skal være på plads",
    ] },
  ],
});
