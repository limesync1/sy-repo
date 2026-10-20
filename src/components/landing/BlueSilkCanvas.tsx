import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Color, ShaderMaterial, SRGBColorSpace } from "three";

import type { BlueFlowVariant } from "./BlueFlowBackground";

type Props = { variant: BlueFlowVariant; animate: boolean; colors: string[]; onFailure: () => void; onReady: () => void };
const fragmentShader = `
  varying vec2 vUv;
  uniform float uTime, uAspect, uPhase;
  uniform vec3 uBase, uBlue, uLight;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 s = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), s.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0)), s.x), s.y);
  }
  float flow(vec2 p) {
    return noise(p) * 0.58 + noise(p * 2.03 + 7.1) * 0.28 + noise(p * 4.01 + 13.7) * 0.14;
  }
  void main() {
    // Domain-warped currents give continuous depth instead of stripes or blobs.
    vec2 p = vec2(vUv.x * min(uAspect, 2.4), vUv.y) * 2.0;
    float t = uTime * 0.075;
    vec2 drift = vec2(t * 0.45, -t * 0.32);
    vec2 warp = vec2(flow(p + drift + uPhase), flow(p - drift + 4.8 + uPhase));
    float current = flow(p + warp * 2.4 + vec2(-t * 0.22, t * 0.3));
    float depth = smoothstep(0.22, 0.78, current);
    float sheen = smoothstep(0.48, 0.72, current) * (1.0 - smoothstep(0.72, 0.91, current));
    float readability = mix(0.48, 1.0, smoothstep(0.0, 0.85, vUv.x));
    vec3 col = mix(uBase, uBlue, depth * 0.65 * readability);
    col = mix(col, uLight, sheen * 0.16 * readability);
    float edge = smoothstep(0.0, 0.18, vUv.y) * (1.0 - smoothstep(0.85, 1.0, vUv.y));
    col = mix(uBase, col, 0.68 + 0.32 * edge);
    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`;

function SilkSurface({ animate, colors, variant }: Pick<Props, "animate" | "colors" | "variant">) {
  const materialRef = useRef<ShaderMaterial>(null);
  const uniforms = useMemo(() => {
    const read = (raw: string) => {
      const [h, s, l] = raw.trim().split(/\s+/).map(parseFloat);
      return new Color().setHSL(h / 360, s / 100, l / 100, SRGBColorSpace);
    };
    return { uPhase: { value: { hero: 0, process: 3.4, founder: 7.8, closing: 12.6 }[variant] }, uAspect: { value: 1 }, uTime: { value: 0 }, uBase: { value: read(colors[0]) }, uBlue: { value: read(colors[1]) }, uLight: { value: read(colors[2]) } };
  }, [colors, variant]);
  useFrame(({ size }, delta) => {
    if (materialRef.current) materialRef.current.uniforms.uAspect.value = size.width / Math.max(size.height, 1);
    if (animate && materialRef.current) materialRef.current.uniforms.uTime.value += Math.min(delta, 0.05);
  });
  return (
    <mesh frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial ref={materialRef} uniforms={uniforms} depthTest={false} depthWrite={false}
        vertexShader="varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }"
        fragmentShader={fragmentShader} />
    </mesh>
  );
}

export default function BlueSilkCanvas({ animate, colors, variant, onFailure, onReady }: Props) {
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
  useEffect(() => {
    if (!canvas) return;
    const lost = (event: Event) => { event.preventDefault(); onFailure(); };
    canvas.addEventListener("webglcontextlost", lost);
    return () => canvas.removeEventListener("webglcontextlost", lost);
  }, [canvas, onFailure]);
  return (
    <Canvas flat dpr={[1, 1.25]} frameloop={animate ? "always" : "demand"}
      gl={{ antialias: false, powerPreference: "low-power" }}
      fallback={null}
      onCreated={({ gl, events }) => {
        setCanvas(gl.domElement);
        events.disconnect?.();
        onReady();
      }}>
      <SilkSurface animate={animate} colors={colors} variant={variant} />
    </Canvas>
  );
}