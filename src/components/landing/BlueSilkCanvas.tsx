import { useEffect, useRef } from "react";

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
    float t = uTime * 0.045;
    vec2 drift = vec2(t * 0.45, -t * 0.32);
    vec2 warp = vec2(flow(p + drift + uPhase), flow(p - drift + 4.8 + uPhase));
    float current = flow(p + warp * 2.4 + vec2(-t * 0.22, t * 0.3));
    float depth = smoothstep(0.22, 0.78, current);
    float sheen = smoothstep(0.48, 0.72, current) * (1.0 - smoothstep(0.72, 0.91, current));
    float readability = mix(0.3, 0.8, smoothstep(0.0, 0.9, vUv.x));
    vec3 col = mix(uBase, uBlue, depth * 0.42 * readability);
    col = mix(col, uLight, sheen * 0.05 * readability);
    float edge = smoothstep(0.0, 0.18, vUv.y) * (1.0 - smoothstep(0.85, 1.0, vUv.y));
    col = mix(uBase, col, 0.6 + 0.4 * edge);
    gl_FragColor = vec4(col, 1.0);
  }
`;

/** A single shader does not need a scene engine or a second React renderer. */
export default function BlueSilkCanvas({ animate, colors, variant, onFailure, onReady }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawRef = useRef<(() => void) | null>(null);
  const timeRef = useRef(0);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { alpha: false, antialias: false, depth: false, powerPreference: "low-power" });
    if (!gl) { onFailure(); return; }
    const shaders: WebGLShader[] = [];
    let program: WebGLProgram | null = null;
    let buffer: WebGLBuffer | null = null;
    let observer: ResizeObserver | undefined;
    let readyFrame: number | undefined;
    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type);
      if (!shader) throw new Error("Background shader unavailable");
      shaders.push(shader);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error("Background shader failed");
      return shader;
    };
    try {
      program = gl.createProgram();
      if (!program) throw new Error("Background unavailable");
      gl.attachShader(program, compile(gl.VERTEX_SHADER, "attribute vec2 position; varying vec2 vUv; void main(){ vUv = position * .5 + .5; gl_Position = vec4(position, 0., 1.); }"));
      gl.attachShader(program, compile(gl.FRAGMENT_SHADER, "precision mediump float;\n" + fragmentShader));
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error("Background linking failed");
      gl.useProgram(program);
      buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW);
      const position = gl.getAttribLocation(program, "position");
      gl.enableVertexAttribArray(position);
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
      // CSS HSL tokens are converted directly to display-space RGB, without Three.js.
      const rgb = (raw: string): [number, number, number] => {
        const [h, s, l] = raw.trim().split(/\s+/).map(parseFloat);
        const light = l / 100, a = s / 100 * Math.min(light, 1 - light);
        const channel = (n: number) => { const k = (n + h / 30) % 12; return light - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); };
        return [channel(0), channel(8), channel(4)];
      };
      ["uBase", "uBlue", "uLight"].forEach((name, i) => gl.uniform3f(gl.getUniformLocation(program as WebGLProgram, name), ...rgb(colors[i])));
      gl.uniform1f(gl.getUniformLocation(program, "uPhase"), { hero: 0, process: 3.4, founder: 7.8, closing: 12.6 }[variant]);
      const aspect = gl.getUniformLocation(program, "uAspect");
      const time = gl.getUniformLocation(program, "uTime");
      let rect = canvas.getBoundingClientRect();
      const draw = () => {
        if (gl.isContextLost() || rect.width === 0 || rect.height === 0) return;
        const width = Math.max(1, Math.round(rect.width * .65));
        const height = Math.max(1, Math.round(rect.height * .65));
        if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
        gl.viewport(0, 0, width, height);
        gl.uniform1f(aspect, rect.width / rect.height);
        gl.uniform1f(time, timeRef.current);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      };
      drawRef.current = draw;
      observer = new ResizeObserver(() => { rect = canvas.getBoundingClientRect(); draw(); });
      observer.observe(canvas);
      draw();
      readyFrame = requestAnimationFrame(onReady);
    } catch { onFailure(); }
    const lost = (event: Event) => { event.preventDefault(); onFailure(); };
    canvas.addEventListener("webglcontextlost", lost);
    return () => {
      drawRef.current = null;
      observer?.disconnect();
      if (readyFrame !== undefined) cancelAnimationFrame(readyFrame);
      canvas.removeEventListener("webglcontextlost", lost);
      if (buffer) gl.deleteBuffer(buffer);
      if (program) gl.deleteProgram(program);
      shaders.forEach(shader => gl.deleteShader(shader));
    };
  }, [colors, variant, onFailure, onReady]);
  useEffect(() => {
    if (!animate) return;
    let previous = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now();
      if (!document.hidden) { timeRef.current += Math.min((now - previous) / 1000, .1); drawRef.current?.(); }
      previous = now;
    }, 1000 / 30);
    return () => window.clearInterval(timer);
  }, [animate]);
  return <canvas ref={canvasRef} aria-hidden="true" />;
}