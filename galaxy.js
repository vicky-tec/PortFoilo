/**
 * Galaxy - React Bits Component Engine (Vanilla JS & WebGL2)
 * Ported from React Bits: https://reactbits.dev
 * Author: David Haz (react-bits)
 */

(function (global) {
  'use strict';

  const MAX_LAYERS = 8;
  const MAX_COLORS = 4;
  const INTRO_SECONDS = 2.2;

  const VERTEX = `#version 300 es
in vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

  const FRAGMENT = `#version 300 es
precision highp float;
precision highp int;
uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uFocal;
uniform vec2 uRotation;
uniform float uGloss;
uniform float uDepth;
uniform float uDensity;
uniform float uHueShift;
uniform float uSpeed;
uniform vec2 uMouse;
uniform float uStarGlow;
uniform float uFlareGain;
uniform float uSquash;
uniform float uSaturation;
uniform float uMouseRepulsion;
uniform float uTwinkleIntensity;
uniform float uRotationAngle;
uniform float uRepulsionStrength;
uniform float uMouseActiveFactor;
uniform float uAutoCenterRepulsion;
uniform int uLayers;
uniform vec3 uColors[${MAX_COLORS}];
uniform int uColorCount;
uniform float uWarp;
uniform float uReveal;
uniform float uMode;
uniform vec3 uBackground;
uniform float uOpacity;
out vec4 outColor;

#define STAR_COLOR_CUTOFF 0.2
#define MAT45 mat2(0.7071, -0.7071, 0.7071, 0.7071)
#define PERIOD 3.0

float Hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float tri(float x) {
  return abs(fract(x) * 2.0 - 1.0);
}

float tris(float x) {
  float t = fract(x);
  return 1.0 - smoothstep(0.0, 1.0, abs(2.0 * t - 1.0));
}

float trisn(float x) {
  float t = fract(x);
  return 2.0 * (1.0 - smoothstep(0.0, 1.0, abs(2.0 * t - 1.0))) - 1.0;
}

vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

float Star(vec2 uv, float flare, vec2 radial, float invReach) {
#ifdef WARP
  float along = dot(uv, radial);
  float d = sqrt(max(dot(uv, uv) - uSquash * along * along, 0.0));
#else
  float d = length(uv);
#endif
  float m = uStarGlow / d;
  float rays = smoothstep(0.0, 1.0, 1.0 - abs(uv.x * uv.y * 1000.0));
  m += rays * flare * uFlareGain;
  uv *= MAT45;
  rays = smoothstep(0.0, 1.0, 1.0 - abs(uv.x * uv.y * 1000.0));
  m += rays * 0.3 * flare * uFlareGain;
  m *= smoothstep(1.0, 0.2, d * invReach);
#ifdef WARP
  m *= mix(1.0, smoothstep(1.0, 0.55, length(uv) * invReach), min(uWarp * 4.0, 1.0));
#endif
  return m;
}

vec3 StarLayer(vec2 uv, vec2 radial, vec2 repelAt, float pushCells, float spread) {
  vec3 col = vec3(0.0);
  vec2 gv = fract(uv) - 0.5;
  vec2 id = floor(uv);
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 offset = vec2(float(x), float(y));
      vec2 si = id + offset;
      float seed = Hash21(si);
      float size = fract(seed * 345.32);
      float glossLocal = tri(uGloss / (PERIOD * seed + 1.0));
      float flareSize = smoothstep(0.9, 1.0, size) * glossLocal;

#ifdef PALETTE
      float pick = Hash21(si + 7.0) * float(uColorCount);
      vec3 base = uColors[int(min(floor(pick), float(uColorCount - 1)))];
#else
      float red = smoothstep(STAR_COLOR_CUTOFF, 1.0, Hash21(si + 1.0)) + STAR_COLOR_CUTOFF;
      float blu = smoothstep(STAR_COLOR_CUTOFF, 1.0, Hash21(si + 3.0)) + STAR_COLOR_CUTOFF;
      float grn = min(red, blu) * seed;
      vec3 base = vec3(red, grn, blu);
      float hue = atan(base.g - base.r, base.b - base.r) / (2.0 * 3.14159) + 0.5;
      hue = fract(hue + uHueShift / 360.0);
      float sat = length(base - vec3(dot(base, vec3(0.299, 0.587, 0.114)))) * uSaturation;
      float val = max(max(base.r, base.g), base.b);
      base = hsv2rgb(vec3(hue, sat, val));
#endif

      vec2 pad = vec2(tris(seed * 34.0 + uTime * uSpeed / 10.0), tris(seed * 38.0 + uTime * uSpeed / 30.0)) - 0.5;
      vec2 shift = vec2(0.0);
      float invReach = 1.0;
#ifdef REPEL
      vec2 away = si + 0.5 + pad - repelAt;
      float dist = length(away);
      float q = dist * spread;
      float cells = pushCells * exp(-q * q);
      float moved = cells * inversesqrt(1.0 + cells * cells * 2.78);
      shift = away * (moved / max(dist, 0.0001));
      invReach = 1.0 / (1.0 - moved);
#endif
      float star = Star(gv - offset - pad - shift, flareSize, radial, invReach);
      float twinkle = trisn(uTime * uSpeed + seed * 6.2831) * 0.5 + 1.0;
      twinkle = mix(1.0, twinkle, uTwinkleIntensity);
      col += star * twinkle * size * base;
    }
  }
  return col;
}

