// Letvægts mørk/lys toggle — KUN scoped til ruteplanlæggeren.
// Tidligere sattes `class="dark"` på <html>, hvilket smittede af på resten
// af appen. Nu eksponerer vi en hook (`usePlannerTheme`) som Planner-roden
// kan læse og applicere på sit eget wrapper-element, så mørk-tilstand kun
// gælder på siden "Ruter".
import { useEffect } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { usePersistentState } from "@/hooks/usePersistentState";

export function usePlannerTheme() {
  return usePersistentState<"light" | "dark">("route-planner:theme", "light");
}

/** Sikrer at en eventuel legacy `dark` klasse på <html> fjernes, så
 *  mørk-tilstand ikke utilsigtet ryger ud på andre sider. */
export function useEnsureGlobalDarkRemoved() {
  useEffect(() => {
    document.documentElement.classList.remove("dark");
  }, []);
}

export default function ThemeToggle() {
  const [theme, setTheme] = usePlannerTheme();
  const next = theme === "dark" ? "light" : "dark";
  const Icon = theme === "dark" ? Sun : Moon;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setTheme(next)} aria-label={`Skift til ${next === "dark" ? "mørk" : "lys"} tilstand`}>
          <Icon className="h-3.5 w-3.5" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">{theme === "dark" ? "Skift til lys" : "Skift til mørk"}</TooltipContent>
    </Tooltip>
  );
}