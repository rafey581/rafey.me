// ═══════════════════════════════════════════════════════════
// rafey.me — WebGL world
// One continuous space; the camera flies down -Z as you scroll.
// Each <section> owns a set-piece: core → helix → lock → skill
// sphere → project carousel → wave terrain → globe.
// ═══════════════════════════════════════════════════════════
import * as THREE from '../vendor/three/build/three.module.min.js';
import { EffectComposer } from '../vendor/three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from '../vendor/three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from '../vendor/three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from '../vendor/three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from '../vendor/three/examples/jsm/postprocessing/OutputPass.js';

const GOLD = new THREE.Color('#e8b84b');
const TEAL = new THREE.Color('#2ffcb1');
const DEEP = new THREE.Color('#06141c');
const WHITE = new THREE.Color('#e8e4dc');
const TAU = Math.PI * 2;

const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.pow(1 - k, dt * 60));
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };

// Ashima 3D simplex noise (MIT)
const NOISE = /* glsl */`
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0); const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.0-g; vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857; vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z); vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0; vec4 s1=floor(b1)*2.0+1.0; vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0); m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}`;

// Shared soft round point sprite
const POINT_FRAG = /* glsl */`
varying vec3 vColor; varying float vAlpha;
void main(){
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.0, d);
  gl_FragColor = vec4(vColor, a * vAlpha);
}`;

