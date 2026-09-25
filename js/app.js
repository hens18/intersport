import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/RoomEnvironment.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { buildCar, useBody, ACCENT } from './car.js';

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const section = document.getElementById('teardown');
const canvas = document.getElementById('scene');
const panels = [...document.querySelectorAll('.panel')];
const railButtons = [...document.querySelectorAll('.rail button')];
const anchorEl = document.getElementById('anchor');
const hint = document.querySelector('.scroll-hint');
const nav = document.querySelector('.nav');
const STAGES = panels.length; // 0 = hero … 9 = reassembled

// Which part each chapter pulls out. Stage 1 (inspection) lifts the body.
const STAGE_PART = [null, 'shell', 'wheels', 'brakes', 'suspension', 'engine', 'transmission', 'exhaust', 'electrical', null];

// Camera keyframes per chapter: [position, look-at target].
const SHOTS = [
  [[5.6, 1.75, 5.4], [0, 0.55, 0]],
  [[6.4, 3.6, 6.2], [0, 1.1, 0]],
  [[3.7, 1.2, 5.1], [1.06, 0.4, 1.25]],
  [[2.6, 0.85, 3.9], [1.16, 0.38, 1.18]],
  [[3.1, 2.3, 3.6], [1.0, 0.6, 0.65]],
  [[-4.6, 2.9, 4.0], [-2.1, 1.35, 0]],
  [[-1.3, 2.2, 3.8], [-0.85, 0.95, 0]],
  [[-5.0, 0.9, 3.2], [-2.5, 0.2, 0]],
  [[5.9, 3.3, 3.9], [1.4, 0.95, 0]],
  [[-5.4, 1.6, 5.6], [0, 0.55, 0]],
].map(([p, t]) => [new THREE.Vector3(...p), new THREE.Vector3(...t)]);

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const smoothstep = (a, b, v) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };

// ------------------------------------------------------------------ UI that works without WebGL
function scrollToStage(i) {
  const max = section.offsetHeight - innerHeight;
  const y = section.offsetTop + (i / (STAGES - 1)) * max;
  window.scrollTo({ top: y, behavior: reduceMotion ? 'auto' : 'smooth' });
}
document.querySelectorAll('[data-scroll-stage]').forEach((el) =>
  el.addEventListener('click', (e) => { e.preventDefault(); scrollToStage(+el.dataset.scrollStage); }));

let activeStage = -1;
function setActiveStage(i) {
  if (i === activeStage) return;
  activeStage = i;
  panels.forEach((p, k) => p.classList.toggle('is-active', k === i));
  railButtons.forEach((b, k) => b.classList.toggle('is-active', k === i));
}

setupBookingForm();

// ------------------------------------------------------------------ scene
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
} catch (err) {
  document.documentElement.classList.add('no-webgl');
  setActiveStage(0);
}

if (renderer) initScene();

