import { defineBlogPost } from "../defineBlogPost";

export default defineBlogPost({
  slug: "solceller-pris-tilbagebetalingstid-2026",
  keywords: "solceller pris 2026, solcelleanlæg tilbagebetalingstid, batteri solceller pris, nettarif solceller, kWp pris parcelhus, solceller villa pris",
  faq: [
    { q: "Hvad koster et solcelleanlæg til et parcelhus?", a: "6 kWp (typisk parcelhus): 85.000–115.000 kr. 10 kWp: 125.000–165.000 kr. Med batteri (10 kWh): tillæg 55.000–85.000 kr. Priser inkl. installation, moms og net-tilslutning." },
    { q: "Hvor lang er tilbagebetalingstiden?", a: "Uden batteri: 8–11 år. Med batteri: 11–14 år. Forudsætter et eget forbrug på min. 35–45% af produktionen — ellers bliver det længere pga. lav afregningspris til nettet." },
    { q: "Skal jeg have batteri?", a: "Kun hvis du har stort aften/nat-forbrug (varmepumpe, elbil-opladning). For parcelhuse uden disse er batteri ofte ikke rentabelt — bedre at udvide selve solcelleanlægget." },
  ],
  sections: [
    { paragraphs: ["Solceller har aldrig været mere rentable end nu — men prisforskellene mellem firmaer er stadig 30–50%. Lær hvad et anlæg reelt koster i 2026, og hvordan du regner tilbagebetalingstiden ud korrekt."] },
    { heading: "Prisoversigt 2026 (inkl. installation, moms, net-tilslutning)", body: (
      <div className="not-prose my-4 overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/60 text-foreground">
            <tr><th className="px-4 py-3">Størrelse</th><th className="px-4 py-3">Pris</th><th className="px-4 py-3">Årlig produktion</th></tr>
          </thead>
          <tbody className="divide-y divide-border">
            <tr><td className="px-4 py-3">4 kWp</td><td className="px-4 py-3">65.000–85.000 kr.</td><td className="px-4 py-3">3.600–4.000 kWh</td></tr>
            <tr><td className="px-4 py-3">6 kWp</td><td className="px-4 py-3">85.000–115.000 kr.</td><td className="px-4 py-3">5.400–6.000 kWh</td></tr>
            <tr><td className="px-4 py-3">8 kWp</td><td className="px-4 py-3">105.000–140.000 kr.</td><td className="px-4 py-3">7.200–8.000 kWh</td></tr>
            <tr><td className="px-4 py-3">10 kWp</td><td className="px-4 py-3">125.000–165.000 kr.</td><td className="px-4 py-3">9.000–10.000 kWh</td></tr>
            <tr><td className="px-4 py-3">+ Batteri 10 kWh</td><td className="px-4 py-3">+55.000–85.000 kr.</td><td className="px-4 py-3">—</td></tr>
          </tbody>
        </table>
      </div>
    ) },
    { heading: "Regneeksempel — 6 kWp uden batteri", paragraphs: ["Pris 100.000 kr. Årlig produktion 5.700 kWh. Eget forbrug 45% (2.565 kWh) sparet á 3,20 kr. = 8.208 kr. Salg til net 55% (3.135 kWh) á 0,40 kr. = 1.254 kr. Samlet besparelse 9.462 kr./år → tilbagebetalingstid ca. 10,6 år. Levetid 25–30 år giver netto 140.000–180.000 kr. i overskud."] },
    { heading: "Vælg det rette firma — tjekliste", ordered: [
      "Autoriseret installatør (kræves for tilslutning)",
      "Brand på paneler og inverter — Tier 1-paneler, JinkoSolar/LONGi/Q-Cells",
      "Inverter med min. 10 års produktgaranti (Fronius, SMA, Huawei)",
      "Garanti: min. 25 år på paneler, 10 år på inverter, 10 år på installation",
      "Tilbud med årlig produktionsprognose (kWh/kWp) for din adresse",
      "Pris uden moms OG inkl. moms tydeligt",
    ] },
    { heading: "Faldgruber", list: [
      "For lille anlæg når elforbrug stiger (elbil, varmepumpe)",
      "Glemmer at tjekke statikken på tag før installation",
      "Vælger billigste invertere — disse svigter typisk efter 8–12 år",
      "Bestiller batteri uden at have aften/natforbrug",
      "Får ikke garantitilsagn skriftligt fra firmaet",
    ] },
  ],
});
