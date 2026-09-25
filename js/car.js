// Procedural rear-engine sports car, built as separable service components.
// Axes: +x = front of car, +y = up, +z = driver's left. Units ≈ metres.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/RoundedBoxGeometry.js';

const FRONT_AXLE = 1.35;
const REAR_AXLE = -1.1;
const WHEEL_R = 0.34;
const TRACK = 0.8; // half track (wheel centre z)

export const ACCENT = new THREE.Color('#ff5b1f');

function makeMaterials() {
  return {
    paint: new THREE.MeshPhysicalMaterial({
      color: '#c9ccd1', metalness: 0.65, roughness: 0.28,
      clearcoat: 1, clearcoatRoughness: 0.06, side: THREE.DoubleSide,
    }),
    glass: new THREE.MeshPhysicalMaterial({
      color: '#07090c', metalness: 0.2, roughness: 0.05,
      clearcoat: 1, clearcoatRoughness: 0.02, side: THREE.DoubleSide,
    }),
    trim: new THREE.MeshStandardMaterial({ color: '#141518', metalness: 0.4, roughness: 0.5 }),
    rubber: new THREE.MeshStandardMaterial({ color: '#16171a', metalness: 0, roughness: 0.9 }),
    rim: new THREE.MeshStandardMaterial({ color: '#2b2e33', metalness: 0.9, roughness: 0.3 }),
    alloy: new THREE.MeshStandardMaterial({ color: '#b9bec6', metalness: 1, roughness: 0.32 }),
    steel: new THREE.MeshStandardMaterial({ color: '#6d727a', metalness: 1, roughness: 0.42 }),
    darkMetal: new THREE.MeshStandardMaterial({ color: '#2a2c31', metalness: 0.85, roughness: 0.45 }),
    caliper: new THREE.MeshStandardMaterial({ color: '#e0381a', metalness: 0.3, roughness: 0.35 }),
    accent: new THREE.MeshStandardMaterial({ color: '#b3241a', metalness: 0.5, roughness: 0.55 }),
    spring: new THREE.MeshStandardMaterial({ color: '#ff5b1f', metalness: 0.5, roughness: 0.35 }),
    titanium: new THREE.MeshStandardMaterial({ color: '#8f8479', metalness: 1, roughness: 0.3 }),
    headlight: new THREE.MeshStandardMaterial({ color: '#e8f0ff', emissive: '#cfe0ff', emissiveIntensity: 1.4 }),
    taillight: new THREE.MeshStandardMaterial({ color: '#5a0000', emissive: '#ff1a0a', emissiveIntensity: 1.6 }),
    wire: new THREE.MeshStandardMaterial({ color: '#ff5b1f', emissive: '#ff5b1f', emissiveIntensity: 0.9, roughness: 0.6 }),
    coolant: new THREE.MeshStandardMaterial({ color: '#4fb3ff', emissive: '#1d6fd1', emissiveIntensity: 0.6, roughness: 0.5 }),
    pcb: new THREE.MeshStandardMaterial({ color: '#0f1a14', emissive: '#19ff8c', emissiveIntensity: 0.25, roughness: 0.6 }),
    leather: new THREE.MeshStandardMaterial({ color: '#2a1d17', roughness: 0.75 }),
  };
}

function mesh(geo, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function rbox(w, h, d, r, mat, x, y, z) {
  return mesh(new RoundedBoxGeometry(w, h, d, 3, r), mat, x, y, z);
}

// Cylinder oriented along an axis ('x' | 'y' | 'z').
function cyl(rTop, rBot, len, mat, axis, x, y, z, seg = 32) {
  const g = new THREE.CylinderGeometry(rTop, rBot, len, seg);
  if (axis === 'x') g.rotateZ(Math.PI / 2);
  if (axis === 'z') g.rotateX(Math.PI / 2);
  return mesh(g, mat, x, y, z);
}

function tube(points, radius, mat, segs = 64) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  return mesh(new THREE.TubeGeometry(curve, segs, radius, 10, false), mat);
}

const smooth = (a, b, v) => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// ---------------------------------------------------------------- body shell
// Sample y along a 2D centre-line curve at a given x.
function profile(points) {
  const curve = new THREE.CatmullRomCurve3(points.map(([x, y]) => new THREE.Vector3(x, y, 0)), false, 'centripetal');
  const samples = curve.getSpacedPoints(400).sort((a, b) => a.x - b.x);
  return (x) => {
    if (x <= samples[0].x) return samples[0].y;
    for (let i = 1; i < samples.length; i++) {
      const b = samples[i];
      if (x <= b.x) {
        const a = samples[i - 1];
        return a.y + (b.y - a.y) * ((x - a.x) / (b.x - a.x || 1));
      }
    }
    return samples[samples.length - 1].y;
  };
}

