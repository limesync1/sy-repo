import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Color, ShaderMaterial, SRGBColorSpace } from "three";

type Props = { animate: boolean; colors: string[]; onFailure: () => void; onReady: () => void };
const fragmentShader = `
  varying vec2 vUv;
  uniform float uTime;
  uniform vec3 uBase, uBlue, uLight;
  void main() {
    vec2 p = vUv;
    float t = uTime * 0.32;
    // Continuous satin ribbons: broad shadows and soft moving crests.
    // No pointer input, noisy texture, particles, or flashing highlights.
    vec3 col = uBase;
    float light = 0.0;
    float body = 0.0;
    for (int i = 0; i < 4; i++) {
      float n = float(i);
      float bend = sin(p.x * 3.4 + t * (0.7 + n * 0.12) + n * 1.9) * 0.16
        + sin(p.x * 5.2 - t * 0.6 + n * 2.3) * 0.055;
      float center = -0.18 + n * 0.32 + p.x * 0.34 + bend;
      float d = p.y - center;
      body += exp(-d * d * 32.0) * 0.38;
      float crest = exp(-pow(d - 0.06, 2.0) * 260.0);
      light += crest * (0.11 + 0.045 * sin(p.x * 4.0 + t + n));
    }
    float readability = 0.55 + 0.45 * smoothstep(0.0, 0.85, p.x);
    col = mix(col, uBlue, clamp(body * readability, 0.0, 0.85));
    col = mix(col, uLight, clamp(light * readability, 0.0, 0.26));
    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`;

function SilkSurface({ animate, colors }: Pick<Props, "animate" | "colors">) {
  const materialRef = useRef<ShaderMaterial>(null);
  const uniforms = useMemo(() => {
    const read = (raw: string) => {
      const [h, s, l] = raw.trim().split(/\s+/).map(parseFloat);
      return new Color().setHSL(h / 360, s / 100, l / 100, SRGBColorSpace);
    };
    return { uTime: { value: 0 }, uBase: { value: read(colors[0]) }, uBlue: { value: read(colors[1]) }, uLight: { value: read(colors[2]) } };
  }, [colors]);
  useFrame((_, delta) => {
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

export default function BlueSilkCanvas({ animate, colors, onFailure, onReady }: Props) {
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
  useEffect(() => {
    if (!canvas) return;
    const lost = (event: Event) => { event.preventDefault(); onFailure(); };
    canvas.addEventListener("webglcontextlost", lost);
    return () => canvas.removeEventListener("webglcontextlost", lost);
  }, [canvas, onFailure]);
  return (
    <Canvas flat dpr={[1, 1.5]} frameloop={animate ? "always" : "demand"}
      gl={{ antialias: false, powerPreference: "low-power" }}
      fallback={null}
      onCreated={({ gl, events }) => {
        setCanvas(gl.domElement);
        events.disconnect?.();
        onReady();
      }}>
      <SilkSurface animate={animate} colors={colors} />
    </Canvas>
  );
}