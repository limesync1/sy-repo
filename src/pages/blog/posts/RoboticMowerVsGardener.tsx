import { defineBlogPost } from "../defineBlogPost";

export default defineBlogPost({
  slug: "robotplaeneklipper-vs-havemand-pris-test",
  keywords: "robotplæneklipper pris, robotklipper vs havemand, robotplæneklipper test 2026, vedligehold robot plæneklipper, kantning robotklipper, havemand pris villa",
  faq: [
    { q: "Hvad koster en robotplæneklipper til 800 m² have?", a: "Mellem-segment (Husqvarna 305, Gardena Sileno): 7.500–12.000 kr. Premium med GPS uden tråd (Husqvarna NERA): 18.000–28.000 kr. Plus installation 1.500–4.500 kr. inkl. tråd, ladestation og opsætning." },
    { q: "Hvor meget sparer jeg sammenlignet med havemand?", a: "Havemand 2× månedligt i sæsonen (12 besøg á 500 kr.) = 6.000 kr./år. En robot på 10.000 kr. + 200 kr./år strøm + 800 kr./år kniv/vedligehold tjener sig ind på 2 sæsoner. Til 5–10× besparelse over 10 år." },
    { q: "Kan robot klare hele haven?", a: "Plænen ja — men ikke kantning, beskæring, ukrudt eller hækklipning. Mange ender med robot + 4–6 havemands-besøg årligt til de andre opgaver = bedste totaløkonomi for 500–2000 m² haver." },
  ],
  sections: [
    { paragraphs: ["Robotplæneklippere er blevet markant bedre (og billigere) siden 2023. Men en robot kan ikke alt — her er regnestykket der viser hvornår robot, havemand eller en kombination giver mest mening."] },
    { heading: "Total-økonomi sammenligning, 800 m² have over 10 år", body: (
      <div className="not-prose my-4 overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/60 text-foreground">
            <tr><th className="px-4 py-3">Løsning</th><th className="px-4 py-3">10 års pris</th><th className="px-4 py-3">Bemærk</th></tr>
          </thead>
          <tbody className="divide-y divide-border">
            <tr><td className="px-4 py-3">Havemand 2× månedligt</td><td className="px-4 py-3">65.000–85.000 kr.</td><td className="px-4 py-3">Alt vedligehold</td></tr>
            <tr><td className="px-4 py-3">Robot alene</td><td className="px-4 py-3">22.000–32.000 kr.</td><td className="px-4 py-3">Kun plæne</td></tr>
            <tr><td className="px-4 py-3">Robot + havemand 4× årligt</td><td className="px-4 py-3">42.000–58.000 kr.</td><td className="px-4 py-3">Bedste balance</td></tr>
            <tr><td className="px-4 py-3">Selv-plæneklipper + havemand 2× årligt</td><td className="px-4 py-3">35.000–45.000 kr.</td><td className="px-4 py-3">Kræver tid 25 t/år</td></tr>
          </tbody>
        </table>
      </div>
    ) },
    { heading: "Hvornår er robot det rigtige", list: [
      "Plæne 200–2000 m² uden mange forhindringer",
      "Du vil have flot plæne uden at bruge tid på det",
      "Plænen har skrå op til 35% (mellem-segment)",
      "Du har stikkontakt i nærheden af ladestation",
      "Du accepterer at kantning og hæk skal gøres separat",
    ] },
    { heading: "Hvornår robot IKKE er det rigtige", list: [
      "Plæne under 100 m² — manuel klipper er billigere",
      "Plæne over 2500 m² — kræver dyr commercial-model",
      "Meget steder med trapper, mure eller stejle volde",
      "Mange børn/hunde der efterlader legetøj på plænen",
      "Du flytter snart — installation tager 1–3 timer",
    ] },
    { heading: "Faldgruber ved køb", ordered: [
      "Køber for lille model til kvm — den klipper konstant og dræber græsset",
      "Skipper trådgrænse-installation selv — utætheder giver fejl 1–2 år frem",
      "Vælger model uden GPS-tyverisikring (1.500 kr. tab ved tyveri)",
      "Glemmer at bestille reserveknive (typisk 8–12 sæt/sæson)",
      "Sætter ladestation i fuld sol — overhopvarme reducerer levetid",
    ] },
  ],
});