// Loft a ring of [z, y] points (same count per station) along x.
function loft(x0, x1, stations, section, closedRing = true) {
  const pos = [];
  let ringSize = 0;
  for (let i = 0; i <= stations; i++) {
    const x = x0 + (x1 - x0) * (i / stations);
    const ring = section(x);
    ringSize = ring.length;
    for (const [z, y] of ring) pos.push(x, y, z);
  }
  const idx = [];
  const segs = closedRing ? ringSize : ringSize - 1;
  for (let i = 0; i < stations; i++) {
    for (let j = 0; j < segs; j++) {
      const a = i * ringSize + j;
      const b = i * ringSize + ((j + 1) % ringSize);
      const c = a + ringSize;
      const d = b + ringSize;
      idx.push(a, c, b, b, c, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

const spow = (v, e) => Math.sign(v) * Math.pow(Math.abs(v), e);

function buildShell(M) {
  const g = new THREE.Group();
  const LEN = 2.33;
  const archR = 0.45;
  const top = profile([
    [2.34, 0.4], [2.28, 0.57], [2.05, 0.665], [1.5, 0.735], [0.85, 0.79], [0, 0.8],
    [-0.7, 0.815], [-1.45, 0.805], [-1.95, 0.74], [-2.22, 0.63], [-2.34, 0.44],
  ]);
  const plan = (x) => Math.pow(1 - Math.pow(Math.min(1, Math.abs(x) / LEN), 5), 1 / 5);
  const halfWidth = (x) =>
    0.87 * plan(x) *
    (1 + 0.055 * Math.exp(-(((x - REAR_AXLE) / 0.5) ** 2))) *   // rear haunches
    (1 + 0.02 * Math.exp(-(((x - FRONT_AXLE) / 0.45) ** 2))) *   // front fenders
    (1 - 0.06 * smooth(1.4, 2.3, x));                            // narrowing nose

  const body = loft(-LEN, LEN, 320, (x) => {
    const yb = 0.22 + 0.12 * smooth(1.85, 2.34, x) + 0.1 * smooth(-1.9, -2.34, x);
    const yt = Math.max(yb + 0.01, top(x));
    const yc = (yt + yb) / 2, hh = (yt - yb) / 2, hw = halfWidth(x);
    const ring = [];
    for (let j = 0; j < 96; j++) {
      const t = (j / 96) * Math.PI * 2;
      const upper = Math.sin(t) > 0;
      const n = upper ? 2.6 : 7;
      let z = hw * spow(Math.cos(t), 2 / n);
      const y = yc + hh * spow(Math.sin(t), 2 / n);
      // Wheel wells: push the lower flank inboard inside each arch.
      for (const ax of [FRONT_AXLE, REAR_AXLE]) {
        const w = smooth(archR, archR - 0.035, Math.hypot(x - ax, y - WHEEL_R));
        if (w > 0 && Math.abs(z) > 0.6) z = Math.sign(z) * (Math.abs(z) + (0.6 - Math.abs(z)) * w);
      }
      ring.push([z, y]);
    }
    return ring;
  });
  g.add(mesh(body, M.paint));

  // Greenhouse: tinted glass bubble sitting on the beltline, with a painted roof skin.
  const roofLine = profile([
    [0.86, 0.79], [0.45, 1.0], [0.1, 1.17], [-0.3, 1.235], [-0.72, 1.2], [-1.2, 1.03], [-1.76, 0.8],
  ]);
  const cabinSection = (scale, t0, t1, steps) => (x) => {
    const yb = top(x) - 0.03;
    const yt = Math.max(yb + 0.005, roofLine(x));
    const hw = 0.66 - 0.05 * smooth(-0.8, -1.7, x);
    const ring = [];
    for (let j = 0; j <= steps; j++) {
      const t = t0 + (t1 - t0) * (j / steps);
      ring.push([hw * spow(Math.cos(t), 2 / 2.3) * scale, yb + (yt - yb) * spow(Math.sin(t), 2 / 2.3) * scale]);
    }
    return ring;
  };
  g.add(mesh(loft(-1.76, 0.86, 120, cabinSection(1, 0, Math.PI, 40)), M.glass));
  const roofGeo = loft(-0.74, 0.2, 60, cabinSection(1.012, 0.28 * Math.PI, 0.72 * Math.PI, 24), false);
  g.add(mesh(roofGeo, M.paint));
  // Door shut-line hint, sill and window trim strips.
  for (const side of [-1, 1]) {
    g.add(rbox(1.3, 0.04, 0.03, 0.015, M.trim, -0.05, 0.3, side * 0.845));

    const lamp = mesh(new THREE.SphereGeometry(0.1, 32, 16), M.headlight, 1.97, 0.63, side * 0.55);
    lamp.scale.set(0.45, 0.62, 0.9);
    lamp.rotation.set(0, side * 0.3, -0.5);
    g.add(lamp);
    const mirror = rbox(0.13, 0.07, 0.12, 0.03, M.paint, 0.66, 0.86, side * 0.7);
    g.add(mirror);
  }
  g.add(rbox(0.04, 0.04, 0.84, 0.018, M.taillight, -2.255, 0.575, 0));
  g.add(rbox(0.05, 0.07, 0.9, 0.03, M.trim, 2.3, 0.36, 0));    // front intake

  return g;
}

// ------------------------------------------------------------ chassis + cabin
function buildChassis(M) {
  const g = new THREE.Group();
  g.add(rbox(4.25, 0.07, 1.46, 0.03, M.darkMetal, 0, 0.2, 0));
  g.add(rbox(3.2, 0.12, 0.18, 0.04, M.darkMetal, 0.1, 0.27, 0)); // centre tunnel
  for (const side of [-1, 1]) {
    g.add(rbox(3.0, 0.12, 0.12, 0.04, M.darkMetal, 0.1, 0.27, side * 0.66)); // sills
    // Seats
    const base = rbox(0.5, 0.12, 0.44, 0.05, M.leather, -0.25, 0.36, side * 0.34);
    const back = rbox(0.12, 0.55, 0.44, 0.05, M.leather, -0.52, 0.62, side * 0.34);
    back.rotation.z = 0.22;
    g.add(base, back);
  }
  const dash = rbox(0.3, 0.2, 1.34, 0.06, M.trim, 0.55, 0.66, 0);
  const wheel = mesh(new THREE.TorusGeometry(0.17, 0.02, 12, 40), M.trim, 0.36, 0.68, 0.34);
  wheel.rotation.y = Math.PI / 2;
  wheel.rotation.x = 0.3;
  g.add(dash, wheel);
  return g;
}

// ----------------------------------------------------------- wheels & tyres
function buildWheel(M) {
  const g = new THREE.Group();
  const prof = [
    [0.235, -0.13], [0.3, -0.135], [0.328, -0.12], [WHEEL_R, -0.07],
    [WHEEL_R, 0.07], [0.328, 0.12], [0.3, 0.135], [0.235, 0.13],
  ].map(([r, y]) => new THREE.Vector2(r, y));
  const tyreGeo = new THREE.LatheGeometry(prof, 64);
  tyreGeo.rotateX(Math.PI / 2);
  const tyre = mesh(tyreGeo, M.rubber);
  tyre.material.side = THREE.DoubleSide;
  g.add(tyre);

  const barrel = new THREE.CylinderGeometry(0.235, 0.235, 0.25, 48, 1, true);
  barrel.rotateX(Math.PI / 2);
  g.add(mesh(barrel, M.rim));
  const lip = mesh(new THREE.TorusGeometry(0.232, 0.012, 10, 48), M.alloy, 0, 0, 0.115);
  g.add(lip);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const spoke = rbox(0.21, 0.05, 0.03, 0.012, M.alloy, Math.cos(a) * 0.115, Math.sin(a) * 0.115, 0.1);
    spoke.rotation.z = a;
    g.add(spoke);
  }
  g.add(cyl(0.055, 0.06, 0.05, M.alloy, 'z', 0, 0, 0.11));
  g.add(cyl(0.028, 0.028, 0.02, M.accent, 'z', 0, 0, 0.14));
  return g;
}

// ------------------------------------------------------------------ brakes
function buildBrake(M, rear) {
  const g = new THREE.Group();
  const discR = rear ? 0.19 : 0.2;
  g.add(cyl(discR, discR, 0.032, M.steel, 'z', 0, 0, 0, 48));
  g.add(cyl(0.09, 0.09, 0.06, M.darkMetal, 'z', 0, 0, 0.02, 32));
  // Cross-drilled look: ring of dark dots on the friction face.
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    const r = 0.13 + (i % 2) * 0.03;
    g.add(cyl(0.008, 0.008, 0.036, M.darkMetal, 'z', Math.cos(a) * r, Math.sin(a) * r, 0, 8));
  }
  const cal = rbox(0.1, 0.19, 0.1, 0.035, M.caliper, 0, 0, 0);
  cal.position.set(-Math.sin(0.7) * discR * 0.82, Math.cos(0.7) * discR * 0.82, 0);
  cal.rotation.z = 0.7;
  g.add(cal);
  return g;
}

// --------------------------------------------------------------- suspension
function buildCorner(M, front) {
  const g = new THREE.Group();
  const pts = [];
  const turns = 6.5, h = 0.32, r = 0.065;
  for (let i = 0; i <= 260; i++) {
    const t = i / 260;
    const a = t * turns * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(a) * r, t * h, Math.sin(a) * r));
  }
  const spring = mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 400, 0.011, 8), M.spring);
  spring.position.set(0, 0.36, -0.14);
  g.add(spring);
  g.add(cyl(0.028, 0.028, 0.46, M.alloy, 'y', 0, 0.56, -0.14));
  g.add(cyl(0.042, 0.042, 0.2, M.darkMetal, 'y', 0, 0.44, -0.14));
  g.add(cyl(0.085, 0.085, 0.02, M.darkMetal, 'y', 0, 0.36, -0.14));
  g.add(cyl(0.085, 0.085, 0.02, M.darkMetal, 'y', 0, 0.69, -0.14));
  // Upright/knuckle and lower control arm to the chassis.
  g.add(rbox(0.1, 0.24, 0.06, 0.02, M.darkMetal, 0, WHEEL_R, 0.02));
  const arm = rbox(0.1, 0.035, 0.5, 0.015, M.steel, 0, 0.25, -0.24);
  g.add(arm);
  if (front) g.add(cyl(0.012, 0.012, 0.42, M.steel, 'z', 0.12, 0.3, -0.22, 10)); // tie rod
  return g;
}

