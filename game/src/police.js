// The police response to the wanted level. Patrol cars spawn on the roads
// near the player, chase with lights flashing, ram the player's car and, on
// foot, close in until the player is busted. No police spawn while wanted
// is zero; when the heat dies down they drive off and despawn.

import * as THREE from 'three';
import { CITY, MAX_POLICE_CARS, WANTED } from './config.js';
import { makeCarMesh } from './vehicles.js';
import { nearestRoadPoint } from './world.js';

export function createPolice(scene, random) {
  const cars = [];
  let spawnTimer = 0;
  let bustTimer = 0;

  function spawn(x, z, heading) {
    const mesh = makeCarMesh(0x1c1f26, false);
    mesh.group.position.set(x, 0, z);
    scene.add(mesh.group);
    // Light bar: two flashing boxes on the roof.
    const barMat = new THREE.MeshBasicMaterial({ color: 0x3b6fd4 });
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.18, 0.5), barMat);
    bar.position.set(0, 1.6, 0);
    mesh.group.add(bar);
    const bar2 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.5), new THREE.MeshBasicMaterial({ color: 0xe5534b }));
    bar2.position.set(0.75, 1.6, 0);
    mesh.group.add(bar2);
    const car = { x, z, heading, speed: 0, mesh: mesh.group, bar, bar2, wheels: mesh.wheels, siren: random() * 10 };
    cars.push(car);
    return car;
  }

  function update(dt, player, wanted, onBusted, onRam) {
    spawnTimer -= dt;
    const targetCount = wanted === 0 ? 0 : Math.min(MAX_POLICE_CARS, wanted);
    if (wanted > 0 && cars.length < targetCount && spawnTimer <= 0) {
      spawnTimer = WANTED.policeSpawnDelay;
      const angle = random() * Math.PI * 2;
      const spot = nearestRoadPoint(player.x + Math.cos(angle) * 70, player.z + Math.sin(angle) * 70);
      spawn(spot.x, spot.z, Math.atan2(-(player.x - spot.x), -(player.z - spot.z)));
    }
    const now = performance.now() / 1000;
    for (let i = cars.length - 1; i >= 0; i -= 1) {
      const car = cars[i];
      if (wanted === 0) {
        // Drive off: head away from the player and despawn at distance.
        const away = Math.atan2(-(player.x - car.x), -(player.z - car.z)) + Math.PI;
        car.heading = away;
        car.speed = Math.min(car.speed + 8 * dt, 16);
        car.x += -Math.sin(car.heading) * car.speed * dt;
        car.z += -Math.cos(car.heading) * car.speed * dt;
        if (Math.hypot(car.x - player.x, car.z - player.z) > 180) {
          scene.remove(car.mesh);
          cars.splice(i, 1);
        }
      } else {
        const dx = player.x - car.x;
        const dz = player.z - car.z;
        const dist = Math.hypot(dx, dz);
        const wantHeading = Math.atan2(-dx, -dz);
        let diff = wantHeading - car.heading;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        car.heading += Math.max(-2.4 * dt, Math.min(2.4 * dt, diff));
        const topSpeed = 30 + wanted * 2;
        car.speed = Math.min(car.speed + 14 * dt, topSpeed);
        car.x += -Math.sin(car.heading) * car.speed * dt;
        car.z += -Math.cos(car.heading) * car.speed * dt;
        if (dist < 3.2) {
          car.speed *= 0.5;
          if (onRam) onRam(car, dist);
        }
        // On foot and cornered: the bust timer runs.
        if (!player.inCar && dist < WANTED.bustRange && Math.abs(player.speed || 0) < 3) {
          bustTimer += dt;
          if (bustTimer >= WANTED.bustSeconds && onBusted) onBusted();
        } else {
          bustTimer = Math.max(0, bustTimer - dt * 2);
        }
      }
      car.mesh.position.set(car.x, 0, car.z);
      car.mesh.rotation.y = car.heading;
      const flash = Math.sin(now * 9 + car.siren) > 0;
      car.bar.material.color.setHex(flash ? 0x3b6fd4 : 0xe5534b);
      car.bar2.material.color.setHex(flash ? 0xe5534b : 0x3b6fd4);
      for (const wheel of car.wheels) wheel.rotation.x += car.speed * dt * 2;
    }
    return bustTimer;
  }

  function nearestDistance(player) {
    let best = Infinity;
    for (const car of cars) best = Math.min(best, Math.hypot(car.x - player.x, car.z - player.z));
    return best;
  }

  function forceSpawn(count) {
    for (let i = 0; i < count; i += 1) {
      const angle = (i / Math.max(1, count)) * Math.PI * 2 + 0.6;
      const spot = nearestRoadPoint(
        (typeof playerX === 'number' ? playerX : 0) + Math.cos(angle) * 45,
        (typeof playerZ === 'number' ? playerZ : 0) + Math.sin(angle) * 45,
      );
      spawn(spot.x, spot.z, 0);
    }
  }

  // forceSpawn needs the player's position: the caller sets it first.
  let playerX = 0;
  let playerZ = 0;
  function setPlayerPosition(x, z) {
    playerX = x;
    playerZ = z;
  }

  // Spawn one patrol car at an exact spot, facing the player: used to stage
  // the chase screenshot with the police visible ahead of the player's car.
  function spawnAt(x, z, targetX, targetZ) {
    const heading = Math.atan2(-(targetX - x), -(targetZ - z));
    return spawn(x, z, heading);
  }

  return { cars, update, nearestDistance, forceSpawn, setPlayerPosition, spawnAt };
}
