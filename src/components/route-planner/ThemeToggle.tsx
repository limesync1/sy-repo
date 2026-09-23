// Letvægts mørk/lys toggle for ruteplanlæggeren.
// Mørk-tilstand skal gælde HELE siden mens man er på ruteplanlæggeren —
// inkl. sidebar, topbar og alt portal-indhold (dialoger, sheets, popovers,
// dropdowns, tooltips). Derfor sætter vi `class="dark"` på <html> mens
// Planner er monteret, og fjerner den igen ved unmount, så andre sider
// forbliver i lys tilstand.
import { useEffect, useRef } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { usePersistentState } from "@/hooks/usePersistentState";

export function usePlannerTheme() {
  return usePersistentState<"light" | "dark">("route-planner:theme", "light");
}

/** Anvender ruteplanlæggerens tema på <html> mens siden er monteret.
 *  Sikrer at portal-indhold (dialoger, popovers, sheets m.m.) og hele
 *  app-rammen følger temaet. Rydder altid op ved unmount. */
export function usePlannerThemeEffect() {
  const [theme] = usePlannerTheme();
  const previousDark = useRef<boolean | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    previousDark.current = root.classList.contains("dark");
    return () => {
      root.classList.toggle("dark", previousDark.current === true);
      root.classList.remove("theme-transitioning");
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    // Aktiver krydsfade på alle elementer kortvarigt, så skiftet ml.
    // lys/mørk føles blødt og øjenvenligt. Vinduet matcher CSS-varigheden.
    root.classList.add("theme-transitioning");
    const t = window.setTimeout(() => {
      root.classList.remove("theme-transitioning");
    }, 560);
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    return () => {
      window.clearTimeout(t);
      root.classList.remove("theme-transitioning");
    };
  }, [theme]);
  return theme;
}

export default function ThemeToggle() {
  const [theme, setTheme] = usePlannerTheme();
  const next = theme === "dark" ? "light" : "dark";
  const Icon = theme === "dark" ? Sun : Moon;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="outline" size="icon" className="h-7 w-7 rounded-[4px] bg-background shadow-sm" onClick={() => setTheme(next)} aria-label={`Skift til ${next === "dark" ? "mørk" : "lys"} tilstand`}>
          <Icon className="h-3.5 w-3.5" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">{theme === "dark" ? "Skift til lys" : "Skift til mørk"}</TooltipContent>
    </Tooltip>
  );
}