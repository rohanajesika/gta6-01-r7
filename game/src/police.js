// Solmar Bay police: patrol cars that cruise the road grid while the city
// is calm, then chase, ram and corner the player as the wanted level
// climbs. A car is either patrolling (following the grid, turning at
// intersections like traffic) or chasing (steering toward the player and
// driving faster the hotter the wanted level is). Cornered on foot at a
// high wanted level, the player gets busted.

import * as THREE from 'three';
import { CITY, MAX_POLICE_CARS, WANTED } from './config.js';
import { range } from './random.js';
import { makeCarMesh } from './vehicles.js';
import { isOnRoad, nearestRoadPoint } from './world.js';

const PATROL_BLUE = 0x3b6fd4;
const PATROL_COUNT = 2;

function buildPatrolCar(scene, x, z, heading) {
  const built = makeCarMesh(PATROL_BLUE, false);
  // Roof light bar: a red lamp on one side, blue on the other.
  const barBase = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 0.18, 0.5),
    new THREE.MeshLambertMaterial({ color: 0x22242a }),
  );
  barBase.position.set(0, 1.58, 0.1);
  built.group.add(barBase);
  const redLamp = new THREE.Mesh(
    new THREE.BoxGeometry(0.6, 0.22, 0.42),
    new THREE.MeshBasicMaterial({ color: 0xff2a2a }),
  );
  redLamp.position.set(-0.38, 1.7, 0.1);
  built.group.add(redLamp);
  const blueLamp = new THREE.Mesh(
    new THREE.BoxGeometry(0.6, 0.22, 0.42),
    new THREE.MeshBasicMaterial({ color: 0x2a6bff }),
  );
  blueLamp.position.set(0.38, 1.7, 0.1);
  built.group.add(blueLamp);
  built.group.position.set(x, 0, z);
  built.group.rotation.y = heading;
  scene.add(built.group);
  return {
    x, z, heading, speed: 0,
    mesh: built.group, wheels: built.wheels,
    redLamp, blueLamp,
    patrolSpeed: 9, patrolTurnAt: 0,
  };
}

function turnToward(current, target, maxTurn) {
  let diff = target - current;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  if (diff > maxTurn) return current + maxTurn;
  if (diff < -maxTurn) return current - maxTurn;
  return target;
}

