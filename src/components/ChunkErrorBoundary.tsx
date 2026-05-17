// Fanger fejl fra dynamiske imports (stale chunk hashes efter en deploy,
// netværksfejl midt i en lazy-load, m.v.) og viser en pæn besked med en
// "Genindlæs"-knap, frem for en hvid skærm. Tæt koblet til retryImport()
// i App.tsx — hvis dén ikke kan recovere, lander vi her.
import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

const isChunkError = (err: unknown) => {
  const msg = String((err as any)?.message || err || "");
  return (
    msg.includes("Failed to fetch dynamically imported module") ||
    msg.includes("error loading dynamically imported module") ||
    msg.includes("Importing a module script failed") ||
    msg.includes("Loading chunk") ||
    msg.includes("ChunkLoadError")
  );
};

type Props = { children: ReactNode };
type State = { error: Error | null; isChunk: boolean };

export class ChunkErrorBoundary extends Component<Props, State> {
  state: State = { error: null, isChunk: false };

  static getDerivedStateFromError(error: Error): State {
    return { error, isChunk: isChunkError(error) };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error("[ChunkErrorBoundary]", error, info.componentStack);
    }
  }

  private handleReload = () => {
    try {
      // Tving en fuld reload uden cache, så manifestet og chunk-hashes hentes på ny.
      window.location.reload();
    } catch {
      window.location.href = window.location.href;
    }
  };

  render() {
    const { error, isChunk } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <AlertTriangle className="h-6 w-6 text-foreground" />
          </div>
          <h2 className="mb-1.5 text-lg font-semibold text-foreground">
            {isChunk ? "Ny version tilgængelig" : "Der opstod en fejl"}
          </h2>
          <p className="mb-5 text-sm text-muted-foreground">
            {isChunk
              ? "Vi har lige udgivet en opdatering. Genindlæs siden for at hente den nyeste version."
              : "Noget gik galt under indlæsningen. Prøv at genindlæse siden."}
          </p>
          <Button onClick={this.handleReload} className="w-full">
            <RefreshCcw className="mr-2 h-4 w-4" />
            Genindlæs siden
          </Button>
          {import.meta.env.DEV && (
            <pre className="mt-4 max-h-32 overflow-auto rounded-md bg-muted p-2 text-left text-[10px] text-muted-foreground">
              {error.message}
            </pre>
          )}
        </div>
      </div>
    );
  }
}

export default ChunkErrorBoundary;
