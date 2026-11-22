// Cars: a box-built car factory, the traffic that drives the road grid, the
// parked cars (including the orange Sunset GT of mission 2), and the player's
// driving — accelerate, brake, reverse and steer, with simple collision
// against buildings and other cars.

import * as THREE from 'three';
import { CAR, CITY, TRAFFIC_COUNT } from './config.js';
import { pick, range } from './random.js';

const PAINT = [0xc23b2e, 0x2e5fa3, 0xe8e0cc, 0x3a3f46, 0x7a4a9e, 0x2e8b6a, 0xd8a13c, 0x8a8f96];
const WHEEL_COLOR = 0x16181c;

export function makeCarMesh(color, sport) {
  const group = new THREE.Group();
  const paint = new THREE.MeshLambertMaterial({ color });
  const glass = new THREE.MeshLambertMaterial({ color: 0x1c2836 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2, 0.75, sport ? 4.6 : 4.2), paint);
  body.position.y = 0.55;
  group.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.65, sport ? 2.1 : 2.3), glass);
  cabin.position.set(0, 1.2, sport ? -0.2 : 0.1);
  group.add(cabin);
  const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.3, 10);
  wheelGeo.rotateZ(Math.PI / 2);
  const wheelMat = new THREE.MeshLambertMaterial({ color: WHEEL_COLOR });
  const wheelPos = [[-0.95, 1.35], [0.95, 1.35], [-0.95, -1.35], [0.95, -1.35]];
  const wheels = [];
  for (const [wx, wz] of wheelPos) {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.position.set(wx, 0.38, wz);
    group.add(wheel);
    wheels.push(wheel);
  }
  const lightMat = new THREE.MeshBasicMaterial({ color: 0xfff2b0 });
  for (const lx of [-0.6, 0.6]) {
    const light = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.18, 0.1), lightMat);
    light.position.set(lx, 0.62, sport ? -2.32 : -2.12);
    group.add(light);
  }
  return { group, wheels };
}

function collides(colliders, x, z, radius) {
  for (const c of colliders) {
    if (Math.abs(x - c.x) < c.hx + radius && Math.abs(z - c.z) < c.hz + radius) return true;
  }
  return false;
}

