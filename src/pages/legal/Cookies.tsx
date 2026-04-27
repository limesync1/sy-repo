import LegalPage from "./LegalPage";

const Cookies = () => (
  <LegalPage
    title="Cookiepolitik"
    subtitle="Information om hvilke cookies Serviceydere ApS bruger på serviceydere.dk og hvordan du kan administrere dem."
    description="Cookiepolitik for Serviceydere — hvilke cookies vi bruger og hvordan du administrerer dem."
    canonicalPath="/cookies"
    updated="27. april 2026"
    sections={[
      {
        id: "hvad",
        title: "1. Hvad er cookies?",
        body: (
          <p>
            Cookies er små tekstfiler, som gemmes i din browser, når du besøger et website. De bruges til at huske dine indstillinger, give dig en bedre brugeroplevelse og indsamle statistik.
          </p>
        ),
      },
      {
        id: "typer",
        title: "2. Hvilke cookies bruger vi?",
        body: (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-foreground">
                  <tr className="border-b border-border">
                    <th className="py-2 pr-3">Type</th>
                    <th className="py-2 pr-3">Formål</th>
                    <th className="py-2">Levetid</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border">
                    <td className="py-2 pr-3 font-medium text-foreground">Nødvendige</td>
                    <td className="py-2 pr-3">Login, sikkerhed, kurv, formularstate. Kan ikke fravælges.</td>
                    <td className="py-2">Session – 12 mdr.</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="py-2 pr-3 font-medium text-foreground">Funktionelle</td>
                    <td className="py-2 pr-3">Husker f.eks. valgt lokation og søgeradius.</td>
                    <td className="py-2">Op til 12 mdr.</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="py-2 pr-3 font-medium text-foreground">Statistik</td>
                    <td className="py-2 pr-3">Anonym brugsstatistik, så vi kan forbedre platformen.</td>
                    <td className="py-2">Op til 24 mdr.</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-3 font-medium text-foreground">Markedsføring</td>
                    <td className="py-2 pr-3">Bruges kun hvis du har givet samtykke.</td>
                    <td className="py-2">Op til 24 mdr.</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs">Tredjepartscookies kan blive sat af integrerede leverandører (fx Stripe, Mapbox, Lovable Email).</p>
          </>
        ),
      },
      {
        id: "samtykke",
        title: "3. Samtykke",
        body: (
          <p>
            Vi sætter kun ikke-nødvendige cookies, når du har givet samtykke. Du kan til enhver tid ændre eller trække dit samtykke tilbage ved at slette cookies i din browser eller via cookie-banneret.
          </p>
        ),
      },
      {
        id: "browser",
        title: "4. Sådan administrerer du cookies",
        body: (
          <>
            <p>De fleste browsere giver dig mulighed for at slette eller blokere cookies. Find vejledning her:</p>
            <ul className="ml-5 list-disc space-y-1">
              <li><a href="https://support.google.com/chrome/answer/95647" className="text-foreground underline" target="_blank" rel="noopener noreferrer">Google Chrome</a></li>
              <li><a href="https://support.mozilla.org/da/kb/aktiver-og-deaktiver-cookies-website-praeferencer" className="text-foreground underline" target="_blank" rel="noopener noreferrer">Mozilla Firefox</a></li>
              <li><a href="https://support.apple.com/da-dk/guide/safari/sfri11471/mac" className="text-foreground underline" target="_blank" rel="noopener noreferrer">Safari</a></li>
              <li><a href="https://support.microsoft.com/da-dk/microsoft-edge" className="text-foreground underline" target="_blank" rel="noopener noreferrer">Microsoft Edge</a></li>
            </ul>
            <p>Bemærk: hvis du blokerer alle cookies, kan dele af serviceydere.dk ikke fungere korrekt.</p>
          </>
        ),
      },
      {
        id: "kontakt",
        title: "5. Spørgsmål",
        body: (
          <p>
            Har du spørgsmål til vores brug af cookies? Skriv til <a href="mailto:kontakt@serviceydere.dk" className="text-foreground underline">kontakt@serviceydere.dk</a>.
          </p>
        ),
      },
    ]}
  />
);

export default Cookies;