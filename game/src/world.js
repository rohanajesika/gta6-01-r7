// The city of Solmar Bay: sunset sky, water at the west edge, a road grid,
// sidewalk strips, one building per block (towers in Downtown, containers in
// the Port, palms along the Marina), street lamps and a glowing mission
// beacon. Builds the three.js scene and the collision boxes; it never moves
// anything, so traffic, pedestrians and police live in their own files.

import * as THREE from 'three';
import { CITY, DISTRICTS, PALETTE } from './config.js';
import { pick, range } from './random.js';

const BUILDING_COLORS = [0xcfc4b0, 0xbfae8e, 0xd8cdb8, 0xa89a80, 0xe0d3ba, 0xc9b49a];
const ROOF_COLORS = [0x6b5a44, 0x54483a, 0x7a6a52];

function box(w, h, d, color, x, y, z) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshLambertMaterial({ color }),
  );
  mesh.position.set(x, y, z);
  return mesh;
}

export function buildCity(scene, random) {
  const colliders = [];
  const lamps = [];

  scene.background = new THREE.Color(PALETTE.sky);
  scene.fog = new THREE.Fog(PALETTE.fog, 120, 520);

  const hemi = new THREE.HemisphereLight(0xffd9a0, 0x4a3a2e, 0.9);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffb36b, 1.6);
  sun.position.set(-180, 140, -120);
  scene.add(sun);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(CITY.half * 2 + 240, CITY.half * 2 + 240),
    new THREE.MeshLambertMaterial({ color: PALETTE.ground }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, -0.05, 0);
  scene.add(ground);

  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(120, CITY.half * 2 + 240),
    new THREE.MeshLambertMaterial({ color: PALETTE.water }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(-CITY.half - 60, 0.02, 0);
  scene.add(water);

  // Roads: dark strips along every grid line, both directions.
  const roadMat = new THREE.MeshLambertMaterial({ color: PALETTE.asphalt });
  const sideMat = new THREE.MeshLambertMaterial({ color: PALETTE.sidewalk });
  const roads = [];
  for (let c = -CITY.half; c <= CITY.half; c += CITY.roadStep) roads.push(c);
  for (const c of roads) {
    const ns = new THREE.Mesh(new THREE.PlaneGeometry(CITY.roadHalfWidth * 2, CITY.half * 2), roadMat);
    ns.rotation.x = -Math.PI / 2;
    ns.position.set(c, 0.01, 0);
    scene.add(ns);
    const ew = new THREE.Mesh(new THREE.PlaneGeometry(CITY.half * 2, CITY.roadHalfWidth * 2), roadMat);
    ew.rotation.x = -Math.PI / 2;
    ew.position.set(0, 0.01, c);
    scene.add(ew);
    const nsSide = new THREE.Mesh(new THREE.PlaneGeometry(CITY.roadHalfWidth * 2 + 6, CITY.half * 2), sideMat);
    nsSide.rotation.x = -Math.PI / 2;
    nsSide.position.set(c, 0.005, 0);
    scene.add(nsSide);
    const ewSide = new THREE.Mesh(new THREE.PlaneGeometry(CITY.half * 2, CITY.roadHalfWidth * 2 + 6), sideMat);
    ewSide.rotation.x = -Math.PI / 2;
    ewSide.position.set(0, 0.005, c);
    scene.add(ewSide);
  }
  // Centre dashes on the two main avenues.
  const dashMat = new THREE.MeshBasicMaterial({ color: 0xf2c94c });
  for (let d = -CITY.half + 20; d < CITY.half; d += 24) {
    for (const axis of [0]) {
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 6), dashMat);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(axis, 0.02, d);
      scene.add(dash);
    }
  }

  // One building per block, sized by district; Downtown gets towers.
  for (let bx = -CITY.half + CITY.roadStep / 2; bx < CITY.half; bx += CITY.roadStep) {
    for (let bz = -CITY.half + CITY.roadStep / 2; bz < CITY.half; bz += CITY.roadStep) {
      const district = DISTRICTS.find((d) => bx >= d.x0 && bx < d.x1 && bz >= d.z0 && bz < d.z1);
      const tint = district ? district.tint : PALETTE.building;
      const tower = district && district.tower && random() < 0.55;
      const w = range(random, 18, 34);
      const d = range(random, 18, 34);
      const h = tower ? range(random, 55, 110) : range(random, 8, 26);
      const cx = bx + range(random, -4, 4);
      const cz = bz + range(random, -4, 4);
      const color = new THREE.Color(pick(random, BUILDING_COLORS)).lerp(new THREE.Color(tint), 0.35).getHex();
      const building = box(w, h, d, color, cx, h / 2, cz);
      scene.add(building);
      scene.add(box(w + 1, 1.2, d + 1, pick(random, ROOF_COLORS), cx, h + 0.6, cz));
      // Lit windows on tall faces, as small emissive planes.
      if (h > 20) {
        const winMat = new THREE.MeshBasicMaterial({ color: 0xffd27a });
        for (let floor = 8; floor < h - 4; floor += 9) {
          for (let col = -w / 2 + 4; col < w / 2 - 3; col += 7) {
            if (random() < 0.45) continue;
            const win = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 3), winMat);
            win.position.set(cx + col, floor, cz + d / 2 + 0.06);
            scene.add(win);
          }
        }
      }
      colliders.push({ x: cx, z: cz, hx: w / 2, hz: d / 2 });
      // Port blocks get stacked containers instead of a second building.
      if (district && district.name === 'Port' && random() < 0.6) {
        const contColor = pick(random, [0xb5533c, 0x3c6fb5, 0x4a8a4a, 0xc9a13c]);
        scene.add(box(10, 3, 3.4, contColor, cx + 14, 1.5, cz + 12));
        scene.add(box(10, 3, 3.4, contColor, cx + 14, 4.5, cz + 12));
        colliders.push({ x: cx + 14, z: cz + 12, hx: 5, hz: 1.7 });
      }
    }
  }

  // Palms along the Marina promenade.
  for (let z = -280; z <= 40; z += 28) {
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.5, 7, 6),
      new THREE.MeshLambertMaterial({ color: 0x6b4a2a }),
    );
    trunk.position.set(-288, 3.5, z);
    scene.add(trunk);
    const crown = new THREE.Mesh(
      new THREE.ConeGeometry(3.4, 3.2, 7),
      new THREE.MeshLambertMaterial({ color: 0x3f7a3a }),
    );
    crown.position.set(-288, 8.2, z);
    scene.add(crown);
  }

  // Street lamps at every other intersection, with a warm glow sphere.
  const lampMat = new THREE.MeshLambertMaterial({ color: 0x2c2f36 });
  const glowMat = new THREE.MeshBasicMaterial({ color: 0xffe1a0 });
  for (let x = -CITY.half; x <= CITY.half; x += CITY.roadStep * 2) {
    for (let z = -CITY.half; z <= CITY.half; z += CITY.roadStep * 2) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 6, 6), lampMat);
      pole.position.set(x + 9, 3, z + 9);
      scene.add(pole);
      const glow = new THREE.Mesh(new THREE.SphereGeometry(0.7, 8, 6), glowMat);
      glow.position.set(x + 9, 6.2, z + 9);
      scene.add(glow);
      lamps.push(glow);
    }
  }

  // The mission beacon: a tall golden pillar of light, moved by missions.js.
  const beacon = new THREE.Mesh(
    new THREE.CylinderGeometry(2.2, 2.2, 90, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xf2c94c, transparent: true, opacity: 0.35, side: THREE.DoubleSide }),
  );
  beacon.position.set(0, 45, 0);
  beacon.visible = false;
  scene.add(beacon);
  const beaconBase = new THREE.Mesh(
    new THREE.RingGeometry(3, 5, 24),
    new THREE.MeshBasicMaterial({ color: 0xf2c94c, transparent: true, opacity: 0.8, side: THREE.DoubleSide }),
  );
  beaconBase.rotation.x = -Math.PI / 2;
  beaconBase.position.set(0, 0.06, 0);
  beaconBase.visible = false;
  scene.add(beaconBase);

  return { colliders, roads, beacon, beaconBase, lamps };
}

export function isOnRoad(x, z) {
  const r = CITY.roadStep;
  const near = (v) => Math.abs(v - Math.round(v / r) * r) < CITY.roadHalfWidth + 3;
  return near(x) || near(z);
}

export function nearestRoadPoint(x, z) {
  const r = CITY.roadStep;
  const snap = (v) => Math.max(-CITY.half, Math.min(CITY.half, Math.round(v / r) * r));
  return Math.abs(x - snap(x)) < Math.abs(z - snap(z)) ? { x: snap(x), z } : { x, z: snap(z) };
}
