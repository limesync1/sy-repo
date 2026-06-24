import { defineBlogPost } from "../defineBlogPost";

export default defineBlogPost({
  slug: "beskaering-traeer-nabo-regler-pris",
  keywords: "beskæring træer pris, fælde træ pris, naboregler træ skel, hegnsloven træ, må jeg fælde nabos træer, certificeret træplejer pris",
  faq: [
    { q: "Hvad må jeg gøre med naboens træer der hænger ind på min grund?", a: "Du må klippe grene og rødder der vokser ind på din grund — men kun til skelgrænsen. Materialet tilhører naboen og skal afleveres tilbage. Helst først efter skriftlig henvendelse til naboen." },
    { q: "Hvad koster det at fælde et større træ?", a: "Mindre træ (under 6 m): 1.500–3.500 kr. Mellemstort (6–12 m): 3.500–8.000 kr. Stort træ (12–20 m): 8.000–18.000 kr. Med stubfræsning: tillæg 800–2.500 kr. Tæt på huse/ledninger: tillæg 30–80%." },
    { q: "Skal jeg have tilladelse til at fælde et træ?", a: "I haven typisk nej. Men: træer markeret i lokalplan/byplan, fredede træer, og træer i fredskov KRÆVER tilladelse fra kommunen. Tjek altid lokalplan før fældning." },
  ],
  sections: [
    { paragraphs: ["Beskæring og fældning af træer er en af de mest konfliktudløsende emner mellem naboer. Her er reglerne, priserne og hvordan du undgår både bøder og naboklager."] },
    { heading: "Reglerne — hegnsloven og naboretten", list: [
      "Træer over 1,80 m skal stå min. 1,75 m fra skel (privat ejendom)",
      "Grene over skel: du må klippe til skellinjen efter rimelig varsel til nabo",
      "Rødder under fundament: du må fjerne på din grund",
      "Hækplanter er omfattet af hegnsloven — opfylder andre regler",
      "Frugter på grene over din grund tilhører træejeren",
    ] },
    { heading: "Pris pr. opgavetype", body: (
      <div className="not-prose my-4 overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/60 text-foreground">
            <tr><th className="px-4 py-3">Opgave</th><th className="px-4 py-3">Pris</th></tr>
          </thead>
          <tbody className="divide-y divide-border">
            <tr><td className="px-4 py-3">Beskæring frugttræ</td><td className="px-4 py-3">600–1.400 kr.</td></tr>
            <tr><td className="px-4 py-3">Topkapning løvtræ &lt; 10 m</td><td className="px-4 py-3">1.800–3.800 kr.</td></tr>
            <tr><td className="px-4 py-3">Fældning &lt; 6 m</td><td className="px-4 py-3">1.500–3.500 kr.</td></tr>
            <tr><td className="px-4 py-3">Fældning 6–12 m</td><td className="px-4 py-3">3.500–8.000 kr.</td></tr>
            <tr><td className="px-4 py-3">Fældning 12–20 m</td><td className="px-4 py-3">8.000–18.000 kr.</td></tr>
            <tr><td className="px-4 py-3">Sektionsfældning (tæt på hus)</td><td className="px-4 py-3">12.000–35.000 kr.</td></tr>
            <tr><td className="px-4 py-3">Stubfræsning</td><td className="px-4 py-3">800–2.500 kr.</td></tr>
            <tr><td className="px-4 py-3">Bortkørsel af træ + grene</td><td className="px-4 py-3">600–2.500 kr.</td></tr>
          </tbody>
        </table>
      </div>
    ) },
    { heading: "Vælg certificeret træplejer", ordered: [
      "ETW eller dansk svar (træplejer-uddannet)",
      "Erhvervsansvarsforsikring min. 5 mio. kr.",
      "Dokumentation for klatrekursus + motorsavscertifikat",
      "Referencer på lignende opgaver (særligt sektionsfældning)",
      "Skriftligt tilbud med specifik opgavebeskrivelse",
    ] },
    { heading: "Faldgruber", list: [
      "Fælder fredet eller lokalplan-beskyttet træ — bøde op til 25.000 kr.",
      "Klipper naboens grene UDEN varsel og smider materialet væk",
      "Hyrer ukvalificeret firma → personskade + erstatningsansvar hos dig",
      "Glemmer at tjekke om der er fugle med rede (yngletid marts–juli)",
      "Skipper bortkørsel — efterlader 2–4 m³ træ du selv skal bortskaffe",
    ] },
  ],
});
