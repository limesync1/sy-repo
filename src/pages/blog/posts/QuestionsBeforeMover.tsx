import { defineBlogPost } from "../defineBlogPost";

export default defineBlogPost({
  slug: "spoergsmaal-foer-du-booker-flyttefirma",
  keywords: "spørgsmål flyttefirma, vælg flyttefirma, flytteforsikring, ekstraregninger flytning, lift flytning, parkering flyttebil, garanti flytning",
  faq: [
    { q: "Hvilken forsikring skal flyttefirmaet have?", a: "Transportforsikring der dækker dine møbler under flytning + erhvervsansvarsforsikring for skader på trapper og opgange. Spørg efter forsikringssum (ofte 250.000–1 mio. kr.)." },
    { q: "Hvad koster typisk ekstra?", a: "Lift, parkeringsdispensation, opgange uden elevator, ekstra etage, weekendtillæg, opbevaring og pakkemateriale. Spørg eksplicit \"hvad er IKKE inkluderet?\"." },
    { q: "Skal jeg vælge fast pris eller timepris?", a: "Korte flytninger med klart omfang (lejlighed → lejlighed): fast pris. Komplekse flytninger med usikkerhed (renovering, opbevaring, lange transporter): timepris med loft." },
  ],
  sections: [
    { paragraphs: ["En typisk flytning koster 4.000–12.000 kr. — og prisspredningen mellem firmaer er 30–50% på samme opgave. De 8 spørgsmål nedenfor sikrer at du sammenligner ÆBLER med ÆBLER og ikke står med en uventet ekstraregning på flyttedagen."] },
    { heading: "De 8 spørgsmål", ordered: [
      "Er prisen fast eller timepris — og hvad er timeprisen ved overskridelse?",
      "Hvilken transport- og ansvarsforsikring har I, og hvad er summen?",
      "Er lift, parkering, etager og pakkemateriale inkluderet?",
      "Hvor mange mand kommer, og hvilke køretøjer bruger I?",
      "Hvad sker der hvis I beskadiger noget — proces og selvrisiko?",
      "Er der weekend-, helligdags- eller akut-tillæg?",
      "Hvad sker der hvis flytningen tager længere tid end estimeret?",
      "Kan I tilbyde mellemopbevaring hvis overdragelse glipper?",
    ] },
    { heading: "Eksempel — sammenlign 3 tilbud", body: (
      <div className="not-prose my-4 overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/60 text-foreground">
            <tr><th className="px-4 py-3">Firma</th><th className="px-4 py-3">Tilbud</th><th className="px-4 py-3">+ Lift</th><th className="px-4 py-3">+ Parkering</th><th className="px-4 py-3">Reel pris</th></tr>
          </thead>
          <tbody className="divide-y divide-border">
            <tr><td className="px-4 py-3">A</td><td className="px-4 py-3">4.500 kr.</td><td className="px-4 py-3">+ 1.800 kr.</td><td className="px-4 py-3">+ 600 kr.</td><td className="px-4 py-3 font-semibold">6.900 kr.</td></tr>
            <tr><td className="px-4 py-3">B</td><td className="px-4 py-3">5.800 kr.</td><td className="px-4 py-3">inkl.</td><td className="px-4 py-3">inkl.</td><td className="px-4 py-3 font-semibold">5.800 kr.</td></tr>
            <tr><td className="px-4 py-3">C</td><td className="px-4 py-3">5.200 kr.</td><td className="px-4 py-3">+ 1.200 kr.</td><td className="px-4 py-3">inkl.</td><td className="px-4 py-3 font-semibold">6.400 kr.</td></tr>
          </tbody>
        </table>
      </div>
    ) },
    { paragraphs: ["Det \"billigste\" tilbud (A) ender med at være det dyreste. Det er præcis derfor du SKAL spørge ind til tillæg før du vælger."] },
    { heading: "Bonus: print en flytteliste", list: [
      "Antal m² + antal værelser i ny og gammel bolig",
      "Etage + om der er elevator (begge adresser)",
      "Tunge særposter: klaver, hæveskrivebord, ekstra stor seng",
      "Skal I pakke selv eller vil du have hjælp til indpakning?",
      "Skal flyttekasser leveres på forhånd?",
    ] },
  ],
});