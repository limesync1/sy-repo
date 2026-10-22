import { Suspense, useEffect, useRef, useState, type ReactNode } from "react";

/** Fetch and mount just before the section enters view; keep it mounted afterwards. */
export default function DeferredSection({ children, fallback }: { children: ReactNode; fallback: ReactNode }) {
  const host = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    const element = host.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) { setNear(true); observer.disconnect(); }
    }, { rootMargin: "900px 0px" });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return <div ref={host}>{near ? <Suspense fallback={fallback}>{children}</Suspense> : fallback}</div>;
}