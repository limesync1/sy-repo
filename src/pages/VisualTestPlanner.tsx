import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/**
 * Visual regression fixture — mounter alle de UI-primitiver
 * ruteplanlæggeren bruger (knapper, modals, sheets, badges, inputs)
 * i ét layout. Playwright snapshotter siden i både light og dark mode
 * og verificerer hover/active/focus states.
 *
 * Bruges KUN af e2e/dark-mode-planner.spec.ts. Ruten er upubliceret
 * og kræver ikke auth.
 */
export default function VisualTestPlanner() {
  const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const mode = params.get("mode") ?? "light";
  const openDialog = params.get("dialog") === "1";
  const openAlert = params.get("alert") === "1";
  const openSheet = params.get("sheet") === "1";

  // Force tema via klassetilstand på <html> så vi rammer de samme regler
  // som resten af appen (next-themes sætter også .dark / .light).
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(mode === "dark" ? "dark" : "light");
    // Deaktiver animationer for stabile snapshots.
    root.setAttribute("data-disable-motion", "1");
    const style = document.createElement("style");
    style.id = "visual-test-disable-motion";
    style.textContent = `*, *::before, *::after { animation-duration: 0s !important; transition-duration: 0s !important; }`;
    document.head.appendChild(style);
    return () => {
      style.remove();
      root.removeAttribute("data-disable-motion");
    };
  }, [mode]);

  const [, force] = useState(0);
  useEffect(() => {
    // Re-render efter første paint så portal-modals er garanteret monteret
    // inden Playwright tager screenshot.
    const id = window.setTimeout(() => force((n) => n + 1), 50);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground p-8" data-testid="visual-test-root">
      <h1 className="text-2xl font-semibold mb-6">Visual regression — {mode} mode</h1>

      {/* ── Buttons — alle varianter + states ── */}
      <section className="space-y-4 mb-8" data-testid="buttons-section">
        <h2 className="text-lg font-medium">Knapper</h2>
        <div className="grid grid-cols-6 gap-3 max-w-4xl">
          {(["default", "secondary", "outline", "ghost", "destructive", "link"] as const).map((variant) => (
            <div key={variant} className="space-y-2">
              <p className="text-xs text-muted-foreground capitalize">{variant}</p>
              <Button variant={variant} data-testid={`btn-${variant}`}>Normal</Button>
              <Button variant={variant} data-testid={`btn-${variant}-disabled`} disabled>
                Disabled
              </Button>
            </div>
          ))}
        </div>
      </section>

      {/* ── Badges (planner-status-farver) ── */}
      <section className="space-y-3 mb-8" data-testid="badges-section">
        <h2 className="text-lg font-medium">Badges</h2>
        <div className="flex flex-wrap gap-2">
          <Badge>Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="outline">Outline</Badge>
          <Badge variant="destructive">Destructive</Badge>
          <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
            Færdig
          </span>
          <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
            I gang
          </span>
          <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-300 dark:border-orange-500/30">
            Utildelt
          </span>
        </div>
      </section>

      {/* ── Card + Input/Select (planner forms) ── */}
      <section className="mb-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Eksisterende rute</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="route-name">Rutenavn</Label>
              <Input id="route-name" placeholder="Skriv navn..." defaultValue="Blå rute" />
            </div>
            <div className="space-y-2">
              <Label>Vælg</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Vælg en rute" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="a">Blå rute</SelectItem>
                  <SelectItem value="b">Grøn rute</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ── Modals — åbnet via querystring så Playwright kan snapshotte hver ── */}
      <Dialog open={openDialog}>
        <DialogContent data-testid="dialog-content">
          <DialogHeader>
            <DialogTitle>Flet ruter</DialogTitle>
            <DialogDescription>
              Sammenflet "Blå rute" med "Grøn rute". Stop fra Blå flyttes til Grøn.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Målrute</Label>
            <Input defaultValue="Grøn rute" />
          </div>
          <DialogFooter>
            <Button variant="outline">Annuller</Button>
            <Button>Flet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={openAlert}>
        <AlertDialogContent data-testid="alert-content">
          <AlertDialogHeader>
            <AlertDialogTitle>Slet rute permanent?</AlertDialogTitle>
            <AlertDialogDescription>
              Handlingen kan ikke fortrydes. Alle stop på ruten frigives.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuller</AlertDialogCancel>
            <AlertDialogAction>Slet</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Sheet open={openSheet}>
        <SheetContent data-testid="sheet-content" side="right">
          <SheetHeader>
            <SheetTitle>Tildel medarbejder</SheetTitle>
            <SheetDescription>Vælg en medarbejder til ruten.</SheetDescription>
          </SheetHeader>
          <div className="mt-4 space-y-3">
            <Button variant="outline" className="w-full justify-start">Jens Hansen</Button>
            <Button variant="outline" className="w-full justify-start">Maria Olsen</Button>
            <Button variant="ghost" className="w-full justify-start">Lars Nielsen</Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