// Fresnel "hologram" surface used by several props
function holoMaterial(color, opacity = 1) {
  return new THREE.ShaderMaterial({
    uniforms: { uColor: { value: color.clone() }, uTime: { value: 0 }, uOpacity: { value: opacity }, uBoost: { value: 0 } },
    vertexShader: /* glsl */`
      varying vec3 vN; varying vec3 vV; varying vec3 vP;
      void main(){
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal); vV = -mv.xyz; vP = position;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 uColor; uniform float uTime, uOpacity, uBoost;
      varying vec3 vN; varying vec3 vV; varying vec3 vP;
      void main(){
        float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.0);
        float scan = smoothstep(0.85, 1.0, sin(vP.y * 30.0 - uTime * 3.0) * 0.5 + 0.5);
        vec3 c = uColor * (0.15 + f * 1.4 + scan * 0.35 + uBoost);
        gl_FragColor = vec4(c, (0.18 + f * 0.82) * uOpacity);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
}

function pointsMaterial(extraUniforms, vertexShader) {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uPixel: { value: 1 }, ...extraUniforms },
    vertexShader, fragmentShader: POINT_FRAG,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
}

// ─────────────────────────────────────────────────────────
export async function createWorld({ canvas, sections, projects, skills, reducedMotion, onProgress }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', alpha: false });
  if (!renderer.capabilities.isWebGL2) throw new Error('WebGL2 unavailable');
  const isTouch = matchMedia('(pointer: coarse)').matches;
  let pixelRatio = Math.min(devicePixelRatio, isTouch ? 1.35 : 1.6);
  renderer.setPixelRatio(pixelRatio);
  // The composer's clear gets output-encoded once more, so pre-linearise #05070a
  renderer.setClearColor(new THREE.Color().setRGB(0.0015, 0.0021, 0.003, THREE.SRGBColorSpace), 1);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2('#05070a', 0.028);
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 200);
  camera.position.set(0, 0, 60); // starts far away → fly-in after boot

  const timeScale = reducedMotion ? 0.25 : 1;
  const clock = new THREE.Clock();
  const updaters = [];
  const pickables = [];

  // ── Loading ───────────────────────────────────────────
  const manager = new THREE.LoadingManager();
  manager.onProgress = (_u, loaded, total) => onProgress && onProgress(loaded / total);
  const loaded = new Promise(res => { manager.onLoad = res; manager.onError = () => {}; });
  const texLoader = new THREE.TextureLoader(manager);

  // ══ 0. STARFIELD + WARP STREAKS (global) ══════════════
  {
    const N = isTouch ? 4000 : 8000;
    const pos = new Float32Array(N * 3), col = new Float32Array(N * 3), size = new Float32Array(N), rnd = new Float32Array(N);
    const palette = [GOLD, TEAL, WHITE, WHITE, WHITE];
    for (let i = 0; i < N; i++) {
      const r = 6 + Math.pow(Math.random(), 0.7) * 60, a = Math.random() * TAU;
      pos[i * 3] = Math.cos(a) * r; pos[i * 3 + 1] = Math.sin(a) * r * 0.7; pos[i * 3 + 2] = 40 - Math.random() * 420;
      const c = palette[(Math.random() * palette.length) | 0];
      col.set([c.r, c.g, c.b], i * 3);
      size[i] = 0.4 + Math.random() * 1.6; rnd[i] = Math.random();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    g.setAttribute('aRand', new THREE.BufferAttribute(rnd, 1));
    const m = pointsMaterial({}, /* glsl */`
      attribute vec3 aColor; attribute float aSize; attribute float aRand;
      uniform float uTime, uPixel; varying vec3 vColor; varying float vAlpha;
      void main(){
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = min(aSize * uPixel * (70.0 / -mv.z), 28.0);
        float tw = 0.55 + 0.45 * sin(uTime * (1.0 + aRand * 3.0) + aRand * 40.0);
        vAlpha = tw * smoothstep(110.0, 15.0, -mv.z) * smoothstep(0.2, 3.0, -mv.z);
        vColor = aColor * 1.2; gl_Position = projectionMatrix * mv;
      }`);
    const stars = new THREE.Points(g, m);
    stars.frustumCulled = false;
    scene.add(stars);
    updaters.push(t => { m.uniforms.uTime.value = t; });

    // Warp streaks: line segments that stretch with camera speed
    const S = 700, lp = new Float32Array(S * 6), le = new Float32Array(S * 2), lc = new Float32Array(S * 6);
    for (let i = 0; i < S; i++) {
      const r = 3 + Math.random() * 26, a = Math.random() * TAU, z = 40 - Math.random() * 420;
      const x = Math.cos(a) * r, y = Math.sin(a) * r * 0.75;
      lp.set([x, y, z, x, y, z], i * 6); le.set([0, 1], i * 2);
      const c = Math.random() > 0.5 ? GOLD : TEAL;
      lc.set([c.r, c.g, c.b, c.r, c.g, c.b], i * 6);
    }
    const lg = new THREE.BufferGeometry();
    lg.setAttribute('position', new THREE.BufferAttribute(lp, 3));
    lg.setAttribute('aEnd', new THREE.BufferAttribute(le, 1));
    lg.setAttribute('aColor', new THREE.BufferAttribute(lc, 3));
    const lm = new THREE.ShaderMaterial({
      uniforms: { uStretch: { value: 0 } },
      vertexShader: /* glsl */`
        attribute float aEnd; attribute vec3 aColor; uniform float uStretch; varying float vA; varying vec3 vC;
        void main(){
          vec3 p = position; p.z += aEnd * uStretch * 9.0;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          vA = (1.0 - aEnd) * uStretch * smoothstep(80.0, 6.0, -mv.z); vC = aColor;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `varying float vA; varying vec3 vC; void main(){ gl_FragColor = vec4(vC * 1.5, vA); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const streaks = new THREE.LineSegments(lg, lm);
    streaks.frustumCulled = false;
    scene.add(streaks);
    updaters.push((t, s) => { lm.uniforms.uStretch.value = s.warp; });
  }

  // ══ 1. HERO — the reactive core ═══════════════════════
  const core = new THREE.Group();
  scene.add(core);
  const coreMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 }, uHover: { value: 0 }, uPulse: { value: 0 },
      uA: { value: DEEP }, uB: { value: TEAL }, uC: { value: GOLD },
    },
    vertexShader: NOISE + /* glsl */`
      uniform float uTime, uHover, uPulse;
      varying vec3 vMv; varying float vNoise; varying vec3 vPos;
      void main(){
        vec3 p = position;
        float n  = snoise(p * 0.85 + vec3(uTime * 0.22));
        float n2 = snoise(p * 2.6 - vec3(uTime * 0.45));
        float ripple = uPulse * sin(length(p.xy) * 7.0 - uTime * 18.0) * 0.32;
        float d = n * (0.26 + uHover * 0.3) + n2 * (0.05 + uHover * 0.05) + ripple;
        vNoise = d; p += normal * d; vPos = p;
        vec4 mv = modelViewMatrix * vec4(p, 1.0); vMv = mv.xyz;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      uniform float uTime, uPulse; uniform vec3 uA, uB, uC;
      varying vec3 vMv; varying float vNoise; varying vec3 vPos;
      void main(){
        vec3 n = normalize(cross(dFdx(vMv), dFdy(vMv)));
        float f = pow(1.0 - abs(dot(n, normalize(-vMv))), 2.4);
        vec3 col = mix(uA, uB * 0.55, smoothstep(-0.25, 0.45, vNoise));
        col = mix(col, uC, f);
        float bands = smoothstep(0.94, 1.0, sin(vPos.y * 26.0 - uTime * 2.4) * 0.5 + 0.5);
        col += uB * bands * 0.35;
        col *= 0.55 + f * 1.9 + uPulse * 1.2;
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const coreMesh = new THREE.Mesh(new THREE.IcosahedronGeometry(1.55, isTouch ? 48 : 80), coreMat);
  coreMesh.userData.kind = 'core';
  core.add(coreMesh);
  pickables.push(coreMesh);

  const shell = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(2.35, 1)),
    new THREE.LineBasicMaterial({ color: GOLD, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false }));
  core.add(shell);

  const rings = [];
  [[2.9, TEAL, 0.9, 0.2], [3.4, GOLD, -0.5, 1.1], [4.0, TEAL, 1.4, -0.6]].forEach(([r, c, rx, ry], i) => {
    const ring = new THREE.Group();
    const torus = new THREE.Mesh(new THREE.TorusGeometry(r, 0.008, 6, 200),
      new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
    const bead = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 12), new THREE.MeshBasicMaterial({ color: c.clone().multiplyScalar(2.2) }));
    bead.position.x = r;
    ring.add(torus, bead);
    ring.rotation.set(rx, ry, 0);
    ring.userData = { speed: (0.25 + i * 0.12) * (i % 2 ? -1 : 1), bead };
    core.add(ring); rings.push(ring);
  });

  // orbiting data swarm
  {
    const N = isTouch ? 1500 : 3000;
    const a = new Float32Array(N * 3), rnd = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) { rnd.set([Math.random(), Math.random(), Math.random()], i * 3); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(a, 3));
    g.setAttribute('aRnd', new THREE.BufferAttribute(rnd, 3));
    const m = pointsMaterial({ uPulse: { value: 0 }, uGold: { value: GOLD }, uTeal: { value: TEAL } }, /* glsl */`
      attribute vec3 aRnd; uniform float uTime, uPixel, uPulse; uniform vec3 uGold, uTeal;
      varying vec3 vColor; varying float vAlpha;
      void main(){
        float r = 2.2 + aRnd.x * 2.8 + uPulse * aRnd.y * 3.0;
        float th = aRnd.y * 6.2831 + uTime * (0.08 + aRnd.z * 0.25);
        float ph = acos(aRnd.z * 2.0 - 1.0) + sin(uTime * 0.3 + aRnd.x * 6.0) * 0.2;
        vec3 p = vec3(sin(ph) * cos(th), cos(ph) * 0.9, sin(ph) * sin(th)) * r;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = min((0.6 + aRnd.x * 1.6) * uPixel * (30.0 / -mv.z), 18.0);
        vColor = mix(uTeal, uGold, step(0.6, aRnd.z)) * 1.4;
        vAlpha = 0.35 + 0.65 * sin(uTime * 2.0 + aRnd.y * 50.0) * 0.5 + 0.3;
        gl_Position = projectionMatrix * mv;
      }`);
    const swarm = new THREE.Points(g, m);
    swarm.frustumCulled = false;
    core.add(swarm);
    updaters.push((t, s) => { m.uniforms.uTime.value = t; m.uniforms.uPulse.value = s.pulse; });
  }

  // ══ 2. ABOUT — data double-helix ══════════════════════
  const helix = new THREE.Group();
  scene.add(helix);
  {
    const N = 260, pts = [], cols = [], rungs = [];
    for (let i = 0; i < N; i++) {
      const t = i / N, y = (t - 0.5) * 18, a = t * TAU * 4;
      for (let s = 0; s < 2; s++) {
        const aa = a + s * Math.PI;
        pts.push(Math.cos(aa) * 1.7, y, Math.sin(aa) * 1.7);
        const c = s ? GOLD : TEAL; cols.push(c.r, c.g, c.b);
      }
      if (i % 5 === 0) rungs.push(Math.cos(a) * 1.7, y, Math.sin(a) * 1.7, Math.cos(a + Math.PI) * 1.7, y, Math.sin(a + Math.PI) * 1.7);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    g.setAttribute('aColor', new THREE.Float32BufferAttribute(cols, 3));
    const m = pointsMaterial({}, /* glsl */`
      attribute vec3 aColor; uniform float uTime, uPixel; varying vec3 vColor; varying float vAlpha;
      void main(){
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        float wave = 0.6 + 0.4 * sin(position.y * 1.4 - uTime * 3.0);
        gl_PointSize = min(uPixel * (2.0 + wave * 2.5) * (30.0 / -mv.z), 24.0);
        vColor = aColor * (0.8 + wave); vAlpha = 0.9;
        gl_Position = projectionMatrix * mv;
      }`);
    helix.add(new THREE.Points(g, m));
    const rg = new THREE.BufferGeometry();
    rg.setAttribute('position', new THREE.Float32BufferAttribute(rungs, 3));
    helix.add(new THREE.LineSegments(rg, new THREE.LineBasicMaterial({ color: WHITE, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false })));
    // binary glyph sprites drifting around the helix
    const glyph = (txt, color) => {
      const c = document.createElement('canvas'); c.width = c.height = 64;
      const x = c.getContext('2d'); x.font = '500 44px "IBM Plex Mono", monospace'; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillStyle = color; x.fillText(txt, 32, 34);
      const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; return tx;
    };
    const t0 = glyph('0', '#2ffcb1'), t1 = glyph('1', '#e8b84b');
    for (let i = 0; i < 60; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: i % 2 ? t0 : t1, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false }));
      const a = Math.random() * TAU, r = 2.6 + Math.random() * 2.5;
      s.position.set(Math.cos(a) * r, (Math.random() - 0.5) * 16, Math.sin(a) * r);
      s.scale.setScalar(0.35 + Math.random() * 0.3);
      s.userData.v = 0.3 + Math.random() * 0.8;
      helix.add(s);
    }
    updaters.push((t, s, dt) => {
      m.uniforms.uTime.value = t;
      helix.rotation.y = t * 0.35;
      helix.children.forEach(ch => { if (ch.isSprite) { ch.position.y += ch.userData.v * dt; if (ch.position.y > 8) ch.position.y = -8; } });
    });
  }

  // ══ 3. CERTS — the vault lock ═════════════════════════
  const lock = new THREE.Group();
  scene.add(lock);
  const lockParts = {};
  {
    const bodyMat = holoMaterial(GOLD, 0.9);
    const bodyGeo = new THREE.BoxGeometry(2.4, 2, 0.8, 1, 1, 1);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(bodyGeo), new THREE.LineBasicMaterial({ color: GOLD.clone().multiplyScalar(1.6) }));
    const shackle = new THREE.Group();
    const sMat = holoMaterial(TEAL, 1);
    const arc = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.13, 20, 60, Math.PI), sMat);
    arc.position.y = 0.6;
    const legGeo = new THREE.CylinderGeometry(0.13, 0.13, 0.9, 16);
    const l1 = new THREE.Mesh(legGeo, sMat), l2 = new THREE.Mesh(legGeo, sMat);
    l1.position.set(-0.75, 0.15, 0); l2.position.set(0.75, 0.15, 0);
    shackle.add(arc, l1, l2);
    shackle.position.y = 1.0;
    const keyMat = new THREE.MeshBasicMaterial({ color: TEAL.clone().multiplyScalar(2) });
    const key = new THREE.Group();
    const hole = new THREE.Mesh(new THREE.CircleGeometry(0.17, 32), keyMat);
    const slot = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.42), keyMat);
    hole.position.y = 0.1; slot.position.y = -0.15;
    key.add(hole, slot); key.position.z = 0.41;
    const dome = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(3.4, 1)),
      new THREE.LineBasicMaterial({ color: TEAL, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false }));
    const domeIn = new THREE.Mesh(new THREE.IcosahedronGeometry(3.38, 1), holoMaterial(TEAL, 0.12));
    lock.add(body, edges, shackle, key, dome, domeIn);
    Object.assign(lockParts, { shackle, keyMat, bodyMat, sMat, dome, domeIn });
    updaters.push((t, s) => {
      const open = smooth(0.25, 0.75, 0.5 + 0.5 * Math.sin(t * 1.3)) * s.focus.certifications;
      shackle.position.y = 1.0 + open * 0.55;
      shackle.rotation.y = open * 0.9;
      keyMat.color.copy(open > 0.5 ? GOLD : TEAL).multiplyScalar(1.5 + open * 2);
      bodyMat.uniforms.uTime.value = sMat.uniforms.uTime.value = t;
      bodyMat.uniforms.uBoost.value = open * 0.4;
      dome.rotation.y = domeIn.rotation.y = t * 0.15;
      dome.rotation.x = Math.sin(t * 0.3) * 0.2;
      domeIn.material.uniforms.uTime.value = t;
      lock.rotation.y = Math.sin(t * 0.5) * 0.45 + s.mouse.x * 0.3;
      lock.rotation.x = s.mouse.y * -0.2;
      lock.position.y = lockParts.baseY + Math.sin(t * 0.9) * 0.15;
    });
  }

  // ══ 4. SKILLS — interactive tag sphere ════════════════
  const sphere = new THREE.Group();
  scene.add(sphere);
  const skillSprites = [];
  const spin = { vx: 0, vy: 0.003, drag: false };
  {
    const groupColor = { web: '#e8e4dc', back: '#e8b84b', sec: '#2ffcb1' };
    const R = 3.6, n = skills.length;
    skills.forEach((sk, i) => {
      const c = document.createElement('canvas'); c.width = 512; c.height = 128;
      const x = c.getContext('2d');
      // shrink long labels so they always fit the sprite
      let fs = 58; x.font = `700 ${fs}px Syne, sans-serif`;
      while (x.measureText(sk.name).width > 480 && fs > 26) { fs -= 2; x.font = `700 ${fs}px Syne, sans-serif`; }
      x.textAlign = 'center'; x.textBaseline = 'middle';
      x.shadowColor = groupColor[sk.group]; x.shadowBlur = 18;
      x.fillStyle = groupColor[sk.group]; x.fillText(sk.name, 256, 66);
      const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
      const y = 1 - (i / (n - 1)) * 2, r = Math.sqrt(1 - y * y), th = i * Math.PI * (3 - Math.sqrt(5));
      sp.position.set(Math.cos(th) * r * R, y * R, Math.sin(th) * r * R);
      sp.scale.set(2.2, 0.55, 1);
      sp.userData = { kind: 'skill', index: i, base: 1 };
      sphere.add(sp); skillSprites.push(sp); pickables.push(sp);
    });
    const wire = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(R * 0.82, 2)),
      new THREE.LineBasicMaterial({ color: TEAL, transparent: true, opacity: 0.09, blending: THREE.AdditiveBlending, depthWrite: false }));
    const nucleus = new THREE.Mesh(new THREE.IcosahedronGeometry(0.7, 0), holoMaterial(GOLD, 1));
    sphere.add(wire, nucleus);
    // lines from nucleus to every skill
    const lp = [];
    skillSprites.forEach(s => lp.push(0, 0, 0, s.position.x, s.position.y, s.position.z));
    const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(lp, 3));
    sphere.add(new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: GOLD, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false })));
    const tmp = new THREE.Vector3(), camDir = new THREE.Vector3();
    updaters.push((t, s, dt) => {
      if (!spin.drag) { spin.vy = damp(spin.vy, 0.003 + s.mouse.x * 0.006, 0.02, dt); spin.vx = damp(spin.vx, s.mouse.y * 0.004, 0.02, dt); }
      const f60 = dt * 60;
      sphere.rotation.y += spin.vy * f60; sphere.rotation.x = clamp(sphere.rotation.x + spin.vx * f60, -0.8, 0.8);
      nucleus.rotation.x = t * 0.7; nucleus.rotation.y = t; nucleus.material.uniforms.uTime.value = t;
      camera.getWorldDirection(camDir);
      skillSprites.forEach(sp => {
        sp.getWorldPosition(tmp).sub(sphere.position).normalize();
        const facing = -tmp.dot(camDir); // 1 = front
        sp.material.opacity = 0.18 + 0.82 * smooth(-0.6, 0.8, facing);
        const k = sp.userData.base * (0.8 + 0.25 * smooth(-1, 1, facing));
        sp.scale.set(2.2 * k, 0.55 * k, 1);
      });
    });
  }

  // ══ 5. PROJECTS — curved shader carousel ══════════════
  const carousel = new THREE.Group();
  scene.add(carousel);
  const cards = [];
  const CR = 9.4; // ring radius — sized for 9 cards
  const step = TAU / projects.length;
  {
    const geo = new THREE.PlaneGeometry(4.4, 2.75, 40, 24);
    projects.forEach((p, i) => {
      const tex = p.tex.startsWith('/') ? texLoader.load(p.tex) : proceduralTexture(p.tex);
      tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
      const mat = new THREE.ShaderMaterial({
        uniforms: {
          uTex: { value: tex }, uTime: { value: 0 }, uActive: { value: 0 }, uHover: { value: 0 },
          uMouse: { value: new THREE.Vector2(0.5, 0.5) }, uVel: { value: 0 }, uGold: { value: GOLD }, uTeal: { value: TEAL },
        },
        vertexShader: /* glsl */`
          uniform float uTime, uHover, uVel, uActive; uniform vec2 uMouse; varying vec2 vUv; varying float vWave;
          void main(){
            vUv = uv; vec3 p = position;
            p.z -= sin(uv.x * 3.14159) * (0.35 + uVel * 2.0);
            float d = distance(uv, uMouse);
            float w = sin(d * 28.0 - uTime * 7.0) * exp(-d * 4.0) * 0.12 * uHover;
            p.z += w; vWave = w;
            p.y += sin(uv.x * 6.0 + uTime) * 0.03 * (1.0 - uActive);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
          }`,
        fragmentShader: /* glsl */`
          uniform sampler2D uTex; uniform float uTime, uActive, uHover, uVel; uniform vec3 uGold, uTeal;
          varying vec2 vUv; varying float vWave;
          void main(){
            vec2 uv = vUv; if (!gl_FrontFacing) uv.x = 1.0 - uv.x;
            float shift = 0.003 + uVel * 0.04 + uHover * 0.004 + abs(vWave) * 0.08;
            vec3 c = vec3(texture2D(uTex, uv + vec2(shift, 0.0)).r, texture2D(uTex, uv).g, texture2D(uTex, uv - vec2(shift, 0.0)).b);
            float lum = dot(c, vec3(0.299, 0.587, 0.114));
            vec3 duo = mix(vec3(0.02, 0.05, 0.07), uTeal, lum) * 0.55;
            c = mix(duo, c, uActive * 0.85 + uHover * 0.15) * (0.32 + uActive * 0.36);
            c = c / (1.0 + c * 0.6); // soft highlight roll-off so white UIs don't bloom out
            float scan = sin(uv.y * 380.0 + uTime * 4.0) * 0.04 * (1.0 - uActive);
            c += scan;
            vec2 e = min(uv, 1.0 - uv); float edge = min(e.x * 1.6, e.y);
            float border = smoothstep(0.012, 0.0, edge);
            float sweep = smoothstep(0.03, 0.0, abs(uv.x + uv.y * 0.3 - mod(uTime * 0.35, 2.0) + 0.3)) * uActive;
            c += mix(uTeal, uGold, uActive) * border * (0.6 + uActive * 1.2) + sweep * 0.25;
            if (!gl_FrontFacing) c *= 0.25;
            gl_FragColor = vec4(c, 1.0);
          }`,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(geo, mat);
      const a = i * step;
      mesh.position.set(Math.sin(a) * CR, 0, Math.cos(a) * CR);
      mesh.rotation.y = a;
      mesh.userData = { kind: 'card', index: i, url: p.url };
      carousel.add(mesh); cards.push(mesh); pickables.push(mesh);
    });
    // floor reflection ring
    const ring = new THREE.Mesh(new THREE.RingGeometry(CR - 0.02, CR + 0.02, 160), new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: 0.4, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = -1.75;
    const ring2 = ring.clone(); ring2.scale.setScalar(0.7); ring2.material = ring.material.clone(); ring2.material.color = TEAL; ring2.material.opacity = 0.2;
    carousel.add(ring, ring2);
  }

  // ══ 6. SERVICES — wave terrain ════════════════════════
  const terrain = new THREE.Group();
  scene.add(terrain);
  {
    const seg = isTouch ? 110 : 170;
    const g = new THREE.PlaneGeometry(90, 90, seg, seg);
    g.rotateX(-Math.PI / 2);
    const m = pointsMaterial({ uGold: { value: GOLD }, uTeal: { value: TEAL }, uMouse: { value: new THREE.Vector2() } }, NOISE + /* glsl */`
      uniform float uTime, uPixel; uniform vec3 uGold, uTeal; uniform vec2 uMouse;
      varying vec3 vColor; varying float vAlpha;
      void main(){
        vec3 p = position;
        float d = length(p.xz);
        float h = snoise(vec3(p.xz * 0.06, uTime * 0.15)) * 2.2 + sin(d * 0.6 - uTime * 1.6) * 0.45;
        float md = length(p.xz - uMouse * vec2(18.0, -12.0));
        h += exp(-md * 0.25) * 1.6 * sin(uTime * 3.0 - md);
        p.y += h;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = min(uPixel * 2.2 * (22.0 / -mv.z), 10.0);
        vColor = mix(uTeal, uGold, smoothstep(-1.0, 2.0, h)) * (0.6 + smoothstep(0.5, 2.5, h));
        vAlpha = smoothstep(60.0, 8.0, -mv.z) * smoothstep(45.0, 20.0, d);
        gl_Position = projectionMatrix * mv;
      }`);
    const pts = new THREE.Points(g, m);
    terrain.add(pts);
    updaters.push((t, s) => { m.uniforms.uTime.value = t; m.uniforms.uMouse.value.set(s.mouse.x, s.mouse.y); });
  }

  // ══ 7. CONTACT — dotted globe with live arcs ══════════
  const globe = new THREE.Group();
  scene.add(globe);
  {
    const R = 3;
    const N = isTouch ? 3500 : 6000;
    const p = new Float32Array(N * 3), rnd = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y), th = i * Math.PI * (3 - Math.sqrt(5));
      p.set([Math.cos(th) * r * R, y * R, Math.sin(th) * r * R], i * 3); rnd[i] = Math.random();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    g.setAttribute('aRand', new THREE.BufferAttribute(rnd, 1));
    const m = pointsMaterial({ uTeal: { value: TEAL } }, NOISE + /* glsl */`
      attribute float aRand; uniform float uTime, uPixel; uniform vec3 uTeal; varying vec3 vColor; varying float vAlpha;
      void main(){
        float land = smoothstep(0.05, 0.25, snoise(position * 0.55 + 3.0));
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vec3 n = normalize(normalMatrix * position);
        float facing = smoothstep(-0.2, 0.6, dot(n, normalize(-mv.xyz)));
        gl_PointSize = min(uPixel * (1.0 + land * 1.6) * (22.0 / -mv.z), 10.0);
        vColor = uTeal * (0.35 + land * 1.1 + 0.3 * sin(uTime * 2.0 + aRand * 30.0));
        vAlpha = (0.15 + land * 0.85) * (0.12 + facing);
        gl_Position = projectionMatrix * mv;
      }`);
    globe.add(new THREE.Points(g, m));
    const atmo = new THREE.Mesh(new THREE.SphereGeometry(R * 1.12, 48, 48), new THREE.ShaderMaterial({
      uniforms: { uC: { value: TEAL } },
      vertexShader: `varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix*vec4(position,1.); vN = normalize(normalMatrix*normal); vV = -mv.xyz; gl_Position = projectionMatrix*mv; }`,
      fragmentShader: `uniform vec3 uC; varying vec3 vN; varying vec3 vV; void main(){ float f = pow(1. - abs(dot(normalize(vN), normalize(vV))), 3.); gl_FragColor = vec4(uC, f * 0.6); }`,
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.BackSide,
    }));
    globe.add(atmo);

    const ll = (lat, lon, r = R) => {
      const ph = (90 - lat) * Math.PI / 180, th = (lon + 180) * Math.PI / 180;
      return new THREE.Vector3(-r * Math.sin(ph) * Math.cos(th), r * Math.cos(ph), r * Math.sin(ph) * Math.sin(th));
    };
    const home = ll(30.67, 73.11); // Sahiwal
    const marker = new THREE.Group();
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 16), new THREE.MeshBasicMaterial({ color: GOLD.clone().multiplyScalar(2.5) }));
    const pulse = new THREE.Mesh(new THREE.RingGeometry(0.1, 0.13, 40), new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 1.4, 6), new THREE.MeshBasicMaterial({ color: GOLD.clone().multiplyScalar(2) }));
    beam.position.y = 0.7;
    marker.add(dot, pulse, beam);
    marker.position.copy(home);
    marker.lookAt(home.clone().multiplyScalar(2));
    pulse.lookAt(home.clone().multiplyScalar(3)); // ring faces outward
    beam.rotation.x = Math.PI / 2; beam.position.set(0, 0, 0.7);
    globe.add(marker);

    const cities = [[51.5, -0.12], [40.7, -74], [25.2, 55.3], [35.7, 139.7], [-33.9, 151.2], [37.77, -122.4], [1.35, 103.8], [52.5, 13.4], [-23.5, -46.6], [55.75, 37.6]];
    const arcMats = [];
    cities.forEach(([la, lo], i) => {
      const end = ll(la, lo);
      const dist = home.distanceTo(end);
      const mid1 = home.clone().lerp(end, 0.25).normalize().multiplyScalar(R + dist * 0.35);
      const mid2 = home.clone().lerp(end, 0.75).normalize().multiplyScalar(R + dist * 0.35);
      const curve = new THREE.CubicBezierCurve3(home, mid1, mid2, end);
      const mat = new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uOff: { value: i / cities.length }, uA: { value: GOLD }, uB: { value: TEAL } },
        vertexShader: `varying float vX; void main(){ vX = uv.x; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
        fragmentShader: /* glsl */`
          uniform float uTime, uOff; uniform vec3 uA, uB; varying float vX;
          void main(){
            float head = fract(uTime * 0.28 + uOff) * 1.6 - 0.3;
            float trail = smoothstep(head - 0.3, head, vX) * step(vX, head);
            vec3 c = mix(uA, uB, vX) * (0.3 + trail * 2.2);
            gl_FragColor = vec4(c, 0.12 + trail * 0.88);
          }`,
        transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
      });
      arcMats.push(mat);
      globe.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 64, 0.012, 6), mat));
      const cdot = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), new THREE.MeshBasicMaterial({ color: TEAL.clone().multiplyScalar(2) }));
      cdot.position.copy(end); globe.add(cdot);
    });
    const faceY = -Math.atan2(home.x, home.z);
    updaters.push((t, s) => {
      m.uniforms.uTime.value = t;
      arcMats.forEach(a => { a.uniforms.uTime.value = t; });
      const k = 1 + ((t * 1.2) % 1) * 2.5;
      pulse.scale.setScalar(k); pulse.material.opacity = 1 - ((t * 1.2) % 1);
      globe.rotation.y = faceY + 0.5 + Math.sin(t * 0.18) * 0.6 + s.mouse.x * 0.4;
      globe.rotation.x = 0.35 + s.mouse.y * -0.15;
    });
  }

  // ── Layout: positions per breakpoint ──────────────────
  const objects = [core, helix, lock, sphere, carousel, terrain, globe];
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const states = {};
  function layout(w, h) {
    const aspect = w / h, mobile = aspect < 0.9;
    const sx = mobile ? 0 : 1;
    camera.fov = mobile ? 62 : 50;
    camera.aspect = aspect; camera.updateProjectionMatrix();

    core.position.set(3.4 * sx, mobile ? 2.4 : 0, mobile ? -4 : 0);
    objects.forEach(o => o.scale.setScalar(1));
    core.scale.setScalar(mobile ? 0.72 : 0.86);
    helix.position.set(mobile ? 2.6 : 5.2, 0, -50);
    lock.position.set(5 * sx, mobile ? 3 : 1.2, mobile ? -108 : -100);
    lockParts.baseY = lock.position.y;
    sphere.position.set(4.6 * sx, 0, mobile ? -156 : -150);
    sphere.scale.setScalar(mobile ? 0.8 : 1);
    carousel.position.set(mobile ? 0 : 2.4, mobile ? 1.3 : 0.6, -215);
    carousel.scale.setScalar(mobile ? 0.62 : 1);
    terrain.position.set(0, -5, -280);
    globe.position.set(4.8 * sx, mobile ? 2.2 : 0, mobile ? -340 : -330);
    objects.forEach(o => { o.userData.baseScale = o.scale.x; o.scale.setScalar(1e-3); });

    const fz = mobile ? 4 : 0;
    states.hero = { cam: V(0, 0, 9 + fz), look: V(0, 0, 0) };
    states.about = { cam: V(0, 0, -38 + fz), look: V(0, 0, -50) };
    states.certifications = { cam: V(0, 0, -88 + fz), look: V(0, 0, -100) };
    states.skills = { cam: V(0, 0, -138 + fz), look: V(0, 0, -150) };
    states.projects = { cam: V(0, 0.4, -215 + CR * carousel.userData.baseScale + (mobile ? 9 : 9.5)), look: V(0, mobile ? 0.6 : 0.2, -215) };
    states.services = { cam: V(0, 1.5, -262), look: V(0, -2.5, -282) };
    states.faq = { cam: V(mobile ? 0 : 1.5, 3.2, -289), look: V(mobile ? 0 : 4.5, -3.5, -306) };
    states.contact = { cam: V(0, 0, -318 + fz), look: V(0, 0, -330) };
  }

  // Scroll keyframes from DOM
  let keys = [];
  function buildKeys() {
    const vh = innerHeight;
    keys = [];
    sections.forEach(el => {
      const id = el.id; if (!states[id]) return;
      const top = el.offsetTop, end = top + Math.max(0, el.offsetHeight - vh);
      keys.push({ y: Math.max(0, top - vh * 0.35), id }, { y: Math.max(0, end - vh * 0.05), id });
    });
    keys[0].y = 0;
  }

  // ── Post-processing ───────────────────────────────────
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.85, 0.55, 0.7);
  composer.addPass(bloom);
  const fx = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uAberr: { value: 0 }, uRes: { value: new THREE.Vector2(1, 1) } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: /* glsl */`
      uniform sampler2D tDiffuse; uniform float uTime, uAberr; uniform vec2 uRes; varying vec2 vUv;
      void main(){
        vec2 c = vUv - 0.5; float r2 = dot(c, c);
        vec2 uv = 0.5 + c * (1.0 - r2 * uAberr * 0.25);
        vec2 off = c * (0.0012 + uAberr * 0.022) * (0.4 + r2 * 4.0);
        vec3 col = vec3(texture2D(tDiffuse, uv + off).r, texture2D(tDiffuse, uv).g, texture2D(tDiffuse, uv - off).b);
        float g = fract(sin(dot(vUv * uRes + fract(uTime) * 100.0, vec2(12.9898, 78.233))) * 43758.5453);
        col += (g - 0.5) * 0.035;
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  composer.addPass(new OutputPass());
  composer.addPass(fx);

  function resize() {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false);
    composer.setPixelRatio(pixelRatio);
    composer.setSize(w, h);
    bloom.resolution.set(w / 2, h / 2);
    fx.uniforms.uRes.value.set(w, h);
    layout(w, h);
    buildKeys();
    scene.traverse(o => { if (o.material && o.material.uniforms && o.material.uniforms.uPixel) o.material.uniforms.uPixel.value = pixelRatio * (h / 900); });
  }
  resize();
  addEventListener('resize', resize);
  new ResizeObserver(buildKeys).observe(document.body);

  // ── Interaction ───────────────────────────────────────
  const mouse = new THREE.Vector2(), mouseS = new THREE.Vector2();
  const ndc = new THREE.Vector2(-9, -9);
  const ray = new THREE.Raycaster();
  let hovered = null;
  const listeners = { hover: () => {}, cardClick: () => {}, skillHover: () => {} };
  addEventListener('pointermove', e => {
    mouse.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight * 2 - 1));
    ndc.copy(mouse);
    if (spin.drag) { spin.vy = (e.movementX || 0) * 0.002; spin.vx = (e.movementY || 0) * 0.002; }
  }, { passive: true });
  addEventListener('pointerdown', e => {
    if (e.target.closest('a, button, input, textarea, form, .project, .glass, nav, .term')) return;
    if (hovered && hovered.userData.kind === 'core') state.pulse = 1;
    if (hovered && hovered.userData.kind === 'card') listeners.cardClick(hovered.userData.index);
    if (state.focus.skills > 0.6) spin.drag = true;
  });
  addEventListener('pointerup', () => { spin.drag = false; });

  // ── State & loop ──────────────────────────────────────
  const state = {
    mouse: mouseS, warp: 0, pulse: 0, vel: 0,
    focus: { hero: 1, about: 0, certifications: 0, skills: 0, projects: 0, services: 0, faq: 0, contact: 0 },
    project: 0, depth: 0, fps: 60, section: 'hero',
  };
  const camPos = camera.position.clone(), camLook = new THREE.Vector3(0, 0, 0);
  const tgtPos = new THREE.Vector3(), tgtLook = new THREE.Vector3();
  let lastY = scrollY, intro = 0, introStart = -1, roll = 0;
  let frames = 0, fpsT = 0, slowFrames = 0, lastNow = performance.now();

  function cameraTarget(y) {
    if (!keys.length) return { a: states.hero, b: states.hero, t: 0 };
    if (y <= keys[0].y) return { a: states[keys[0].id], b: states[keys[0].id], t: 0, ida: keys[0].id, idb: keys[0].id };
    for (let i = 0; i < keys.length - 1; i++) {
      if (y < keys[i + 1].y) {
        const t = (y - keys[i].y) / Math.max(1, keys[i + 1].y - keys[i].y);
        return { a: states[keys[i].id], b: states[keys[i + 1].id], t, ida: keys[i].id, idb: keys[i + 1].id };
      }
    }
    const last = keys[keys.length - 1];
    return { a: states[last.id], b: states[last.id], t: 0, ida: last.id, idb: last.id };
  }

  function frame() {
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime * timeScale;
    const y = scrollY;

    // fps + adaptive quality
    const now = performance.now();
    frames++; fpsT += (now - lastNow) / 1000; lastNow = now;
    if (fpsT > 0.5) {
      state.fps = Math.round(frames / fpsT); frames = 0; fpsT = 0;
      if (state.fps < 38 && clock.elapsedTime > 4) { if (++slowFrames > 3 && pixelRatio > 0.9) { pixelRatio = Math.max(0.85, pixelRatio - 0.25); renderer.setPixelRatio(pixelRatio); resize(); slowFrames = 0; } }
      else slowFrames = 0;
    }

    const vh = innerHeight;
    state.vel = damp(state.vel, (y - lastY) / vh / Math.max(dt, 1e-3), 0.15, dt); // viewport-heights per second
    lastY = y;
    mouseS.lerp(mouse, 1 - Math.pow(0.94, dt * 60));

    const ct = cameraTarget(y);
    const e = ease(ct.t);
    tgtPos.lerpVectors(ct.a.cam, ct.b.cam, e);
    tgtLook.lerpVectors(ct.a.look, ct.b.look, e);
    const transit = ct.a !== ct.b ? Math.sin(Math.PI * ct.t) : 0;
    // section focus weights
    for (const k in state.focus) state.focus[k] = 0;
    state.focus[ct.ida] = (state.focus[ct.ida] || 0) + (1 - e);
    state.focus[ct.idb] = (state.focus[ct.idb] || 0) + e;
    state.section = e < 0.5 ? ct.ida : ct.idb;

    // intro fly-in
    if (introStart >= 0) intro = ease(clamp((clock.elapsedTime - introStart) / 2.6));
    const introOff = (1 - intro);
    tgtPos.z += introOff * 55; tgtPos.y += introOff * 6;

    // parallax
    tgtPos.x += mouseS.x * 0.6; tgtPos.y += mouseS.y * 0.4;

    const camK = 1 - Math.pow(0.0009, dt);
    camPos.lerp(tgtPos, camK);
    camLook.lerp(tgtLook, camK);
    camera.position.copy(camPos);
    camera.lookAt(camLook);
    roll = damp(roll, reducedMotion ? 0 : transit * 0.22 * Math.sign(state.vel || 1) + mouseS.x * -0.03, 0.08, dt);
    camera.rotateZ(roll);

    const speed = Math.abs(state.vel) * 0.45;
    state.warp = damp(state.warp, clamp(Math.max(transit * 0.9, speed) + introOff * 1.2, 0, 1.6), 0.1, dt);
    state.pulse = Math.max(0, state.pulse - dt * 0.9);
    state.depth = camPos.z;

    // hero core
    coreMat.uniforms.uTime.value = t;
    coreMat.uniforms.uPulse.value = state.pulse;
    coreMat.uniforms.uHover.value = damp(coreMat.uniforms.uHover.value, hovered && hovered.userData.kind === 'core' ? 1 : 0, 0.06, dt);
    core.rotation.y = t * 0.12 + mouseS.x * 0.4;
    core.rotation.x = mouseS.y * -0.3;
    shell.rotation.y = -t * 0.2; shell.rotation.z = t * 0.05;
    rings.forEach(r => { r.rotation.z += r.userData.speed * dt * timeScale * (1 + state.pulse * 6); });

    // carousel
    const pf = state.project;
    carousel.rotation.y = damp(carousel.rotation.y, -pf * step, 0.08, dt);
    cards.forEach((c, i) => {
      const u = c.material.uniforms;
      const active = 1 - clamp(Math.abs(i - pf));
      u.uTime.value = t;
      u.uActive.value = damp(u.uActive.value, active, 0.1, dt);
      u.uHover.value = damp(u.uHover.value, hovered === c ? 1 : 0, 0.08, dt);
      u.uVel.value = damp(u.uVel.value, clamp(Math.abs(state.vel) * 0.08, 0, 0.5) * state.focus.projects, 0.1, dt);
      c.scale.setScalar(damp(c.scale.x, 1 + active * 0.08 + u.uHover.value * 0.04, 0.1, dt));
    });

    // set-pieces materialise as the camera approaches, and are culled when far
    objects.forEach(o => {
      const f = ease(smooth(62, 24, Math.abs(o.position.z - camPos.z)));
      o.visible = f > 0.002;
      o.scale.setScalar(o.userData.baseScale * f);
    });

    const sDraw = { ...state };
    updaters.forEach(u => u(t, sDraw, dt * timeScale));

    // picking
    if (ndc.x > -2) {
      ray.setFromCamera(ndc, camera);
      const hits = ray.intersectObjects(pickables.filter(p => {
        let o = p; while (o.parent && o.parent !== scene) o = o.parent; return o.visible;
      }), false);
      const h = hits.length ? hits[0].object : null;
      if (h && h.userData.kind === 'card' && hits[0].uv) h.material.uniforms.uMouse.value.copy(hits[0].uv);
      if (h !== hovered) {
        hovered = h;
        listeners.hover(h ? h.userData.kind : null, h ? h.userData.index : -1);
        skillSprites.forEach(s => { s.userData.base = s === h ? 1.3 : 1; });
        if (h && h.userData.kind === 'skill') listeners.skillHover(h.userData.index);
        else listeners.skillHover(-1);
      }
    }

    fx.uniforms.uTime.value = clock.elapsedTime;
    fx.uniforms.uAberr.value = damp(fx.uniforms.uAberr.value, clamp(state.warp * 0.5 + state.pulse * 0.8, 0, 1.2), 0.1, dt);
    bloom.strength = 0.8 + state.pulse * 0.8 + state.warp * 0.25;

    composer.render();
    requestAnimationFrame(frame);
  }

  // render a first frame so shaders compile behind the loader
  renderer.compile(scene, camera);
  requestAnimationFrame(frame);

  await Promise.race([loaded, new Promise(r => setTimeout(r, 6000))]);
  onProgress && onProgress(1);

  return {
    start() { introStart = clock.elapsedTime; },
    pulse() { state.pulse = 1; },
    setProject(f) { state.project = f; },
    get state() { return state; },
    on(evt, fn) { listeners[evt] = fn; },
  };
}

