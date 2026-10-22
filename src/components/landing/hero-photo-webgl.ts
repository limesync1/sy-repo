/** A small, on-demand WebGL renderer. Only one photograph is sampled at a time. */
export function createPhotoTransition(canvas: HTMLCanvasElement, shade: [number, number, number]) {
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
    varying vec2 uv; uniform sampler2D photo; uniform vec2 crop; uniform vec3 shade; uniform float dim;
    void main(){vec2 p=(uv-.5)*crop+.5; vec3 c=texture2D(photo,p).rgb;
      gl_FragColor=vec4(mix(c,shade,dim),1.);}`);
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
  const dim = gl.getUniformLocation(program, "dim");
  gl.uniform3fv(gl.getUniformLocation(program, "shade"), shade);
  gl.uniform1i(gl.getUniformLocation(program, "photo"), 0);
  let frame = 0;
  let disposed = false;
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
  const smooth = (x: number) => x * x * (3 - 2 * x);
  return {
    transition(from: HTMLImageElement, to: HTMLImageElement, reveal: () => void) {
      return new Promise<boolean>((resolve) => {
        complete = resolve;
        if (disposed || gl.isContextLost()) { resolve(false); return; }
        const a = texture(from), b = texture(to);
        let elapsed = 0, previous = performance.now();
        const draw = (now: number) => {
          if (disposed || gl.isContextLost()) { resolve(false); return; }
          const rect = canvas.getBoundingClientRect();
          const active = !document.hidden && rect.bottom > 0 && rect.top < window.innerHeight && rect.width > 0;
          if (active) elapsed += Math.min(now - previous, 50);
          previous = now;
          const progress = Math.min(elapsed / 1600, 1);
          const image = progress < .5 ? from : to;
          const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
          const width = Math.max(1, Math.round(rect.width * dpr));
          const height = Math.max(1, Math.round(rect.height * dpr));
          if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
          gl.viewport(0, 0, width, height);
          const aspect = width / height, imageAspect = image.naturalWidth / image.naturalHeight;
          gl.uniform2f(crop, Math.min(aspect / imageAspect, 1), Math.min(imageAspect / aspect, 1));
          gl.uniform1f(dim, smooth(progress < .5 ? progress * 2 : (1 - progress) * 2));
          gl.bindTexture(gl.TEXTURE_2D, progress < .5 ? a : b);
          gl.drawArrays(gl.TRIANGLES, 0, 6);
          if (elapsed === 0 || progress < .02) reveal();
          if (progress < 1) frame = requestAnimationFrame(draw);
          else {
            textures.splice(0).forEach(t => gl.deleteTexture(t));
            complete = undefined;
            resolve(true);
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