export function createVehicles(scene, random, colliders, onSteal) {
  const cars = [];
  const parked = [];

  function addCar(x, z, heading, color, sport, parkedSpot) {
    const mesh = makeCarMesh(color, sport);
    mesh.group.position.set(x, 0, z);
    mesh.group.rotation.y = heading;
    scene.add(mesh.group);
    const car = {
      x, z, heading, speed: 0, color, sport, parked: parkedSpot,
      mesh: mesh.group, wheels: mesh.wheels,
      aiSpeed: range(random, 8, 13), aiHeading: heading, aiTurnAt: 0,
      brakeLight: false,
    };
    cars.push(car);
    return car;
  }

  // Traffic: each car starts on a road, driving along it.
  const roads = [];
  for (let c = -CITY.half; c <= CITY.half; c += CITY.roadStep) roads.push(c);
  for (let i = 0; i < TRAFFIC_COUNT; i += 1) {
    const along = pick(random, roads);
    const across = range(random, -CITY.half + 20, CITY.half - 20);
    const vertical = random() < 0.5;
    const heading = vertical ? (random() < 0.5 ? 0 : Math.PI) : (random() < 0.5 ? Math.PI / 2 : -Math.PI / 2);
    addCar(vertical ? along + 3 : across, vertical ? across : along + 3, heading, pick(random, PAINT), false, false);
  }

  // Parked cars along the avenues, plus the mission cars.
  const parkedSpots = [
    { x: -2, z: 8, color: 0x2e5fa3, sport: false },
    { x: 58, z: -58, color: 0xe8e0cc, sport: false },
    { x: -58, z: 62, color: 0x3a3f46, sport: false },
    { x: 122, z: 58, color: 0x7a4a9e, sport: false },
    { x: -122, z: -118, color: 0x2e8b6a, sport: false },
    { x: 182, z: 122, color: 0xc23b2e, sport: false },
  ];
  for (const spot of parkedSpots) {
    const car = addCar(spot.x, spot.z, Math.PI / 2, spot.color, spot.sport, true);
    parked.push(car);
  }
  const sunsetGt = addCar(30, -57, Math.PI / 2, 0xff6a1a, true, true);
  parked.push(sunsetGt);

  function carAhead(car, distance) {
    const fx = -Math.sin(car.heading);
    const fz = -Math.cos(car.heading);
    for (const other of cars) {
      if (other === car || other.parked) continue;
      const dx = other.x - car.x;
      const dz = other.z - car.z;
      const along = dx * fx + dz * fz;
      const side = Math.abs(dx * fz - dz * fx);
      if (along > 0 && along < distance && side < 2.4) return true;
    }
    return false;
  }

  function updateTraffic(dt, player) {
    for (const car of cars) {
      if (car.parked) continue;
      if (player && player.inCar && player.car === car) continue;
      // At an intersection, sometimes turn left or right.
      const onGridX = Math.abs(car.x - Math.round(car.x / CITY.roadStep) * CITY.roadStep) < 2;
      const onGridZ = Math.abs(car.z - Math.round(car.z / CITY.roadStep) * CITY.roadStep) < 2;
      if (onGridX && onGridZ && car.aiTurnAt <= 0) {
        const roll = random();
        if (roll < 0.25) car.aiHeading += Math.PI / 2;
        else if (roll < 0.5) car.aiHeading -= Math.PI / 2;
        car.aiTurnAt = 1.5;
      }
      car.aiTurnAt -= dt;
      let target = car.aiSpeed;
      if (carAhead(car, 12)) target = 0;
      car.speed += Math.max(-18 * dt, Math.min(10 * dt, target - car.speed));
      const fx = -Math.sin(car.aiHeading);
      const fz = -Math.cos(car.aiHeading);
      const nx = car.x + fx * car.speed * dt;
      const nz = car.z + fz * car.speed * dt;
      if (!collides(colliders, nx, nz, CAR.radius) && Math.abs(nx) < CITY.half + 20 && Math.abs(nz) < CITY.half + 20) {
        car.x = nx;
        car.z = nz;
      } else {
        car.aiHeading += Math.PI / 2;
      }
      car.heading = car.aiHeading;
      car.mesh.position.set(car.x, 0, car.z);
      car.mesh.rotation.y = car.heading;
      for (const wheel of car.wheels) wheel.rotation.x += car.speed * dt * 2;
    }
  }

  function drive(car, throttle, steer, dt) {
    if (throttle > 0) car.speed += CAR.accel * dt;
    else if (throttle < 0) {
      car.speed += car.speed > 0.5 ? -CAR.brake * dt : -CAR.reverseAccel * dt;
    } else {
      car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 8 * dt);
    }
    car.speed = Math.max(-CAR.maxReverse, Math.min(CAR.maxSpeed, car.speed));
    car.heading += steer * CAR.turnRate * dt * Math.sign(car.speed) * Math.min(1, Math.abs(car.speed) / 6);
    const fx = -Math.sin(car.heading);
    const fz = -Math.cos(car.heading);
    const nx = car.x + fx * car.speed * dt;
    const nz = car.z + fz * car.speed * dt;
    if (!collides(colliders, nx, nz, CAR.radius)) {
      car.x = nx;
      car.z = nz;
    } else {
      car.speed *= 0.4;
    }
    car.mesh.position.set(car.x, 0, car.z);
    car.mesh.rotation.y = car.heading;
    for (const wheel of car.wheels) wheel.rotation.x += car.speed * dt * 2;
  }

  function nearestCar(x, z, maxDistance, onlyParked) {
    let best = null;
    let bestD = maxDistance;
    for (const car of cars) {
      if (onlyParked && !car.parked) continue;
      if (!onlyParked && car.parked) continue;
      const d = Math.hypot(car.x - x, car.z - z);
      if (d < bestD) {
        bestD = d;
        best = car;
      }
    }
    return best;
  }

  function nearestAnyCar(x, z, maxDistance) {
    let best = null;
    let bestD = maxDistance;
    for (const car of cars) {
      const d = Math.hypot(car.x - x, car.z - z);
      if (d < bestD) {
        bestD = d;
        best = car;
      }
    }
    return best;
  }

  function steal(car, player) {
    const wasParked = car.parked;
    car.parked = false;
    car.aiSpeed = 0;
    if (onSteal) onSteal(car, wasParked, player);
    return car;
  }

  return {
    cars, parked, sunsetGt,
    updateTraffic, drive, nearestCar, nearestAnyCar, steal,
  };
}