export function createPolice(scene, random, colliders) {
  const cars = [];
  let playerX = 0;
  let playerZ = 20;
  let bustLeft = WANTED.bustSeconds;
  let spawnCooldown = 0;
  let flashTime = 0;

  function setPlayerPosition(x, z) {
    playerX = x;
    playerZ = z;
  }

  function spawn(x, z, targetX, targetZ) {
    const heading = Math.atan2(-(targetX - x), -(targetZ - z));
    if (cars.length >= MAX_POLICE_CARS) {
      // Full force: move the car furthest from the new spot instead.
      let far = cars[0];
      let farD = -1;
      for (const car of cars) {
        const d = Math.hypot(car.x - x, car.z - z);
        if (d > farD) {
          farD = d;
          far = car;
        }
      }
      far.x = x;
      far.z = z;
      far.heading = heading;
      far.speed = 0;
      far.mesh.position.set(x, 0, z);
      far.mesh.rotation.y = heading;
      return far;
    }
    const car = buildPatrolCar(scene, x, z, heading);
    cars.push(car);
    return car;
  }

  function spawnNearPlayer() {
    // Appear on a road some distance from the player, never on top of them.
    const angle = random() * Math.PI * 2;
    const distance = range(random, 70, 110);
    const spot = nearestRoadPoint(
      playerX + Math.cos(angle) * distance,
      playerZ + Math.sin(angle) * distance,
    );
    return spawn(spot.x, spot.z, playerX, playerZ);
  }

  function dropCar(car) {
    scene.remove(car.mesh);
    const index = cars.indexOf(car);
    if (index >= 0) cars.splice(index, 1);
  }

  function hitsBuilding(x, z, radius) {
    if (!colliders) return false;
    for (const c of colliders) {
      if (Math.abs(x - c.x) < c.hx + radius && Math.abs(z - c.z) < c.hz + radius) return true;
    }
    return false;
  }

  function rollForward(car, dt) {
    // Move along the heading, staying on the road grid: if the straight
    // step would leave the road, slide along one axis instead, and if
    // neither axis works, turn away at the next intersection.
    const fx = -Math.sin(car.heading);
    const fz = -Math.cos(car.heading);
    const step = car.speed * dt;
    const nx = car.x + fx * step;
    const nz = car.z + fz * step;
    if (!hitsBuilding(nx, nz, 1.6) && isOnRoad(nx, nz)) {
      car.x = nx;
      car.z = nz;
      return;
    }
    if (!hitsBuilding(nx, car.z, 1.6) && isOnRoad(nx, car.z)) {
      car.x = nx;
      return;
    }
    if (!hitsBuilding(car.x, nz, 1.6) && isOnRoad(car.x, nz)) {
      car.z = nz;
      return;
    }
    car.heading += Math.PI / 2;
  }

  function update(dt, player, wanted, onBusted, onRam) {
    flashTime += dt;
    const chasing = wanted > 0;
    const wantedCount = chasing
      ? Math.min(MAX_POLICE_CARS, 1 + wanted)
      : PATROL_COUNT;

    spawnCooldown -= dt;
    if (cars.length < wantedCount && spawnCooldown <= 0) {
      spawnNearPlayer();
      spawnCooldown = WANTED.policeSpawnDelay;
    }
    while (cars.length > wantedCount) {
      let far = cars[0];
      let farD = -1;
      for (const car of cars) {
        const d = Math.hypot(car.x - playerX, car.z - playerZ);
        if (d > farD) {
          farD = d;
          far = car;
        }
      }
      dropCar(far);
    }

    const topSpeed = chasing ? 16 + wanted * 4 : 12;
    for (const car of cars) {
      if (chasing) {
        const targetHeading = Math.atan2(-(player.x - car.x), -(player.z - car.z));
        car.heading = turnToward(car.heading, targetHeading, 3.0 * dt);
        car.speed += Math.max(-20 * dt, Math.min(14 * dt, topSpeed - car.speed));
      } else {
        // Patrol: cruise the grid, turning at intersections now and then.
        const onGridX = Math.abs(car.x - Math.round(car.x / CITY.roadStep) * CITY.roadStep) < 2;
        const onGridZ = Math.abs(car.z - Math.round(car.z / CITY.roadStep) * CITY.roadStep) < 2;
        if (onGridX && onGridZ && car.patrolTurnAt <= 0) {
          const roll = random();
          if (roll < 0.3) car.heading += Math.PI / 2;
          else if (roll < 0.6) car.heading -= Math.PI / 2;
          car.patrolTurnAt = 2;
        }
        car.patrolTurnAt -= dt;
        car.speed += Math.max(-14 * dt, Math.min(10 * dt, car.patrolSpeed - car.speed));
      }
      rollForward(car, dt);
      car.mesh.position.set(car.x, 0, car.z);
      car.mesh.rotation.y = car.heading;
      for (const wheel of car.wheels) wheel.rotation.x += car.speed * dt * 2;
      // Alternate the roof lamps so the bar flashes red, then blue.
      const redOn = Math.floor(flashTime * 4) % 2 === 0;
      car.redLamp.material.color.setHex(redOn ? 0xff2a2a : 0x551111);
      car.blueLamp.material.color.setHex(redOn ? 0x112255 : 0x2a6bff);
      // A chase car that reaches the player rams them.
      if (chasing && Math.hypot(car.x - player.x, car.z - player.z) < 3.6) {
        if (onRam) onRam(car);
      }
    }

    // Busted: at a high wanted level, slow and cornered means caught.
    let nearest = Infinity;
    for (const car of cars) {
      nearest = Math.min(nearest, Math.hypot(car.x - player.x, car.z - player.z));
    }
    const cornered = wanted >= 3 && nearest < WANTED.bustRange && Math.abs(player.speed || 0) < 4;
    if (cornered) {
      bustLeft -= dt;
      if (bustLeft <= 0) {
        bustLeft = WANTED.bustSeconds;
        if (onBusted) onBusted();
      }
    } else {
      bustLeft = WANTED.bustSeconds;
    }
    return bustLeft;
  }

  function nearestDistance(player) {
    let best = Infinity;
    for (const car of cars) {
      best = Math.min(best, Math.hypot(car.x - player.x, car.z - player.z));
    }
    return best;
  }

  return { cars, setPlayerPosition, update, nearestDistance, spawn };
}
