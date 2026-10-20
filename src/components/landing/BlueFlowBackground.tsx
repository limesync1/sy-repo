import { Component, lazy, Suspense, useCallback, useEffect, useRef, useState, type ReactNode } from "react";

const BlueSilkCanvas = lazy(() => import("./BlueSilkCanvas"));
class BackgroundBoundary extends Component<{ children: ReactNode; onFailure: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onFailure(); }
  render() { return this.state.failed ? null : this.props.children; }
}

/** Decoration has no pointer input; content never depends on GPU availability. */
export type BlueFlowVariant = "hero" | "process" | "founder" | "closing";

export default function BlueFlowBackground({ variant = "hero" }: { variant?: BlueFlowVariant }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [colors, setColors] = useState<string[]>([]);
  const [animate, setAnimate] = useState(false);
  const [started, setStarted] = useState(false);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const onFailure = useCallback(() => setFailed(true), []);
  const onReady = useCallback(() => setReady(true), []);
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const styles = getComputedStyle(host);
    setColors(["--hero-bg", "--hero-mid", "--brand-blue-start"].map(token => styles.getPropertyValue(token)));
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    let visible = false;
    const sync = () => setAnimate(visible && !document.hidden && !motion.matches);
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) setStarted(true);
      sync();
    });
    observer.observe(host);
    motion.addEventListener("change", sync);
    document.addEventListener("visibilitychange", sync);
    return () => {
      observer.disconnect();
      motion.removeEventListener("change", sync);
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);
  return (
    <div ref={hostRef} aria-hidden="true" className="blue-flow-background" data-flow={variant} data-webgl={failed ? "fallback" : ready ? "ready" : "loading"}>
      {started && colors.length === 3 && !failed && (
        <BackgroundBoundary onFailure={onFailure}>
          <Suspense fallback={null}>
            <BlueSilkCanvas animate={animate} colors={colors} variant={variant} onFailure={onFailure} onReady={onReady} />
          </Suspense>
        </BackgroundBoundary>
      )}
    </div>
  );
}
