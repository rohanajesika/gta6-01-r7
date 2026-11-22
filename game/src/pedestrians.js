// Pedestrians: Solmar Bay locals who stroll the sidewalks, cross at the
// intersections and run away from gunfire or a speeding car. Each one is a
// small box figure with a coloured shirt; a knocked-down pedestrian stays
// down for a while, then gets up and walks off.

import * as THREE from 'three';
import { CITY, PEDESTRIAN_COUNT } from './config.js';
import { pick, range } from './random.js';

const SHIRTS = [0xe8e0cc, 0x2e5fa3, 0xc23b2e, 0x2e8b6a, 0xd8a13c, 0x7a4a9e, 0x4a4f58];

export function createPedestrians(scene, random, colliders) {
  const people = [];

  function makePerson(x, z) {
    const group = new THREE.Group();
    const shirt = new THREE.MeshLambertMaterial({ color: pick(random, SHIRTS) });
    const skin = new THREE.MeshLambertMaterial({ color: 0xd9a066 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.9, 0.4), shirt);
    body.position.y = 1.05;
    group.add(body);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.42), skin);
    head.position.y = 1.72;
    group.add(head);
    const legs = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.35), new THREE.MeshLambertMaterial({ color: 0x2c2f36 }));
    legs.position.y = 0.3;
    group.add(legs);
    group.position.set(x, 0, z);
    scene.add(group);
    return group;
  }

  function randomSidewalkSpot() {
    const road = Math.floor(range(random, -5, 6)) * CITY.roadStep;
    const along = range(random, -CITY.half + 10, CITY.half - 10);
    return random() < 0.5 ? { x: road + 10, z: along } : { x: along, z: road + 10 };
  }

  for (let i = 0; i < PEDESTRIAN_COUNT; i += 1) {
    const spot = randomSidewalkSpot();
    const heading = pick(random, [0, Math.PI / 2, Math.PI, -Math.PI / 2]);
    people.push({
      x: spot.x, z: spot.z, heading,
      speed: range(random, 1.2, 2.2),
      mesh: makePerson(spot.x, spot.z),
      down: 0, flee: 0, turnAt: range(random, 2, 8),
    });
  }

  function update(dt, player, gunshotAt) {
    for (const p of people) {
      if (p.down > 0) {
        p.down -= dt;
        p.mesh.rotation.x = p.down > 0 ? -Math.PI / 2 : 0;
        if (p.down <= 0) p.mesh.rotation.x = 0;
        continue;
      }
      // Flee from gunfire, or from a car bearing down on them.
      let fleeing = p.flee > 0;
      if (gunshotAt && Math.hypot(p.x - gunshotAt.x, p.z - gunshotAt.z) < 30) fleeing = true;
      if (player && player.inCar && player.car) {
        const d = Math.hypot(p.x - player.car.x, p.z - player.car.z);
        if (d < 8 && Math.abs(player.car.speed) > 6) fleeing = true;
      }
      if (fleeing) {
        p.flee = 1.5;
        const away = Math.atan2(-(p.x - (player ? player.x : p.x)), -(p.z - (player ? player.z : p.z)));
        p.heading = away;
      } else {
        p.flee -= dt;
      }
      p.turnAt -= dt;
      if (p.turnAt <= 0) {
        const nearRoadX = Math.abs(p.x - Math.round(p.x / CITY.roadStep) * CITY.roadStep) < 12;
        const nearRoadZ = Math.abs(p.z - Math.round(p.z / CITY.roadStep) * CITY.roadStep) < 12;
        if (nearRoadX || nearRoadZ) {
          p.heading = pick(random, [0, Math.PI / 2, Math.PI, -Math.PI / 2]);
        }
        p.turnAt = range(random, 3, 9);
      }
      const speed = fleeing ? 5.5 : p.speed;
      const nx = p.x - Math.sin(p.heading) * speed * dt;
      const nz = p.z - Math.cos(p.heading) * speed * dt;
      const hitBuilding = colliders.some((c) => Math.abs(nx - c.x) < c.hx + 0.5 && Math.abs(nz - c.z) < c.hz + 0.5);
      if (!hitBuilding && Math.abs(nx) < CITY.half + 10 && Math.abs(nz) < CITY.half + 10) {
        p.x = nx;
        p.z = nz;
      } else {
        p.heading += Math.PI / 2;
      }
      p.mesh.position.set(p.x, Math.sin(performance.now() / 180 + p.x) * 0.03, p.z);
      p.mesh.rotation.y = p.heading;
    }
  }

  function nearest(x, z, maxDistance) {
    let best = null;
    let bestD = maxDistance;
    for (const p of people) {
      if (p.down > 0) continue;
      const d = Math.hypot(p.x - x, p.z - z);
      if (d < bestD) {
        bestD = d;
        best = p;
      }
    }
    return best;
  }

  function knockDown(person) {
    person.down = 6;
    person.mesh.rotation.x = -Math.PI / 2;
  }

  return { people, update, nearest, knockDown };
}
