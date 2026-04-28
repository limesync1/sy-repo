import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

/**
 * En interaktiv tour består af en serie steps. Hvert step peger på et element
 * i UI'et via `selector` (typisk `[data-tour="..."]`) — tour-overlayet finder
 * elementet, tegner et hul i dim-laget rundt om det og viser en tooltip.
 *
 * Tours er navngivne (`tourId`) så vi kan starte den rigtige sekvens når
 * brugeren klikker fx "Vis mig hvordan jeg opretter en service".
 * Hvis et element ikke findes med det samme (fx fordi siden er ved at loade)
 * poller overlayet i op til ~5s før det springer til næste step.
 */
export type TourStep = {
  /** CSS-selector — typisk `[data-tour="..."]` */
  selector: string;
  title: string;
  body: string;
  /** Hvor tooltippen skal placeres ift. mål-elementet. */
  placement?: "top" | "bottom" | "left" | "right" | "auto";
  /** Hvis sat: før dette step renderes, naviger først hertil. */
  navigateTo?: string;
  /** Tilføj et lille pil-ikon der peger på et klik som brugeren skal udføre. */
  action?: "click" | "scroll";
  /**
   * Hvis true: brugeren kan klikke/interagere med mål-elementet (fx udfylde
   * et input-felt). Dim-laget udenfor blokerer stadig klik og viser en
   * "ikke muligt under guide"-besked.
   * Default: false (alt er blokeret — brugeren skal bruge Næste-knappen).
   */
  interactive?: boolean;
  /**
   * Vis "Spring over felt"-knap. Bruges typisk på interaktive felt-trin
   * hvor brugeren kan vælge at hoppe videre uden at udfylde noget.
   */
  skippable?: boolean;
};

export type TourDefinition = {
  id: string;
  /** Onboarding-step-id der bliver markeret som færdigt når touren er fuldført. */
  completesStepId?: string;
  steps: TourStep[];
};

type TourContextValue = {
  active: TourDefinition | null;
  stepIndex: number;
  start: (tour: TourDefinition) => void;
  next: () => void;
  prev: () => void;
  stop: () => void;
};

const TourContext = createContext<TourContextValue | null>(null);

export const useTour = () => {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error("useTour must be used within TourProvider");
  return ctx;
};

export const TourProvider = ({ children }: { children: ReactNode }) => {
  const [active, setActive] = useState<TourDefinition | null>(null);
  const [stepIndex, setStepIndex] = useState(0);

  const start = useCallback((tour: TourDefinition) => {
    setActive(tour);
    setStepIndex(0);
  }, []);

  const next = useCallback(() => {
    setStepIndex((i) => {
      if (!active) return i;
      if (i + 1 >= active.steps.length) {
        // Færdig — luk touren
        setActive(null);
        return 0;
      }
      return i + 1;
    });
  }, [active]);

  const prev = useCallback(() => {
    setStepIndex((i) => Math.max(0, i - 1));
  }, []);

  const stop = useCallback(() => {
    setActive(null);
    setStepIndex(0);
  }, []);

  return (
    <TourContext.Provider value={{ active, stepIndex, start, next, prev, stop }}>
      {children}
    </TourContext.Provider>
  );
};