// ------------------------------------------------------------------- engine
function buildEngine(M) {
  const core = new THREE.Group();
  const bankL = new THREE.Group();
  const bankR = new THREE.Group();
  const intake = new THREE.Group();
  const cx = -1.72, cy = 0.46;

  core.add(rbox(0.72, 0.28, 0.34, 0.05, M.alloy, cx, cy, 0));
  core.add(rbox(0.6, 0.08, 0.28, 0.03, M.darkMetal, cx, cy - 0.17, 0)); // sump
  core.add(cyl(0.085, 0.085, 0.04, M.darkMetal, 'x', cx - 0.4, cy + 0.04, 0.0)); // crank pulley
  core.add(cyl(0.05, 0.05, 0.04, M.darkMetal, 'x', cx - 0.4, cy + 0.2, 0.12));
  core.add(cyl(0.045, 0.045, 0.04, M.darkMetal, 'x', cx - 0.4, cy + 0.18, -0.13));
  const belt = tube([[cx - 0.4, cy - 0.045, 0], [cx - 0.4, cy + 0.08, 0.1], [cx - 0.4, cy + 0.25, 0.12],
    [cx - 0.4, cy + 0.2, -0.08], [cx - 0.4, cy - 0.045, 0]], 0.01, M.rubber, 48);
  core.add(belt);

  for (const [bank, side] of [[bankL, 1], [bankR, -1]]) {
    for (let i = 0; i < 3; i++) {
      const x = cx + 0.2 - i * 0.2;
      bank.add(cyl(0.07, 0.07, 0.2, M.alloy, 'z', x, cy, side * 0.28));
      for (let f = 0; f < 5; f++) {
        bank.add(cyl(0.088, 0.088, 0.008, M.steel, 'z', x, cy, side * (0.2 + f * 0.035), 28));
      }
    }
    bank.add(rbox(0.66, 0.22, 0.1, 0.03, M.darkMetal, cx, cy, side * 0.43));
    bank.add(rbox(0.62, 0.15, 0.05, 0.02, M.accent, cx, cy + 0.01, side * 0.5)); // valve cover
    for (let i = 0; i < 3; i++) {
      bank.add(cyl(0.012, 0.012, 0.06, M.trim, 'z', cx + 0.2 - i * 0.2, cy + 0.05, side * 0.54, 8)); // coil packs
    }
  }

  const plenum = new THREE.CapsuleGeometry(0.065, 0.42, 8, 24);
  plenum.rotateZ(Math.PI / 2);
  intake.add(mesh(plenum, M.alloy, cx + 0.04, cy + 0.22, 0));
  intake.add(cyl(0.055, 0.055, 0.1, M.darkMetal, 'x', cx + 0.36, cy + 0.22, 0)); // throttle body
  for (const side of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const x = cx + 0.2 - i * 0.2;
      intake.add(tube([[x, cy + 0.21, side * 0.05], [x, cy + 0.2, side * 0.25], [x, cy + 0.1, side * 0.42]], 0.022, M.alloy, 20));
    }
  }
  return { core, bankL, bankR, intake };
}

