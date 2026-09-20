import LegalPage from "./LegalPage";

const Cookies = () => (
  <LegalPage
    title="Cookiepolitik"
    subtitle="Information om hvilke cookies og lignende teknologier vi bruger på serviceydere.dk, jf. cookiebekendtgørelsen (BEK nr. 1148 af 9. december 2011) og GDPR."
    description="Cookiepolitik for Serviceydere — hvilke cookies vi bruger og hvordan du administrerer dem."
    canonicalPath="/cookies"
    updated="27. april 2026"
    sections={[
      {
        id: "hvad",
        title: "1. Hvad er cookies?",
        body: (
          <>
            <p>
              Cookies er små tekstfiler, som gemmes i din browser, når du besøger et website. De bruges til at huske dine indstillinger, give dig en bedre brugeroplevelse, sikre login-sessioner og indsamle statistik om brug af platformen.
            </p>
            <p>
              Vi anvender også lignende teknologier (fx <code>localStorage</code> og pixels), som juridisk behandles på samme måde som cookies efter cookiebekendtgørelsen §3.
            </p>
          </>
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
                    <td className="py-2 pr-3">Login og auth, sikkerhed (CSRF), kurv, formular-state, valgt sprog. Kræver ikke samtykke, jf. cookiebekendtgørelsen §3, stk. 2.</td>
                    <td className="py-2">Session – 12 mdr.</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="py-2 pr-3 font-medium text-foreground">Funktionelle</td>
                    <td className="py-2 pr-3">Husker fx din valgte lokation, søgeradius og UI-præferencer for at forbedre oplevelsen.</td>
                    <td className="py-2">Op til 12 mdr.</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="py-2 pr-3 font-medium text-foreground">Statistik</td>
                    <td className="py-2 pr-3">Anonymiseret/aggregeret brugsstatistik, så vi kan forbedre platformen og fejlsøge.</td>
                    <td className="py-2">Op til 24 mdr.</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-3 font-medium text-foreground">Markedsføring</td>
                    <td className="py-2 pr-3">Bruges kun hvis du udtrykkeligt har givet samtykke. Kan inkludere remarketing-pixels fra annonceringspartnere.</td>
                    <td className="py-2">Op til 24 mdr.</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs">Tredjepartscookies kan blive sat af integrerede leverandører — fx Stripe (betaling), vores platformleverandør (login/data) og e-mail-tracking-pixels. Disse leverandører er selvstændigt dataansvarlige for deres egne cookies.</p>
          </>
        ),
      },
      {
        id: "samtykke",
        title: "3. Samtykke og tilbagekaldelse",
        body: (
          <>
            <p>
              Vi sætter kun cookies der ikke er strengt nødvendige (funktionelle, statistik og markedsføring), når du har givet aktivt, frivilligt og informeret samtykke via vores cookie-banner, jf. cookiebekendtgørelsen §3 og GDPR art. 6, stk. 1, litra a.
            </p>
            <p>
              Du kan til enhver tid trække dit samtykke tilbage med fremadrettet virkning ved at:
            </p>
            <ul className="ml-5 list-disc space-y-1">
              <li>Slette cookies for serviceydere.dk i din browser, eller</li>
              <li>Ændre dine indstillinger via cookie-banneret nederst på siden.</li>
            </ul>
            <p>Tilbagekaldelse berører ikke lovligheden af behandling baseret på samtykke før tilbagekaldelsen.</p>
          </>
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
            <p>Bemærk: Hvis du blokerer alle cookies — herunder de strengt nødvendige — kan væsentlige dele af serviceydere.dk (fx login, kurv og indkøbsflows) ikke fungere korrekt.</p>
          </>
        ),
      },
      {
        id: "kontakt",
        title: "5. Klage og spørgsmål",
        body: (
          <>
            <p>
              Har du spørgsmål til vores brug af cookies? Skriv til <a href="mailto:kontakt@serviceydere.dk" className="text-foreground underline">kontakt@serviceydere.dk</a>.
            </p>
            <p>
              Klager over vores brug af cookies kan indgives til <a href="https://erhvervsstyrelsen.dk" className="text-foreground underline" target="_blank" rel="noopener noreferrer">Erhvervsstyrelsen</a>, og klager over vores behandling af personoplysninger til <a href="https://www.datatilsynet.dk" className="text-foreground underline" target="_blank" rel="noopener noreferrer">Datatilsynet</a>.
            </p>
          </>
        ),
      },
    ]}
  />
);

export default Cookies;