// Generated cover art for projects without a screenshot
function proceduralTexture(kind) {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 640;
  const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 1024, 640);
  g.addColorStop(0, kind === 'emart' ? '#0f1d2b' : '#0b1414'); g.addColorStop(1, '#05070a');
  x.fillStyle = g; x.fillRect(0, 0, 1024, 640);
  // browser chrome
  x.fillStyle = '#121a22'; x.fillRect(0, 0, 1024, 44);
  ['#ff5f57', '#febc2e', '#28c840'].forEach((col, i) => { x.fillStyle = col; x.beginPath(); x.arc(26 + i * 22, 22, 7, 0, 7); x.fill(); });
  x.fillStyle = '#1c2630'; x.fillRect(110, 12, 600, 20);
  x.fillStyle = '#8b94a0'; x.font = '500 13px "IBM Plex Mono", monospace';
  x.fillText(kind === 'emart' ? 'emart.infinityfreeapp.com' : 'localhost:5000/dashboard', 122, 27);
  if (kind === 'emart') {
    x.fillStyle = '#e8b84b'; x.font = '800 64px Syne, sans-serif'; x.fillText('E-Mart', 50, 140);
    x.fillStyle = '#8b94a0'; x.font = '500 20px "IBM Plex Mono", monospace'; x.fillText('shop · cart · wishlist · admin', 52, 178);
    for (let i = 0; i < 4; i++) {
      const px = 50 + i * 240;
      x.fillStyle = '#121c26'; x.fillRect(px, 220, 210, 330);
      const pg = x.createLinearGradient(px, 220, px + 210, 400); pg.addColorStop(0, i % 2 ? '#2ffcb1' : '#e8b84b'); pg.addColorStop(1, '#0b1520');
      x.fillStyle = pg; x.globalAlpha = 0.35; x.fillRect(px + 14, 234, 182, 170); x.globalAlpha = 1;
      x.fillStyle = '#e8e4dc'; x.fillRect(px + 14, 424, 140, 14);
      x.fillStyle = '#8b94a0'; x.fillRect(px + 14, 450, 90, 10);
      x.fillStyle = i % 2 ? '#2ffcb1' : '#e8b84b'; x.fillRect(px + 14, 494, 182, 38);
      x.fillStyle = '#05070a'; x.font = '700 16px Syne, sans-serif'; x.fillText('ADD TO CART', px + 50, 519);
    }
  } else {
    x.fillStyle = '#2ffcb1'; x.font = '800 54px Syne, sans-serif'; x.fillText('Intent vs Reality', 50, 130);
    x.fillStyle = '#8b94a0'; x.font = '500 20px "IBM Plex Mono", monospace'; x.fillText('CS50x final · Flask · SQLite · Chart.js', 52, 168);
    x.strokeStyle = '#1c2630'; x.lineWidth = 1;
    for (let i = 0; i < 6; i++) { x.beginPath(); x.moveTo(60, 560 - i * 60); x.lineTo(970, 560 - i * 60); x.stroke(); }
    const est = [180, 240, 150, 300, 220, 260, 200, 280], act = [210, 200, 190, 280, 260, 230, 240, 250];
    est.forEach((v, i) => {
      const px = 80 + i * 112;
      x.fillStyle = '#e8b84b'; x.fillRect(px, 560 - v, 36, v);
      x.fillStyle = '#2ffcb1'; x.fillRect(px + 42, 560 - act[i], 36, act[i]);
    });
    x.fillStyle = '#e8b84b'; x.fillRect(720, 196, 16, 16); x.fillStyle = '#e8e4dc'; x.font = '500 16px "IBM Plex Mono"'; x.fillText('intended', 744, 210);
    x.fillStyle = '#2ffcb1'; x.fillRect(850, 196, 16, 16); x.fillStyle = '#e8e4dc'; x.fillText('actual', 874, 210);
  }
  return new THREE.CanvasTexture(c);
}