// ------------------------------------------------------------- transmission
function buildTransmission(M) {
  const g = new THREE.Group();
  const bell = new THREE.CylinderGeometry(0.15, 0.2, 0.18, 36);
  bell.rotateZ(Math.PI / 2);
  g.add(mesh(bell, M.alloy, -1.27, 0.42, 0));
  g.add(mesh(new THREE.SphereGeometry(0.14, 32, 16), M.alloy, -1.1, 0.36, 0)); // differential
  g.add(rbox(0.6, 0.22, 0.24, 0.05, M.alloy, -0.75, 0.42, 0));
  for (let i = 0; i < 5; i++) g.add(rbox(0.012, 0.23, 0.25, 0.005, M.steel, -0.95 + i * 0.1, 0.42, 0)); // ribs
  g.add(cyl(0.012, 0.012, 0.9, M.steel, 'x', 0.05, 0.4, 0, 10)); // shift linkage
  // Drive shafts with CV joints out to the rear hubs.
  for (const side of [-1, 1]) {
    g.add(cyl(0.022, 0.022, 0.56, M.steel, 'z', REAR_AXLE, WHEEL_R, side * 0.42, 14));
    g.add(mesh(new THREE.SphereGeometry(0.045, 16, 12), M.rubber, REAR_AXLE, WHEEL_R, side * 0.16));
    g.add(mesh(new THREE.SphereGeometry(0.045, 16, 12), M.rubber, REAR_AXLE, WHEEL_R, side * 0.68));
  }
  return g;
}

