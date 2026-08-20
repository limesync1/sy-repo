// TabErrorBoundary — ensartet fejl-/retry-state for hver fane i virksomheds-
// og platformpanelet. Fanger render-fejl (inkl. fejlede lazy-imports) og
// viser et venligt kort med fejlbesked + "Prøv igen"-knap der genmonterer
// børnene. Bruges som wrapper omkring <Suspense> i Admin/PlatformAdmin.
import { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Props = {
  /** Skifter når fanen skifter — nulstiller fejl-state ved tab-skift. */
  resetKey?: string | number;
  /** Hvis sat: tekst i overskriften (fx tab-navnet). */
  label?: string;
  children: ReactNode;
};

type State = { error: Error | null };

export class TabErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidUpdate(prev: Props) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  componentDidCatch(error: Error) {
    // Log til konsol så udvikleren stadig kan se stack-trace,
    // men brugeren ser kun den venlige besked.
    // eslint-disable-next-line no-console
    console.error("[TabErrorBoundary]", this.props.label ?? "", error);
  }

  handleRetry = () => {
    this.setState({ error: null });
  };

  render() {
    if (!this.state.error) return this.props.children;
    // Rettighedsfejl (RLS) får en venlig forklaring med trin-for-trin hjælp
    // i stedet for den rå engelske Postgres-besked.
    if (isPermissionError(this.state.error)) {
      return (
        <PermissionErrorNotice
          error={this.state.error}
          context={this.props.label}
          onRetry={this.handleRetry}
        />
      );
    }
    const message = this.state.error.message || "Ukendt fejl";
    return (
      <Card className="rounded-xl border border-destructive/30 bg-destructive/5 animate-fade-in-soft">

        <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">
              {this.props.label
                ? `Kunne ikke indlæse "${this.props.label}"`
                : "Kunne ikke indlæse fanen"}
            </p>
            <p className="mx-auto max-w-md text-xs text-muted-foreground break-words">
              {message}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={this.handleRetry}
            className="gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Prøv igen
          </Button>
        </CardContent>
      </Card>
    );
  }
}

export default TabErrorBoundary;