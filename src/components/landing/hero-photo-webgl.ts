import { containPhotoScale } from "./photo-fit";

/** Opaque photo-to-photo reveal: no background phase or displaced subjects. */
export function createPhotoTransition(canvas: HTMLCanvasElement) {
  const gl = canvas.getContext("webgl", { alpha: false, antialias: false, depth: false, preserveDrawingBuffer: true });
  if (!gl) return null;
  const compile = (type: number, source: string) => {
    const shader = gl.createShader(type);
    if (!shader) throw new Error("Shader unavailable");
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      gl.deleteShader(shader);
      throw new Error("Photo shader unavailable");
    }
    return shader;
  };
  const vertex = compile(gl.VERTEX_SHADER, `attribute vec2 position; varying vec2 uv;
    void main(){uv=position*.5+.5;gl_Position=vec4(position,0.,1.);}`);
  const fragment = compile(gl.FRAGMENT_SHADER, `precision mediump float;
    varying vec2 uv; uniform sampler2D photo; uniform sampler2D nextPhoto;
    uniform vec2 crop; uniform vec2 nextCrop; uniform float progress; uniform float direction;
    vec3 fitted(sampler2D tex, vec2 p){
      // Uniform photo ratios keep the frame and subjects still.
      return texture2D(tex,clamp(p,vec2(0.),vec2(1.))).rgb;
    }
    // Soft-focus sampling: taps fan out sideways only where the fold passes,
    // so subjects stay still and the overlap reads as motion blur, not ghosting.
    vec3 soft(sampler2D tex, vec2 cr, vec2 p, float r){
      vec2 o=vec2(r*1.7,r*.5);
      vec3 s=fitted(tex,(p-.5)*cr+.5);
      s+=fitted(tex,(p+vec2(o.x,o.y)-.5)*cr+.5);
      s+=fitted(tex,(p+vec2(-o.x,o.y)-.5)*cr+.5);
      s+=fitted(tex,(p+vec2(o.x,-o.y)-.5)*cr+.5);
      s+=fitted(tex,(p+vec2(-o.x,-o.y)-.5)*cr+.5);
      return s*.2;
    }
    void main(){
      // A slow drifting swell instead of a straight wipe.
      float envelope=sin(progress*3.14159265);
      float wave=sin(uv.y*2.3+progress*1.5)*.055
        +sin(uv.y*4.7-progress*1.05)*.018;
      float x=mix(uv.x,1.-uv.x,direction);
      float edge=progress*1.30-.15+wave*envelope;
      float distance=x-edge;
      float band=exp(-abs(distance)*11.);
      // Narrow feather + heavy sideways blur: soft melt, no doubled subjects.
      vec3 a=soft(photo,crop,uv,.016*band);
      vec3 b=soft(nextPhoto,nextCrop,uv,.016*band);
      vec3 c=mix(a,b,1.-smoothstep(-.045,.045,distance));
      // Barely-there shading keeps the fold readable without drawing a line.
      c=c*(1.-.05*band*envelope)+c*.022*exp(-abs(distance+.016)*26.)*envelope;
      gl_FragColor=vec4(c,1.);
    }`);


  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  gl.useProgram(program);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, "position");
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  const crop = gl.getUniformLocation(program, "crop");
  const nextCrop = gl.getUniformLocation(program, "nextCrop");
  const progressUniform = gl.getUniformLocation(program, "progress");
  const directionUniform = gl.getUniformLocation(program, "direction");
  gl.uniform1i(gl.getUniformLocation(program, "photo"), 0);
  gl.uniform1i(gl.getUniformLocation(program, "nextPhoto"), 1);
  let frame = 0;
  let disposed = false;
  let reverse = false;
  let complete: ((ok: boolean) => void) | undefined;
  const textures: WebGLTexture[] = [];
  const texture = (image: HTMLImageElement) => {
    const t = gl.createTexture();
    if (!t) throw new Error("Texture unavailable");
    textures.push(t);
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
    return t;
  };
  const smooth = (x: number) => x * x * x * (x * (x * 6 - 15) + 10);
  return {
    transition(from: HTMLImageElement, to: HTMLImageElement, reveal: () => void) {
      return new Promise<boolean>((resolve) => {
        complete = resolve;
        if (disposed || gl.isContextLost()) { resolve(false); return; }
        const a = texture(from), b = texture(to);
        const fromAspect = from.naturalWidth / from.naturalHeight;
        const toAspect = to.naturalWidth / to.naturalHeight;
        gl.uniform1f(directionUniform, reverse ? 1 : 0);
        reverse = !reverse;
        let elapsed = 0, previous = performance.now();
        let revealed = false;
        let rect = canvas.getBoundingClientRect();
        const refreshSize = () => { rect = canvas.getBoundingClientRect(); };
        const resize = new ResizeObserver(refreshSize);
        resize.observe(canvas);
        const visibility = new IntersectionObserver(refreshSize);
        visibility.observe(canvas);
        const finish = (ok: boolean) => { resize.disconnect(); visibility.disconnect(); complete = undefined; resolve(ok); };
        complete = finish;
        const draw = (now: number) => {
          if (disposed || gl.isContextLost()) { finish(false); return; }
          const active = !document.hidden && rect.bottom > 0 && rect.top < window.innerHeight && rect.width > 0;
          if (!active) { previous = now; frame = requestAnimationFrame(draw); return; }
          if (active) elapsed += Math.min(now - previous, 50);
          previous = now;
          const progress = Math.min(elapsed / 1500, 1);
          const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
          const width = Math.max(1, Math.round(rect.width * dpr));
          const height = Math.max(1, Math.round(rect.height * dpr));
          if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
          gl.viewport(0, 0, width, height);
          const aspect = width / height;
          gl.uniform2f(crop, ...containPhotoScale(aspect, fromAspect));
          gl.uniform2f(nextCrop, ...containPhotoScale(aspect, toAspect));
          gl.uniform1f(progressUniform, smooth(progress));
          gl.activeTexture(gl.TEXTURE0);
          gl.bindTexture(gl.TEXTURE_2D, a);
          gl.activeTexture(gl.TEXTURE1);
          gl.bindTexture(gl.TEXTURE_2D, b);
          gl.drawArrays(gl.TRIANGLES, 0, 6);
          if (!revealed) { revealed = true; reveal(); }
          if (progress < 1) frame = requestAnimationFrame(draw);
          else {
            textures.splice(0).forEach(t => gl.deleteTexture(t));
            gl.activeTexture(gl.TEXTURE0);
            finish(true);
          }
        };
        frame = requestAnimationFrame(draw);
      });
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(frame);
      complete?.(false);
      textures.forEach(t => gl.deleteTexture(t));
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
    },
  };
}