// ------------------------------------------------------------------ exhaust
function buildExhaust(M) {
  const g = new THREE.Group();
  for (const side of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const x = -1.52 - i * 0.2;
      g.add(tube([[x, 0.4, side * 0.46], [x - 0.02, 0.3, side * 0.5], [-1.9, 0.26, side * 0.45], [-2.02, 0.27, side * 0.38]], 0.018, M.titanium, 24));
    }
    const cat = new THREE.CapsuleGeometry(0.055, 0.14, 6, 20);
    cat.rotateZ(Math.PI / 2);
    g.add(mesh(cat, M.steel, -1.98, 0.27, side * 0.4));
    g.add(cyl(0.045, 0.045, 0.14, M.titanium, 'x', -2.3, 0.3, side * 0.2, 28));
    g.add(cyl(0.035, 0.035, 0.145, M.trim, 'x', -2.3, 0.3, side * 0.2, 28));
  }
  g.add(rbox(0.2, 0.17, 1.0, 0.07, M.titanium, -2.14, 0.3, 0)); // muffler
  return g;
}

// ------------------------------------------- electrical, cooling & climate
function buildElectrical(M) {
  const g = new THREE.Group();
  g.add(rbox(0.26, 0.19, 0.18, 0.02, M.trim, 1.72, 0.4, 0.3)); // battery
  g.add(cyl(0.018, 0.018, 0.04, M.caliper, 'y', 1.66, 0.51, 0.36, 12));
  g.add(cyl(0.018, 0.018, 0.04, M.steel, 'y', 1.78, 0.51, 0.36, 12));
  g.add(rbox(0.2, 0.04, 0.15, 0.01, M.pcb, 1.5, 0.52, -0.28)); // ECU
  for (let i = 0; i < 6; i++) g.add(rbox(0.012, 0.012, 0.02, 0.004, M.wire, 1.43 + i * 0.025, 0.545, -0.2));
  g.add(rbox(0.26, 0.2, 0.9, 0.05, M.darkMetal, 0.95, 0.56, 0)); // HVAC box
  for (const side of [-1, 1]) {
    const rad = rbox(0.05, 0.28, 0.42, 0.015, M.darkMetal, 2.02, 0.42, side * 0.48);
    rad.rotation.y = side * -0.35;
    g.add(rad);
    for (let i = 0; i < 7; i++) {
      const fin = rbox(0.052, 0.012, 0.4, 0.004, M.steel, 2.03, 0.31 + i * 0.037, side * 0.48);
      fin.rotation.y = side * -0.35;
      g.add(fin);
    }
    // Coolant lines back to the engine.
    g.add(tube([[1.98, 0.36, side * 0.4], [1.4, 0.26, side * 0.5], [0, 0.25, side * 0.55], [-1.2, 0.3, side * 0.25], [-1.45, 0.42, side * 0.2]], 0.014, M.coolant, 80));
  }
  g.add(rbox(0.05, 0.26, 0.5, 0.015, M.darkMetal, 2.1, 0.42, 0)); // A/C condenser
  // Wiring harness from the ECU to the engine bay.
  g.add(tube([[1.5, 0.52, -0.28], [1.2, 0.4, -0.5], [0.4, 0.3, -0.6], [-0.9, 0.32, -0.6], [-1.45, 0.62, -0.3], [-1.72, 0.66, -0.1]], 0.012, M.wire, 120));
  g.add(tube([[1.72, 0.5, 0.3], [1.35, 0.42, 0.48], [0.95, 0.5, 0.3]], 0.01, M.wire, 40));
  return g;
}

