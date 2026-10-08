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
    float t = uTime * 0.075;
    // Broad overlapping silk folds, not repeated stripes or pointer distortion.
    float bend = sin(p.x * 3.1 + t) * 0.13
      + sin(p.x * 1.7 - t * 0.65 + 1.5) * 0.08;
    float foldA = p.y - (0.25 + p.x * 0.28 + bend);
    float foldB = p.y - (0.75 - p.x * 0.19 + sin(p.x * 2.4 + t * 0.8) * 0.1);
    float silkA = exp(-foldA * foldA * 22.0);
    float silkB = exp(-foldB * foldB * 18.0);
    float seam = exp(-pow(foldA - 0.09, 2.0) * 160.0);
    float right = smoothstep(0.0, 1.0, p.x);
    float shade = (silkA * 0.46 + silkB * 0.24) * (0.5 + right * 0.5);
    vec3 col = mix(uBase, uBlue, shade);
    col = mix(col, uLight, seam * 0.065 * right);
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