void main() {
  vec2 focalPx = uFocal * uResolution;
  vec2 uv = (gl_FragCoord.xy - focalPx) / uResolution.y;
  vec2 mouseNorm = uMouse - vec2(0.5);

  vec2 repelAt = vec2(0.0);
  float strength = 0.0;
  float push = 0.0;
  if (uAutoCenterRepulsion > 0.0) {
    strength = uAutoCenterRepulsion;
    push = strength * 0.05;
  } else if (uMouseRepulsion > 0.5) {
    repelAt = (uMouse * uResolution - focalPx) / uResolution.y;
    strength = max(uRepulsionStrength, 0.0);
    push = strength * 0.05 * uMouseActiveFactor;
  } else {
    uv += mouseNorm * 0.1 * uMouseActiveFactor;
  }
  float radius = 0.16 + 0.04 * strength;

  vec2 radial = length(uv) > 0.0001 ? normalize(uv) : vec2(1.0, 0.0);
  float angle = uRotationAngle;
  uv = mat2(cos(angle), -sin(angle), sin(angle), cos(angle)) * uv;
  uv = mat2(uRotation.x, -uRotation.y, uRotation.y, uRotation.x) * uv;
  radial = mat2(cos(angle), -sin(angle), sin(angle), cos(angle)) * radial;
  radial = mat2(uRotation.x, -uRotation.y, uRotation.y, uRotation.x) * radial;
  repelAt = mat2(cos(angle), -sin(angle), sin(angle), cos(angle)) * repelAt;
  repelAt = mat2(uRotation.x, -uRotation.y, uRotation.y, uRotation.x) * repelAt;

  vec3 col = vec3(0.0);
  float layers = float(uLayers);
  for (int k = 0; k < ${MAX_LAYERS}; k++) {
    if (k >= uLayers) break;
    float i = float(k) / layers;
    float depth = fract(i + uDepth);
    float scale = mix(20.0 * uDensity, 0.5 * uDensity, depth);
    float fade = depth * smoothstep(1.0, 0.9, depth);
    vec2 offset = vec2(i * 453.32);
    col += StarLayer(uv * scale + offset, radial, repelAt * scale + offset, push * scale, 1.0 / (scale * radius)) * fade;
  }
  col *= uReveal;

  if (uMode > 1.5) {
    vec3 lit = col * smoothstep(0.0, 0.3, length(col));
    float energy = max(max(lit.r, lit.g), lit.b);
    vec3 tint = lit / max(energy, 0.0001);
    vec3 ink = tint * (0.16 / max(dot(tint, vec3(0.2126, 0.7152, 0.0722)), 0.16));
    float coverage = pow(min(energy * 1.3, 1.0), 1.3) * 0.92 * uOpacity;
    outColor = uMode > 2.5 ? vec4(ink * coverage, coverage) : vec4(mix(uBackground, ink, coverage), 1.0);
  } else if (uMode > 0.5) {
    float alpha = min(smoothstep(0.0, 0.3, length(col)), 1.0) * uOpacity;
    outColor = vec4(col * alpha, alpha);
  } else {
    outColor = vec4(mix(uBackground, col, uOpacity), 1.0);
  }
}`;

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const keyOf = (palette, repel, warp) => (palette ? 4 : 0) + (repel ? 2 : 0) + (warp ? 1 : 0);

  const start = (gl, palette, repel, warp) => {
    const defines = `${palette ? '#define PALETTE\n' : ''}${repel ? '#define REPEL\n' : ''}${warp ? '#define WARP\n' : ''}`;
    const program = gl.createProgram();
    const vertex = gl.createShader(gl.VERTEX_SHADER);
    const fragment = gl.createShader(gl.FRAGMENT_SHADER);
    if (!program || !vertex || !fragment) return null;
    gl.shaderSource(vertex, VERTEX);
    gl.shaderSource(fragment, FRAGMENT.replace('\n', `\n${defines}`));
    gl.compileShader(vertex);
    gl.compileShader(fragment);
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.bindAttribLocation(program, 0, 'aPosition');
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    return program;
  };

  const finish = (gl, program) => {
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
    const uniforms = {};
    const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < count; i++) {
      const info = gl.getActiveUniform(program, i);
      if (info) uniforms[info.name.replace('[0]', '')] = gl.getUniformLocation(program, info.name);
    }
    return { program, uniforms };
  };

  function createGalaxy(container, userOptions) {
    if (!container) return null;
    userOptions = userOptions || {};

    let canvas = container.querySelector('canvas.galaxy-canvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.className = 'galaxy-canvas';
      canvas.setAttribute('aria-hidden', 'true');
      container.appendChild(canvas);
    }

    const gl = canvas.getContext('webgl2', {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
      depth: false,
      stencil: false
    });

    if (!gl) {
      console.warn('WebGL2 not supported for Galaxy');
      return null;
    }

    const palette = Array.isArray(userOptions.starColors) ? userOptions.starColors.filter(Boolean).slice(0, MAX_COLORS) : [];
    const settings = {
      focal: Array.isArray(userOptions.focal) ? userOptions.focal : [0.5, 0.5],
      rotation: Array.isArray(userOptions.rotation) ? userOptions.rotation : [1, 0],
      starSpeed: userOptions.starSpeed ?? 0.5,
      density: Math.max(0.01, userOptions.density ?? 1),
      hueShift: userOptions.hueShift ?? 140,
      disableAnimation: userOptions.disableAnimation ?? false,
      speed: userOptions.speed ?? 1.0,
      mouseInteraction: userOptions.mouseInteraction ?? true,
      glowIntensity: Math.max(0, userOptions.glowIntensity ?? 0.3),
      saturation: Math.max(0, userOptions.saturation ?? 0.0),
      mouseRepulsion: userOptions.mouseRepulsion ?? true,
      repulsionStrength: userOptions.repulsionStrength ?? 2,
      twinkleIntensity: clamp(userOptions.twinkleIntensity ?? 0.3, 0, 1),
      rotationSpeed: userOptions.rotationSpeed ?? 0.1,
      autoCenterRepulsion: Math.max(0, userOptions.autoCenterRepulsion ?? 0),
      transparent: userOptions.transparent ?? true,
      lightMode: userOptions.lightMode ?? false,
      palette,
      starSize: Math.max(0, userOptions.starSize ?? 1),
      flareIntensity: Math.max(0, userOptions.flareIntensity ?? 1),
      layers: clamp(Math.round(userOptions.layers ?? 4), 2, MAX_LAYERS),
      reverse: userOptions.direction === 'backward',
      clickWarp: userOptions.clickWarp ?? true,
      intro: userOptions.intro ?? true,
      backgroundColor: userOptions.backgroundColor,
      opacity: clamp(userOptions.opacity ?? 1, 0, 1),
      dpr: userOptions.dpr
    };

    const parallel = gl.getExtension('KHR_parallel_shader_compile');
    const programs = new Map();
    const entry = (hasPalette, repel, warp) => {
      const key = keyOf(hasPalette, repel, warp);
      let found = programs.get(key);
      if (!found) {
        found = { program: start(gl, hasPalette, repel, warp), linked: null, done: false };
        programs.set(key, found);
      }
      return found;
    };

    const variant = (hasPalette, repel, warp, wait) => {
      const found = entry(hasPalette, repel, warp);
      if (!found.done && found.program) {
        if (!wait && parallel && !gl.getProgramParameter(found.program, parallel.COMPLETION_STATUS_KHR)) return null;
        found.linked = finish(gl, found.program);
        found.done = true;
      }
      return found.linked;
    };

    if (!variant(settings.palette.length > 0, false, false, true)) {
      programs.forEach(found => found.program && gl.deleteProgram(found.program));
      return null;
    }

    const buffer = gl.createBuffer();
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    const probe = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const cache = new Map();
    const parse = (value, fallback) => {
      if (!value) return fallback;
      const key = String(value);
      if (cache.has(key)) return cache.get(key);
      let rgb = fallback;
      if (probe) {
        probe.clearRect(0, 0, 1, 1);
        probe.fillStyle = '#000000';
        probe.fillStyle = key;
        probe.fillRect(0, 0, 1, 1);
        const data = probe.getImageData(0, 0, 1, 1).data;
        rgb = [data[0] / 255, data[1] / 255, data[2] / 255];
      }
      cache.set(key, rgb);
      return rgb;
    };
    const colors = new Float32Array(MAX_COLORS * 3);

    const pointer = { x: 0.5, y: 0.5, inside: false };
    const state = {
      time: 0,
      gloss: 0,
      depth: 0,
      angle: 0,
      mx: 0.5,
      my: 0.5,
      active: 0,
      boost: 0,
      reveal: settings.intro && !reduce ? 0 : 1
    };
    let raf = 0;
    let last = 0;
    let lastRender = 0;
    // Mobile gets a steady 30 FPS background; desktop keeps native rAF cadence.
    const frameInterval = window.innerWidth <= 768 ? 1000 / 30 : 0;
    let visible = true;

    const render = () => {
      settings.palette.forEach((value, index) => colors.set(parse(value, [1, 1, 1]), index * 3));
      const mode = settings.lightMode ? (settings.transparent ? 3 : 2) : settings.transparent ? 1 : 0;
      const background = parse(settings.backgroundColor, settings.lightMode ? [1, 1, 1] : [0, 0, 0]);
      const reveal = state.reveal;
      const hasPalette = settings.palette.length > 0;
      const repel = settings.autoCenterRepulsion > 0 || (settings.mouseRepulsion && settings.repulsionStrength > 0 && state.active > 0);
      const warp = state.boost > 0;
      const base = variant(hasPalette, false, false, true);
      if (!base) return;
      const program = (repel || warp ? variant(hasPalette, repel, warp, false) : null) ?? base;
      const u = program.uniforms;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.useProgram(program.program);
      gl.bindVertexArray(vao);
      gl.uniform1f(u.uTime, state.time);
      gl.uniform2f(u.uResolution, canvas.width, canvas.height);
      gl.uniform2f(u.uFocal, settings.focal[0], settings.focal[1]);
      gl.uniform2f(u.uRotation, settings.rotation[0], settings.rotation[1]);
      gl.uniform1f(u.uGloss, state.gloss);
      gl.uniform1f(u.uDepth, state.depth);
      gl.uniform1f(u.uDensity, settings.density);
      gl.uniform1f(u.uHueShift, settings.hueShift);
      gl.uniform1f(u.uSpeed, settings.speed);
      gl.uniform2f(u.uMouse, state.mx, state.my);
      const stretch = 1 + state.boost * 5;
      gl.uniform1f(u.uStarGlow, (0.05 * settings.glowIntensity * settings.starSize) / Math.pow(stretch, 0.6));
      gl.uniform1f(u.uFlareGain, settings.glowIntensity * settings.flareIntensity);
      gl.uniform1f(u.uSquash, 1 - 1 / (stretch * stretch));
      gl.uniform1f(u.uSaturation, settings.saturation);
      gl.uniform1f(u.uMouseRepulsion, settings.mouseRepulsion ? 1 : 0);
      gl.uniform1f(u.uTwinkleIntensity, settings.twinkleIntensity);
      gl.uniform1f(u.uRotationAngle, state.angle);
      gl.uniform1f(u.uRepulsionStrength, settings.repulsionStrength);
      gl.uniform1f(u.uMouseActiveFactor, state.active);
      gl.uniform1f(u.uAutoCenterRepulsion, settings.autoCenterRepulsion);
      gl.uniform1i(u.uLayers, settings.layers);
      gl.uniform3fv(u.uColors, colors);
      gl.uniform1i(u.uColorCount, settings.palette.length);
      gl.uniform1f(u.uWarp, state.boost);
      const fade = Math.min(1, reveal / 0.35);
      gl.uniform1f(u.uReveal, fade * fade * (3 - 2 * fade));
      gl.uniform1f(u.uMode, mode);
      gl.uniform3fv(u.uBackground, background);
      gl.uniform1f(u.uOpacity, settings.opacity);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const frame = now => {
      raf = 0;
      if (!visible || document.hidden) return;

      if (frameInterval > 0 && lastRender && now - lastRender < frameInterval) {
        raf = requestAnimationFrame(frame);
        return;
      }
      lastRender = now;

      const dt = last ? clamp((now - last) / 1000, 0.0005, 0.05) : 1 / 60;
      last = now;
      const motion = settings.disableAnimation || reduce ? 0 : 1;
      if (settings.intro && !reduce && state.reveal < 1) {
        state.reveal = Math.min(1, state.reveal + dt / INTRO_SECONDS);
        state.boost = Math.max(state.boost, Math.pow(1 - state.reveal, 2) * 1.4);
      } else if (!settings.intro || reduce) {
        state.reveal = 1;
      }
      const flight = (settings.starSpeed / 10) * (settings.reverse ? -1 : 1);
      state.time += dt * motion;
      state.gloss += dt * flight * motion;
      state.depth += dt * flight * settings.speed * motion * (1 + state.boost * 14);
      state.angle += dt * settings.rotationSpeed * motion;
      state.boost *= Math.exp(-dt * 1.3);
      if (state.boost < 0.001) state.boost = 0;

      const follow = 1 - Math.exp(-dt / 0.325);
      const engaged = settings.mouseInteraction && pointer.inside && !reduce;
      if (engaged) {
        state.mx += (pointer.x - state.mx) * follow;
        state.my += (pointer.y - state.my) * follow;
      }
      const target = engaged ? 1 : 0;
      state.active += (target - state.active) * follow;
      if (Math.abs(target - state.active) < 0.001) state.active = target;

      render();
      const busy = motion > 0 || state.boost > 0 || state.active !== target || state.reveal < 1;
      if (busy) raf = requestAnimationFrame(frame);
      else last = 0;
    };

    const wake = () => {
      if (!raf && visible && !document.hidden) raf = requestAnimationFrame(frame);
    };

    const resize = () => {
      const width = Math.max(1, container.clientWidth);
      const height = Math.max(1, container.clientHeight);
      const ratio = Math.min(settings.dpr || window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(width * ratio));
      canvas.height = Math.max(1, Math.round(height * ratio));
      render();
      wake();
    };

    const locate = event => {
      const rect = container.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      pointer.inside = x >= 0 && y >= 0 && x <= rect.width && y <= rect.height;
      pointer.x = x / Math.max(1, rect.width);
      pointer.y = 1 - y / Math.max(1, rect.height);
    };

    const onPointerMove = event => {
      locate(event);
      wake();
    };

    const onPointerDown = event => {
      locate(event);
      if (!pointer.inside || !settings.clickWarp || reduce) return;
      state.boost = Math.min(1.6, state.boost + 1);
      wake();
    };

    const onPointerUp = event => {
      if (event.pointerType !== 'mouse') pointer.inside = false;
    };

    const onPointerLeave = () => {
      pointer.inside = false;
    };

    const onVisibility = () => {
      last = 0;
      wake();
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    const intersection = new IntersectionObserver(entries => {
      visible = entries.some(entry => entry.isIntersecting);
      if (visible) {
        last = 0;
        wake();
      }
    });
    intersection.observe(container);
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    window.addEventListener('pointerup', onPointerUp, { passive: true });
    window.addEventListener('pointercancel', onPointerUp, { passive: true });
    document.documentElement.addEventListener('pointerleave', onPointerLeave);
    document.addEventListener('visibilitychange', onVisibility);
    resize();

    const repelling = settings.autoCenterRepulsion > 0 || (settings.mouseInteraction && settings.mouseRepulsion);
    const tinted = settings.palette.length > 0;
    if (settings.clickWarp || settings.intro) entry(tinted, false, true);
    if (repelling) entry(tinted, true, false);
    if (repelling && settings.clickWarp) entry(tinted, true, true);

    return {
      wake,
      destroy: () => {
        cancelAnimationFrame(raf);
        resizeObserver.disconnect();
        intersection.disconnect();
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerdown', onPointerDown);
        window.removeEventListener('pointerup', onPointerUp);
        window.removeEventListener('pointercancel', onPointerUp);
        document.documentElement.removeEventListener('pointerleave', onPointerLeave);
        document.removeEventListener('visibilitychange', onVisibility);
        programs.forEach(found => found.program && gl.deleteProgram(found.program));
        gl.deleteBuffer(buffer);
        gl.deleteVertexArray(vao);
        gl.getExtension('WEBGL_lose_context')?.loseContext();
      }
    };
  }

  function initGalaxy() {
    const heroGalaxy = document.getElementById('hero-galaxy-bg') || document.getElementById('about-galaxy-bg');
    if (heroGalaxy) {
      const compact = window.matchMedia('(max-width: 768px)').matches;

      createGalaxy(heroGalaxy, {
        density: compact ? 0.58 : 0.78,
        layers: compact ? 2 : 3,
        dpr: compact ? 1 : Math.min(window.devicePixelRatio || 1, 1.25),
        glowIntensity: 0.24,
        flareIntensity: 0.75,
        starSpeed: 0.38,
        mouseInteraction: !compact,
        mouseRepulsion: !compact,
        repulsionStrength: 1.5,
        clickWarp: false,
        intro: false,
        starColors: ['#1bc4f8', '#a855f7', '#38bdf8', '#ffffff'],
        transparent: true,
        opacity: 0.82
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGalaxy);
  } else {
    initGalaxy();
  }

  global.createGalaxy = createGalaxy;
})(window);
