import { Suspense, useEffect, useRef, useState, type ReactNode } from "react";

/** Fetch and mount just before the section enters view; keep it mounted afterwards. */
export default function DeferredSection({ children, fallback, preload }: { children: ReactNode; fallback: ReactNode; preload?: () => Promise<unknown> }) {
  const host = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    const element = host.current;
    if (!element) return;
    if (typeof IntersectionObserver === "undefined") { setNear(true); return; }
    // Warm the chunk ahead of mounting it; the section's effects still wait
    // until nearby, so scrolling does not start several canvases at once.
    const warmer = preload ? new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return;
      void preload().catch(() => { /* The visible boundary handles a failed load. */ });
      warmer?.disconnect();
    }, { rootMargin: "1800px 0px" }) : null;
    warmer?.observe(element);
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) { setNear(true); observer.disconnect(); }
    }, { rootMargin: "900px 0px" });
    observer.observe(element);
    return () => { observer.disconnect(); warmer?.disconnect(); };
  }, [preload]);
  return <div ref={host}>{near ? <Suspense fallback={fallback}>{children}</Suspense> : fallback}</div>;
}