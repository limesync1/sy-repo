// Letvægts mørk/lys toggle udelukkende baseret på `class="dark"` på <html>.
// Bruger localStorage så valget overlever reload. Initialiserer ved første
// mount — hvis brugeren intet har valgt, følger den OS-præferencen.
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const KEY = "route-planner:theme";

function readInitial(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem(KEY);
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">(() => readInitial());
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    try { window.localStorage.setItem(KEY, theme); } catch { /* ignore */ }
  }, [theme]);
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