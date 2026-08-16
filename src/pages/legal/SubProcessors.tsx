import { Link } from "react-router-dom";
import LegalPage from "./LegalPage";
import { SUB_PROCESSORS, DPA_VERSION } from "@/data/subprocessors";

/**
 * Offentlig oversigt over de underdatabehandlere, virksomhedspanelet bruger.
 * Listen er den samme, som databehandleraftalen henviser til.
 */
const SubProcessors = () => (
  <LegalPage
    title="Underdatabehandlere"
    subtitle="De tjenester vi bruger til at drive virksomhedspanelet, og som derfor kan komme i berøring med oplysninger om jeres kunder."
    description="Oversigt over Serviceyderes underdatabehandlere: formål, hvilke oplysninger de kan modtage, og hvor behandlingen foregår."
    canonicalPath="/underdatabehandlere"
    updated="27. april 2026"
    sections={[
      {
        id: "om-listen",
        title: "1. Om denne liste",
        body: (
          <>
            <p>
              Når I bruger virksomhedspanelet, er jeres virksomhed dataansvarlig for oplysningerne om jeres
              egne kunder og medarbejdere, og Serviceydere er databehandler. Vi bruger et antal
              underdatabehandlere til at kunne levere systemet — de fremgår af listen herunder.
            </p>
            <p>
              Rammerne for samarbejdet står i{" "}
              <Link to="/databehandleraftale" className="text-foreground underline">databehandleraftalen</Link>.
              Listen her udgør den aftalte oversigt over godkendte underdatabehandlere (version {DPA_VERSION}).
            </p>
          </>
        ),
      },
      {
        id: "listen",
        title: "2. Godkendte underdatabehandlere",
        body: (
          <div className="not-prose overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-foreground">
                  <th scope="col" className="px-4 py-3 font-semibold">Tjeneste</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Formål</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Oplysninger</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Placering</th>
                </tr>
              </thead>
              <tbody>
                {SUB_PROCESSORS.map((s) => (
                  <tr key={s.name} className="border-b border-border/60 last:border-0 align-top">
                    <td className="px-4 py-3">
                      <span className="font-medium text-foreground">{s.name}</span>
                      {s.optional && (
                        <span className="mt-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Kun ved tilvalg
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{s.purpose}</td>
                    <td className="px-4 py-3 text-muted-foreground">{s.data}</td>
                    <td className="px-4 py-3 text-muted-foreground">{s.location}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ),
      },
      {
        id: "aendringer",
        title: "3. Ændringer",
        body: (
          <p>
            Skal vi tilføje eller udskifte en underdatabehandler, opdaterer vi denne side og varsler
            virksomheder med aktivt panel via e-mail, inden ændringen træder i kraft. Er I ikke enige i en
            ny underdatabehandler, kan I gøre indsigelse ved at skrive til{" "}
            <a href="mailto:kontakt@serviceydere.dk" className="text-foreground underline">kontakt@serviceydere.dk</a>{" "}
            og i sidste ende opsige abonnementet uden binding.
          </p>
        ),
      },
    ]}
  />
);

export default SubProcessors;