function initScene() {
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.9;

  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);

  const key = new THREE.DirectionalLight('#ffffff', 2.2);
  key.position.set(4, 8, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: 1, far: 25 });
  key.shadow.bias = -0.0004;
  key.shadow.radius = 6;
  scene.add(key);
  const rim = new THREE.DirectionalLight('#ffb48a', 1.3);
  rim.position.set(-6, 3, -5);
  scene.add(rim);
  scene.add(new THREE.HemisphereLight('#bcd0ff', '#1a1410', 0.35));

  // Floor: shadow catcher + blueprint grid + turntable ring.
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ opacity: 0.45 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
  const grid = new THREE.GridHelper(40, 80, '#2a2d33', '#1a1c20');
  grid.position.y = 0.001;
  grid.material.transparent = true;
  grid.material.opacity = 0.55;
  scene.add(grid);
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(3.05, 3.08, 128),
    new THREE.MeshBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.55 })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.003;
  scene.add(ring);
  const ticks = new THREE.Group();
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * Math.PI * 2;
    const len = i % 6 === 0 ? 0.18 : 0.08;
    const t = new THREE.Mesh(new THREE.PlaneGeometry(0.012, len), ring.material);
    t.rotation.x = -Math.PI / 2;
    t.rotation.z = -a;
    t.position.set(Math.sin(a) * (3.2 + len / 2), 0.003, Math.cos(a) * (3.2 + len / 2));
    ticks.add(t);
  }
  scene.add(ticks);

  const built = buildCar();
  const { root: car, parts } = built;
  scene.add(car);

  // Show the car once the generated 911 body has loaded. If it can't load,
  // fall back to the procedural shell.
  car.visible = false;
  const showCar = () => { car.visible = true; };
  const fallback = setTimeout(showCar, 12000);
  new GLTFLoader().load(
    'assets/911.glb',
    (gltf) => { useBody(built, gltf.scene); clearTimeout(fallback); showCar(); },
    undefined,
    () => { clearTimeout(fallback); showCar(); }
  );

  // ---------------------------------------------------------------- sizing
  let width = 0, height = 0, isMobile = false;
  function resize() {
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    isMobile = width < 760;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    // Keep the car a similar size regardless of aspect ratio.
    camera.fov = THREE.MathUtils.clamp(2 * THREE.MathUtils.radToDeg(Math.atan(Math.tan(THREE.MathUtils.degToRad(27)) / camera.aspect)), 30, 58);
    // Push the render centre away from the copy: right on desktop, up on mobile.
    if (isMobile) camera.setViewOffset(width, height, 0, height * 0.2, width, height);
    else camera.setViewOffset(width, height, -width * 0.17, 0, width, height);
    camera.updateProjectionMatrix();
  }
  addEventListener('resize', resize);
  resize();

  // ---------------------------------------------------------------- input
  const pointer = new THREE.Vector2();
  const pointerSmooth = new THREE.Vector2();
  addEventListener('pointermove', (e) => {
    pointer.set((e.clientX / innerWidth) * 2 - 1, (e.clientY / innerHeight) * 2 - 1);
  }, { passive: true });

  function scrollProgress() {
    const max = section.offsetHeight - innerHeight;
    return clamp01((scrollY - section.offsetTop) / max);
  }
  let progress = scrollProgress();
  let visible = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(section);

  // ---------------------------------------------------------------- frame
  const camPos = new THREE.Vector3();
  const camTarget = new THREE.Vector3();
  const tmpA = new THREE.Vector3();
  const box = new THREE.Box3();
  const clock = new THREE.Clock();

  function frame() {
    requestAnimationFrame(frame);
    nav.classList.toggle('is-solid', scrollY > section.offsetTop + section.offsetHeight - innerHeight - 10);
    if (!visible) return;

    const dt = Math.min(0.1, clock.getDelta());
    const time = clock.elapsedTime;
    const target = scrollProgress();
    progress += (target - progress) * (reduceMotion ? 1 : 1 - Math.exp(-dt * 6));

    // p runs 0..STAGES-1; s eases between chapters so each one "holds".
    const p = progress * (STAGES - 1);
    const i0 = Math.min(STAGES - 2, Math.floor(p));
    const s = i0 + smoothstep(0.18, 0.82, p - i0);
    const stageIdx = Math.round(p);
    setActiveStage(stageIdx);
    hint.classList.toggle('is-hidden', p > 0.15);

    // Explosion: each part comes out on its chapter and stays out until reassembly.
    const reassemble = smoothstep(8.05, 8.95, s);
    const dim = smoothstep(1, 2, s) * (1 - reassemble);
    for (const [name, part] of Object.entries(parts)) {
      const k = STAGE_PART.indexOf(name);
      const out = k < 0 ? 0 : clamp01(s - (k - 1)) * (1 - reassemble);
      const e = out * out * (3 - 2 * out);
      for (const { obj, offset, home } of part.objects) obj.position.copy(home).addScaledVector(offset, e);

      const focus = k < 0 ? 0 : 1 - clamp01(Math.abs(s - k));
      let opacity = Math.max(focus, 1 - dim * 0.9);
      if (name === 'shell') opacity = Math.max(focus, 1 - dim * 0.96);
      const pulse = reduceMotion ? 0.5 : 0.5 + 0.5 * Math.sin(time * 3);
      for (const m of part.materials) {
        m.opacity = opacity;
        m.depthWrite = opacity > 0.98;
        m.visible = opacity > 0.02;
        if (m.emissive && m.userData.baseEmissive) {
          m.emissive.copy(m.userData.baseEmissive).lerp(ACCENT, focus * 0.35 * (m.userData.baseEmissiveIntensity > 0 ? 0 : 1));
          m.emissiveIntensity = Math.max(m.userData.baseEmissiveIntensity, focus * 0.18 * (0.6 + 0.4 * pulse));
        }
      }
    }

    // Gentle turntable sway on the hero, fading out as the teardown begins.
    const heroW = 1 - smoothstep(0, 0.9, s);
    car.rotation.y = reduceMotion ? 0 : Math.sin(time * 0.3) * 0.5 * heroW;
    ticks.rotation.y = car.rotation.y;

    // Camera: blend between chapter shots.
    const a = SHOTS[i0], b = SHOTS[i0 + 1];
    const f = s - i0;
    camPos.lerpVectors(a[0], b[0], f);
    camTarget.lerpVectors(a[1], b[1], f);
    // Arc outward mid-transition so the camera doesn't clip through parts.
    camPos.sub(camTarget).multiplyScalar(1 + Math.sin(f * Math.PI) * 0.18).add(camTarget);
    if (isMobile) camPos.sub(camTarget).multiplyScalar(1.28).add(camTarget);
    pointerSmooth.lerp(pointer, 1 - Math.exp(-dt * 3));
    camPos.x += pointerSmooth.x * 0.25;
    camPos.y -= pointerSmooth.y * 0.15;
    camera.position.copy(camPos);
    camera.lookAt(camTarget);

    // Callout pinned to the focused component.
    const part = STAGE_PART[stageIdx] && parts[STAGE_PART[stageIdx]];
    const hold = 1 - clamp01(Math.abs(p - stageIdx) * 3);
    if (part && hold > 0) {
      box.setFromObject(part.objects[0].obj);
      if (STAGE_PART[stageIdx] === 'engine') part.objects.forEach(({ obj }) => box.expandByObject(obj));
      const anchorPt = box.getCenter(tmpA);
      anchorPt.y = box.max.y;
      anchorPt.project(camera);
      const x = (anchorPt.x * 0.5 + 0.5) * width;
      const y = (-anchorPt.y * 0.5 + 0.5) * height;
      anchorEl.style.transform = `translate(${x}px, ${y - 7}px)`;
      anchorEl.querySelector('span').textContent = panels[stageIdx].dataset.label;
      anchorEl.classList.toggle('is-on', hold > 0.5);

    } else {
      anchorEl.classList.remove('is-on');
    }

    renderer.render(scene, camera);
  }
  frame();
}

// ------------------------------------------------------------------ booking form
// No backend yet: builds a pre-filled email to the service desk.
function setupBookingForm() {
  const form = document.getElementById('book');
  const status = form.querySelector('.form-status');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    let ok = true;
    for (const el of form.querySelectorAll('[required]')) {
      const bad = !el.value.trim();
      el.setAttribute('aria-invalid', bad);
      if (bad && ok) { el.focus(); ok = false; }
    }
    if (!ok) { status.textContent = 'Please fill in your name, phone and vehicle.'; return; }
    const d = Object.fromEntries(new FormData(form));
    const body = [
      `Name: ${d.name}`, `Phone: ${d.phone}`, `Email: ${d.email || '-'}`,
      `Vehicle: ${d.vehicle}`, `Service: ${d.service}`, `Preferred date: ${d.date || 'Flexible'}`,
      `Pick-up & delivery: ${d.pickup ? 'Yes' : 'No'}`, '', d.notes || '',
    ].join('\n');
    location.href = `mailto:service@intersportperformance.com?subject=${encodeURIComponent(`Service request: ${d.vehicle}`)}&body=${encodeURIComponent(body)}`;
    status.textContent = 'Opening your email app. If nothing happens, call (703) 574-9383.';
  });
}
