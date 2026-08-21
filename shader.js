/* ============================================================
   DOX MUSIC — Liquid Glass WebGL Shader
   Flowing organic pattern that reacts to playback state.
   Falls back to CSS orbs if WebGL unavailable.
   ============================================================ */
(function () {
  "use strict";

  const canvas = document.getElementById("shaderCanvas");
  if (!canvas) return;

  let gl = null;
  try {
    gl = canvas.getContext("webgl", { alpha: true, antialias: false, premultipliedAlpha: false })
      || canvas.getContext("experimental-webgl", { alpha: true });
  } catch (e) { /* fallback */ }
  if (!gl) {
    console.warn("[shader] WebGL unavailable, using CSS orbs only");
    return;
  }

  /* ---------- Vertex shader: full-screen quad ---------- */
  const VS = `
    attribute vec2 aPos;
    void main() {
      gl_Position = vec4(aPos, 0.0, 1.0);
    }
  `;

  /* ---------- Fragment shader: liquid glass / metaball field ----------
     - Multi-octave simplex-ish noise via hash
     - 3 colored blobs that swirl and mix
     - Subtle chromatic aberration on edges
     - Theme-aware (dark or light mode)
  ------------------------------------------------------------------ */
  const FS = `
    precision mediump float;
    uniform vec2 uRes;
    uniform float uTime;
    uniform float uPlaying;   // 0..1 smooth
    uniform float uTheme;     // 0=dark, 1=light
    uniform float uEnergy;    // 0..1 — track energy

    vec2 hash2(vec2 p) {
      p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
      return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
    }

    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(
        mix(dot(hash2(i + vec2(0.0, 0.0)), f - vec2(0.0, 0.0)),
            dot(hash2(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0)), u.x),
        mix(dot(hash2(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0)),
            dot(hash2(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0)), u.x),
        u.y
      );
    }

    float fbm(vec2 p) {
      float v = 0.0;
      float a = 0.5;
      for (int i = 0; i < 5; i++) {
        v += a * noise(p);
        p *= 2.0;
        a *= 0.5;
      }
      return v;
    }

    void main() {
      vec2 uv = gl_FragCoord.xy / uRes.xy;
      vec2 p = (uv - 0.5) * vec2(uRes.x / uRes.y, 1.0) * 2.0;

      float t = uTime * (0.12 + uPlaying * 0.25 + uEnergy * 0.1);

      // Three swirling flow centers
      vec2 c1 = vec2(sin(t * 0.7) * 1.2, cos(t * 0.5) * 0.9);
      vec2 c2 = vec2(cos(t * 0.6 + 2.0) * 1.1, sin(t * 0.9 + 1.0) * 1.0);
      vec2 c3 = vec2(sin(t * 0.4 + 4.0) * 0.9, cos(t * 0.7 + 3.0) * 1.2);

      // Distortion field
      vec2 q = p + 0.35 * vec2(
        fbm(p * 1.5 + t * 0.5),
        fbm(p * 1.5 - t * 0.4)
      );

      // Metaball-like fields
      float b1 = 1.0 / (1.0 + 30.0 * dot(q - c1, q - c1));
      float b2 = 1.0 / (1.0 + 25.0 * dot(q - c2, q - c2));
      float b3 = 1.0 / (1.0 + 28.0 * dot(q - c3, q - c3));
      float blob = b1 + b2 * 0.85 + b3 * 0.9;

      // Color palette (theme-aware)
      vec3 colViolet = vec3(0.65, 0.55, 0.98);
      vec3 colCyan   = vec3(0.13, 0.83, 0.93);
      vec3 colPink   = vec3(0.96, 0.45, 0.71);

      // Mix by blob intensities
      vec3 col = colViolet * b1 + colCyan * b2 + colPink * b3;

      // Add fine fbm texture
      float fbmTex = fbm(p * 2.0 + t * 0.2) * 0.15;
      col += fbmTex;

      // Strength by blob field
      col *= 0.25 + 0.65 * smoothstep(0.05, 1.5, blob);

      // Vignette
      float vig = 1.0 - dot(uv - 0.5, uv - 0.5) * 1.2;
      col *= clamp(vig, 0.3, 1.0);

      // Theme base
      vec3 baseDark = vec3(0.04, 0.04, 0.09);
      vec3 baseLight = vec3(0.93, 0.94, 0.98);
      vec3 base = mix(baseDark, baseLight, uTheme);

      // Final blend
      float alpha = clamp(0.35 + uPlaying * 0.2 + uEnergy * 0.1, 0.0, 0.9);
      vec3 finalCol = mix(base, col, alpha * smoothstep(0.0, 0.6, blob + 0.2));

      // Subtle film grain
      float grain = fract(sin(dot(uv, vec2(12.9898, 78.233)) + uTime * 0.5) * 43758.5453);
      finalCol += (grain - 0.5) * 0.015;

      gl_FragColor = vec4(finalCol, 1.0);
    }
  `;

  function compile(type, src) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      console.warn("[shader] compile error:", gl.getShaderInfoLog(sh));
      gl.deleteShader(sh);
      return null;
    }
    return sh;
  }

  const vs = compile(gl.VERTEX_SHADER, VS);
  const fs = compile(gl.FRAGMENT_SHADER, FS);
  if (!vs || !fs) return;

  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.warn("[shader] link error:", gl.getProgramInfoLog(prog));
    return;
  }
  gl.useProgram(prog);

  /* Full-screen quad */
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1, -1,  1, -1, -1,  1,
    -1,  1,  1, -1,  1,  1
  ]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(prog, "aPos");
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const uRes = gl.getUniformLocation(prog, "uRes");
  const uTime = gl.getUniformLocation(prog, "uTime");
  const uPlaying = gl.getUniformLocation(prog, "uPlaying");
  const uTheme = gl.getUniformLocation(prog, "uTheme");
  const uEnergy = gl.getUniformLocation(prog, "uEnergy");

  let playingTarget = 0;
  let playingSmooth = 0;
  let energy = 0.4;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.floor(window.innerWidth * dpr);
    const h = Math.floor(window.innerHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
  }
  window.addEventListener("resize", resize);
  resize();

  function getTheme() {
    return document.documentElement.getAttribute("data-theme") === "light" ? 1 : 0;
  }

  const start = performance.now();
  function frame() {
    const t = (performance.now() - start) / 1000;
    playingSmooth += (playingTarget - playingSmooth) * 0.05;

    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform1f(uTime, t);
    gl.uniform1f(uPlaying, playingSmooth);
    gl.uniform1f(uTheme, getTheme());
    gl.uniform1f(uEnergy, energy);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  /* Public API */
  window.DOX_SHADER = {
    setPlaying(v) { playingTarget = v ? 1 : 0; },
    setEnergy(v) { energy = Math.max(0, Math.min(1, v)); },
  };
})();
