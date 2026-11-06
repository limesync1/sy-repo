import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Briefcase, HardHat, ChevronRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { readNativeRole, saveNativeRole, loginPathFor, type NativeRole } from "@/lib/native-role";

const OPTIONS: { role: NativeRole; title: string; text: string; Icon: typeof Briefcase }[] = [
  { role: "owner", title: "Virksomhedsejer", text: "Planlæg ruter, kunder og aftaler", Icon: Briefcase },
  { role: "employee", title: "Medarbejder", text: "Se din rute og registrér tid", Icon: HardHat },
];

/** App start page: choose owner or employee, then log in. */
export default function NativeAppEntry() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [role] = useState(readNativeRole);

  useEffect(() => { document.title = "Serviceydere"; }, []);

  if (loading) return <div className="min-h-[100dvh] bg-background" aria-busy="true" />;
  // Signed in: the login page forwards to the right panel.
  if (user) return <Navigate to={loginPathFor(role ?? "owner")} replace />;

  const choose = (r: NativeRole) => { saveNativeRole(r); navigate(loginPathFor(r)); };

  return (
    <main
      className="flex min-h-[100dvh] flex-col bg-background px-5 text-foreground animate-in fade-in duration-500"
      style={{ paddingTop: "max(2rem, env(safe-area-inset-top))", paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
    >
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
        <img src="/serviceydere-logo.png" alt="Serviceydere" className="mx-auto mt-6 h-12 w-auto" />
        <div className="mt-12">
          <h1 className="text-3xl font-bold leading-tight">Hvem er du?</h1>
          <p className="mt-2 text-base text-muted-foreground">Vælg, så viser vi den rigtige del af appen.</p>
        </div>
        <div className="mt-8 space-y-4">
          {OPTIONS.map(({ role: r, title, text, Icon }) => (
            <button
              key={r}
              type="button"
              onClick={() => choose(r)}
              className="flex min-h-[88px] w-full items-center gap-4 rounded-2xl border-2 border-border bg-card p-5 text-left shadow-sm transition active:scale-[0.98] hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
                <Icon className="h-7 w-7" aria-hidden />
              </span>
              <span className="flex-1">
                <span className="block text-lg font-semibold">{title}</span>
                <span className="block text-sm text-muted-foreground">{text}</span>
              </span>
              <ChevronRight className="h-6 w-6 text-muted-foreground" aria-hidden />
            </button>
          ))}
        </div>
        <div className="mt-auto pt-10 text-center">
          <p className="text-sm text-muted-foreground">Ny virksomhed?</p>
          <button
            type="button"
            onClick={() => { saveNativeRole("owner"); navigate("/opret-virksomhed"); }}
            className="mt-1 min-h-[44px] px-4 text-base font-semibold text-primary underline-offset-4 hover:underline"
          >
            Opret virksomhed – 30 dage gratis
          </button>
        </div>
      </div>
    </main>
  );
}
