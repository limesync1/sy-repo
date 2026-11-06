import { useEffect, useRef, useState } from "react";
import { Loader2, Minus, Plus, RotateCcw, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { imageCoverScale, rotatedFitScale, visibleImageBounds } from "@/lib/profile-image-source";

const VIEW = 280;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 4;

type Props = {
  file: File | null;
  shape?: "circle" | "square";
  /** Outputstørrelse i pixels (kvadratisk). */
  outputSize?: number;
  onCancel: () => void;
  onDone: (blob: Blob) => void;
  hasOriginal?: boolean;
};

/** Preview and export use the same centered rotation and scale. */
export function ImageCropDialog({ file, shape = "circle", outputSize = 512, onCancel, onDone, hasOriginal = true }: Props) {
  const [view, setView] = useState(VIEW);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [loadError, setLoadError] = useState(false);
  const [bounds, setBounds] = useState({ x: 0, y: 0, width: 1, height: 1 });
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const pinch = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchStart = useRef<{ dist: number; zoom: number } | null>(null);
  const areaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!file) { setImg(null); return; }
    setImg(null);
    setLoadError(false);
    setView(VIEW);
    setRotation(0);
    const url = URL.createObjectURL(file);
    const image = new Image();
    let cancelled = false;
    image.onload = () => {
      if (cancelled) return;
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const ctx = canvas.getContext("2d");
      let area = { x: 0, y: 0, width: image.naturalWidth, height: image.naturalHeight };
      if (ctx) {
        ctx.drawImage(image, 0, 0);
        area = visibleImageBounds(ctx.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height);
      }
      setBounds(area); setImg(image); setZoom(1); setOffset({ x: 0, y: 0 });
    };
    image.onerror = () => { if (!cancelled) setLoadError(true); };
    image.src = url;
    return () => { cancelled = true; URL.revokeObjectURL(url); };
  }, [file]);

  const base = img ? imageCoverScale(bounds.width, bounds.height, view, rotation) : 1;
  const w = img ? bounds.width * base * zoom : 0;
  const h = img ? bounds.height * base * zoom : 0;
  const fitZoom = img ? rotatedFitScale(bounds.width, bounds.height, view, shape === "circle", rotation) / base : 1;
  const minZoom = Math.min(MIN_ZOOM, fitZoom);

  useEffect(() => {
    const area = areaRef.current;
    if (!area) return;
    const observer = new ResizeObserver(([entry]) => {
      // A closing portal briefly measures zero; never carry that into the next crop.
      if (entry && entry.contentRect.width > 0) setView(entry.contentRect.width);
    });
    observer.observe(area);
    return () => observer.disconnect();
  }, [img]);

  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1);
      setZoom((z) => Math.min(MAX_ZOOM, Math.max(minZoom, z * Math.exp(-dy * 0.002))));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [img, minZoom]);

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    pinch.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch.current.size === 2) {
      const [a, b] = [...pinch.current.values()];
      pinchStart.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), zoom };
      drag.current = null;
    } else {
      drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
    }
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!pinch.current.has(e.pointerId)) return;
    pinch.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch.current.size === 2 && pinchStart.current) {
      const [a, b] = [...pinch.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      setZoom(Math.min(MAX_ZOOM, Math.max(minZoom, pinchStart.current.zoom * (d / pinchStart.current.dist))));
    } else if (drag.current) {
      setOffset({ x: drag.current.ox + e.clientX - drag.current.x, y: drag.current.oy + e.clientY - drag.current.y });
    }
  };
  const onPointerUp = (e: React.PointerEvent) => {
    pinch.current.delete(e.pointerId);
    if (pinch.current.size < 2) pinchStart.current = null;
    drag.current = null;
  };

  const save = () => {
    if (!img || view <= 0) return;
    const canvas = document.createElement("canvas");
    canvas.width = outputSize;
    canvas.height = outputSize;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const s = outputSize / view;
    ctx.imageSmoothingQuality = "high";
    ctx.translate((view / 2 + offset.x) * s, (view / 2 + offset.y) * s);
    ctx.rotate(rotation * Math.PI / 180);
    ctx.drawImage(img, bounds.x, bounds.y, bounds.width, bounds.height, -w * s / 2, -h * s / 2, w * s, h * s);
    canvas.toBlob((blob) => blob && onDone(blob), "image/webp", 0.9);
  };

  const step = (d: number) => setZoom((z) => Math.min(MAX_ZOOM, Math.max(minZoom, +(z + d).toFixed(2))));

  return (
    <Dialog open={!!file} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <DialogContent className="w-[calc(100vw-1rem)] max-w-sm max-h-[calc(100dvh-1rem)] overflow-y-auto gap-4 rounded-md p-4 sm:p-5">
        <DialogHeader className="text-left">
          <DialogTitle className="text-base">Tilpas billedet</DialogTitle>
          <DialogDescription className="text-sm">{hasOriginal ? "Træk billedet på plads, og zoom ind eller ud." : "Dette billede er allerede beskåret. Vælg originalfilen via Skift billede for at få hele motivet tilbage."}</DialogDescription>
        </DialogHeader>
        <div
          ref={areaRef}
          className="relative mx-auto w-full max-w-[280px] aspect-square cursor-grab touch-none select-none overflow-hidden rounded-md bg-muted ring-1 ring-border"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {img ? (
            <div className="pointer-events-none absolute overflow-hidden" style={{ width: w, height: h, left: (view - w) / 2 + offset.x, top: (view - h) / 2 + offset.y, transform: `rotate(${rotation}deg)` }}><img
              src={img.src}
              alt=""
              draggable={false}
              className="pointer-events-none absolute max-w-none"
              style={{ width: img.naturalWidth * base * zoom, height: img.naturalHeight * base * zoom, left: -bounds.x * base * zoom, top: -bounds.y * base * zoom }}
            /></div>
          ) : <div className="absolute inset-0 flex items-center justify-center p-4 text-center text-sm text-muted-foreground" role="status">{loadError ? "Billedet kunne ikke åbnes. Vælg billedet igen." : <Loader2 className="h-6 w-6 animate-spin" aria-label="Henter billede" />}</div>}
          {shape === "circle" ? (
            <div className="pointer-events-none absolute inset-0 rounded-full shadow-[0_0_0_9999px_hsl(var(--foreground)/0.45)] ring-2 ring-background" />
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="icon" className="h-11 w-11 shrink-0" onClick={() => step(-0.1)} aria-label="Zoom ud"><Minus className="h-4 w-4" /></Button>
          <Slider value={[zoom]} min={minZoom} max={MAX_ZOOM} step={0.01} onValueChange={([v]) => setZoom(v)} aria-label="Zoom" className="flex-1" />
          <Button type="button" variant="outline" size="icon" className="h-11 w-11 shrink-0" onClick={() => step(0.1)} aria-label="Zoom ind"><Plus className="h-4 w-4" /></Button>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="icon" className="h-11 w-11 shrink-0" aria-label="Drej 90 grader til venstre" title="Drej 90 grader til venstre" disabled={!img} onClick={() => { setRotation((r) => r - 90); setOffset({ x: 0, y: 0 }); }}><RotateCcw className="h-4 w-4" /></Button>
          <Slider value={[((rotation + 180) % 360 + 360) % 360 - 180]} min={-180} max={180} step={1} onValueChange={([v]) => setRotation(v)} aria-label="Drej billedet" className="flex-1" />
          <Button type="button" variant="outline" size="icon" className="h-11 w-11 shrink-0" aria-label="Drej 90 grader til højre" title="Drej 90 grader til højre" disabled={!img} onClick={() => { setRotation((r) => r + 90); setOffset({ x: 0, y: 0 }); }}><RotateCw className="h-4 w-4" /></Button>
        </div>
        <div className="flex flex-col-reverse gap-2">
          <Button type="button" variant="ghost" className="min-h-11" disabled={!img} onClick={() => { if (!img) return; setZoom(fitZoom); setOffset({ x: 0, y: 0 }); }}><RotateCcw className="mr-1.5 h-4 w-4" />{hasOriginal ? "Vis hele billedet" : "Centrér billedet"}</Button>
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="min-h-11 flex-1" onClick={onCancel}>Annullér</Button>
            <Button type="button" className="min-h-11 flex-1" onClick={save} disabled={!img}>Brug billede</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
