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
    float t = uTime * 0.09;
    // Slow, overlapping fabric folds. Quiet left side protects the content;
    // fine secondary folds add depth without bright stripes or pulsing.
    vec3 col = uBase;
    float light = 0.0;
    float body = 0.0;
    for (int i = 0; i < 6; i++) {
      float n = float(i);
      float bend = sin(p.x * 2.6 + t + n * 1.7) * 0.12
        + sin(p.x * 4.1 - t * 0.4 + n * 1.3) * 0.035;
      float center = -0.22 + n * 0.23 + p.x * 0.3 + bend;
      float d = p.y - center;
      body += exp(-d * d * 45.0) * 0.16;
      float crest = exp(-pow(d - 0.055, 2.0) * 180.0);
      light += crest * 0.026;
    }
    float readability = 0.15 + 0.6 * smoothstep(0.15, 1.0, p.x);
    col = mix(col, uBlue, clamp(body * readability, 0.0, 0.38));
    col = mix(col, uLight, clamp(light * readability, 0.0, 0.065));
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