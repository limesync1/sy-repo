import { useEffect, useRef } from "react";

/** GPU decoration only: content is independent of WebGL availability. */
export default function BlueFlowBackground() {
  const hostRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;
    let cleanup = () => {};
    void import("three").then((THREE) => {
      if (disposed) return;
      let renderer: InstanceType<typeof THREE.WebGLRenderer>;
      try {
        renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "low-power" });
      } catch { host.dataset.webgl = "fallback"; return; }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      host.appendChild(renderer.domElement);
      const styles = getComputedStyle(host);
      const color = (token: string) => {
        const [h, s, l] = styles.getPropertyValue(token).trim().split(/\s+/).map(parseFloat);
        return new THREE.Color().setHSL(h / 360, s / 100, l / 100, THREE.SRGBColorSpace);
      };
      const uniforms = {
        uTime: { value: 0 },
        uPointer: { value: new THREE.Vector2(0.5, 0.5) },
        uBase: { value: color("--hero-bg") },
        uBlue: { value: color("--hero-mid") },
        uHighlight: { value: color("--brand-blue-start") },
      };
      const material = new THREE.ShaderMaterial({
        uniforms, depthTest: false, depthWrite: false,
        vertexShader: `varying vec2 vUv;
          void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
        fragmentShader: `varying vec2 vUv;
          uniform float uTime;
          uniform vec2 uPointer;
          uniform vec3 uBase, uBlue, uHighlight;
          void main() {
            vec2 p = vUv;
            float t = uTime * 0.13;
            float bend = sin(p.x * 3.8 + t) * 0.12 + sin(p.x * 7.0 - t * 0.7) * 0.025;
            float axis = p.y + bend + (uPointer.y - 0.5) * 0.025;
            float wave = smoothstep(0.14, 0.62, axis) * (1.0 - smoothstep(0.7, 1.25, axis));
            float ribbon = pow(0.5 + 0.5 * sin(axis * 23.0 + p.x * 2.0 + t), 18.0);
            float fine = pow(0.5 + 0.5 * sin(axis * 65.0 - t * 0.5), 34.0);
            float right = smoothstep(0.08, 0.95, p.x);
            vec3 shade = mix(uBase, uBlue, wave * (0.22 + right * 0.65));
            shade = mix(shade, uHighlight, (ribbon * 0.18 + fine * 0.035) * right);
            gl_FragColor = vec4(shade, 1.0);
            #include <colorspace_fragment>
          }`,
      });
      const geometry = new THREE.PlaneGeometry(2, 2);
      const scene = new THREE.Scene();
      scene.add(new THREE.Mesh(geometry, material));
      const camera = new THREE.Camera();
      let frame = 0;
      let visible = false;
      let lostContext = false;
      let last = 0;
      let elapsed = 0;
      let previous = 0;
      const motion = matchMedia("(prefers-reduced-motion: reduce)");
      const render = () => {
        if (lostContext) return;
        renderer.render(scene, camera);
        host.dataset.webgl = "ready";
      };
      const tick = (now: number) => {
        if (!visible || document.hidden || motion.matches || disposed || lostContext) { frame = 0; previous = 0; return; }
        if (now - last >= 1000 / 24) {
          if (previous) elapsed += Math.min((now - previous) / 1000, 0.1);
          previous = now;
          uniforms.uTime.value = elapsed;
          render();
          last = now;
        }
        frame = requestAnimationFrame(tick);
      };
      const sync = () => {
        cancelAnimationFrame(frame);
        frame = 0;
        previous = 0;
        if (visible && !document.hidden && !motion.matches && !lostContext) frame = requestAnimationFrame(tick);
        else render();
      };
      const resize = new ResizeObserver(() => {
        const { width, height } = host.getBoundingClientRect();
        if (!width || !height) return;
        renderer.setSize(width, height, false);
        render();
      });
      resize.observe(host);
      const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); });
      observer.observe(host);
      const parent = host.parentElement;
      const pointer = (event: PointerEvent) => {
        if (motion.matches || event.pointerType !== "mouse") return;
        const rect = host.getBoundingClientRect();
        uniforms.uPointer.value.set((event.clientX - rect.left) / rect.width, 1 - (event.clientY - rect.top) / rect.height);
      };
      const lost = (event: Event) => {
        event.preventDefault();
        lostContext = true;
        cancelAnimationFrame(frame);
        renderer.domElement.hidden = true;
        host.dataset.webgl = "fallback";
      };
      parent?.addEventListener("pointermove", pointer);
      renderer.domElement.addEventListener("webglcontextlost", lost);
      document.addEventListener("visibilitychange", sync);
      motion.addEventListener("change", sync);
      cleanup = () => {
        cancelAnimationFrame(frame);
        observer.disconnect(); resize.disconnect();
        parent?.removeEventListener("pointermove", pointer);
        document.removeEventListener("visibilitychange", sync);
        motion.removeEventListener("change", sync);
        renderer.domElement.removeEventListener("webglcontextlost", lost);
        geometry.dispose(); material.dispose(); renderer.dispose();
        renderer.domElement.remove();
      };
    }).catch(() => { if (!disposed) host.dataset.webgl = "fallback"; });
    return () => { disposed = true; cleanup(); };
  }, []);
  return <div ref={hostRef} aria-hidden="true" className="blue-flow-background" />;
}