// ---------------------------------------------------------------- assembly
// Each part: { objects: [{ obj, offset: Vector3 }] }. Offsets are the
// exploded displacement from the assembled position.
export function buildCar() {
  const M = makeMaterials();
  const root = new THREE.Group();
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const parts = {};
  const add = (name, obj, offset) => {
    (parts[name] ||= { objects: [] }).objects.push({ obj, offset });
    root.add(obj);
  };

  add('chassis', buildChassis(M), V(0, 0, 0));
  add('shell', buildShell(M), V(0, 1.75, 0));

  const corners = [
    [FRONT_AXLE, 1, true], [FRONT_AXLE, -1, true],
    [REAR_AXLE, 1, false], [REAR_AXLE, -1, false],
  ];
  for (const [x, side, front] of corners) {
    const w = buildWheel(M);
    w.position.set(x, WHEEL_R, side * TRACK);
    if (side < 0) w.rotation.y = Math.PI;
    add('wheels', w, V(0, 0, side * 1.0));

    const b = buildBrake(M, !front);
    b.position.set(x, WHEEL_R, side * (TRACK - 0.1));
    if (side < 0) b.rotation.y = Math.PI;
    add('brakes', b, V(0, 0.05, side * 0.55));

    const s = buildCorner(M, front);
    s.position.set(x, 0, side * (TRACK - 0.16));
    if (side < 0) s.rotation.y = Math.PI;
    add('suspension', s, V(0, 0.35, side * 0.12));
  }

  const eng = buildEngine(M);
  add('engine', eng.core, V(-0.55, 0.95, 0));
  add('engine', eng.bankL, V(-0.55, 0.95, 0.38));
  add('engine', eng.bankR, V(-0.55, 0.95, -0.38));
  add('engine', eng.intake, V(-0.55, 1.4, 0));

  add('transmission', buildTransmission(M), V(0.25, 0.6, 0));
  add('exhaust', buildExhaust(M), V(-0.45, -0.18, 0));
  add('electrical', buildElectrical(M), V(0.15, 0.75, 0));

  // Give every part its own material instances so it can fade independently.
  for (const part of Object.values(parts)) {
    const cache = new Map();
    part.materials = [];
    for (const { obj } of part.objects) {
      obj.traverse((o) => {
        if (!o.isMesh) return;
        if (!cache.has(o.material)) {
          const m = o.material.clone();
          m.transparent = true;
          m.userData.baseEmissive = m.emissive ? m.emissive.clone() : null;
          m.userData.baseEmissiveIntensity = m.emissiveIntensity ?? 0;
          cache.set(o.material, m);
          part.materials.push(m);
        }
        o.material = cache.get(o.material);
      });
    }
    for (const entry of part.objects) entry.home = entry.obj.position.clone();
  }

  return { root, parts };
}
