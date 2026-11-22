// Solmar Bay — boot and the one loop. Input is read every frame, the world
// advances in fixed 1/60 s steps, and the renderer paints what is there.
// Screens: start, play, paused, game over. ?seed=N fixes the city;
// ?shot=cover|city|chase|mission (with &seed=N) stages that scene instead
// of running the loop, paints it twice and sets window.__shotReady.

import * as THREE from 'three';
import { CITY, MISSIONS, PLAYER, SAVE_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { buildCity } from './world.js';
import { createVehicles } from './vehicles.js';
import { createPedestrians } from './pedestrians.js';
import { createPolice } from './police.js';
import { createMissions } from './missions.js';
import { createCombat } from './combat.js';
import { createAudio } from './audio.js';
import { createHud } from './hud.js';
import { ACTION_INTERACT, ACTION_PAUSE, ACTION_PUNCH, ACTION_RELOAD, ACTION_SHOOT, createInput } from './input.js';
import { stageShot } from './shots.js';

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);
const rng = createRandom(seed);

const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 900);

const city = buildCity(scene, rng);
const audio = createAudio();
const hud = createHud(document);

const player = {
  x: 0, z: 20, heading: 0, speed: 0,
  health: PLAYER.maxHealth, cash: PLAYER.startCash, ammo: PLAYER.startAmmo,
  inCar: false, car: null, mesh: null, walkPhase: 0,
};

function makePlayerMesh() {
  const group = new THREE.Group();
  const shirt = new THREE.MeshLambertMaterial({ color: 0x2e8b6a });
  const skin = new THREE.MeshLambertMaterial({ color: 0xd9a066 });
  const jeans = new THREE.MeshLambertMaterial({ color: 0x2c3a55 });
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.85, 0.42), shirt);
  torso.position.y = 1.15;
  group.add(torso);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.44, 0.44), skin);
  head.position.y = 1.82;
  group.add(head);
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.7, 0.32), jeans);
  legL.position.set(-0.18, 0.35, 0);
  group.add(legL);
  const legR = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.7, 0.32), jeans);
  legR.position.set(0.18, 0.35, 0);
  group.add(legR);
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.7, 0.2), shirt);
  armL.position.set(-0.48, 1.15, 0);
  group.add(armL);
  const armR = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.7, 0.2), shirt);
  armR.position.set(0.48, 1.15, 0);
  group.add(armR);
  group.position.set(player.x, 0, player.z);
  scene.add(group);
  player.mesh = group;
  player.legL = legL;
  player.legR = legR;
  player.armL = armL;
  player.armR = armR;
}
makePlayerMesh();

const game = {
  scene, camera, renderer, rng, time: 0, started: false, paused: false,
  over: false, overReason: '', wanted: 0, wantedTimer: 0, crimeFlash: 0,
  player, city, seed,
};
game.wanted = 0;

function addCrime(level, reason) {
  game.wanted = Math.min(5, game.wanted + level);
  game.wantedTimer = 0;
  if (reason) hud.showMessage(reason, 2.5);
}
game.addCrime = addCrime;

const vehicles = createVehicles(scene, rng, city.colliders, (car, wasParked) => {
  if (!wasParked) addCrime(1, 'You stole a moving car!');
  else addCrime(1, 'Car stolen — someone saw you');
});
game.vehicles = vehicles;

const pedestrians = createPedestrians(scene, rng, city.colliders);
game.pedestrians = pedestrians;

const police = createPolice(scene, rng);
game.police = police;

const missions = createMissions(
  city.beacon, city.beaconBase,
  (mission, reward) => {
    player.cash += reward;
    hud.showMessage(`${mission.title} complete — +$${reward}`, 4);
    audio.chime();
    saveGame();
    if (missions.index >= MISSIONS.length) hud.showMessage('All jobs done — Solmar Bay is yours, Rico!', 6);
  },
  () => audio.chime(),
);
game.missions = missions;

const combat = createCombat((level, reason) => addCrime(level, reason));
game.combat = combat;

const input = createInput(canvas);
game.input = input;

let camYaw = player.heading;
let camDistance = 10;
game.setCameraDistance = (d) => { camDistance = d; };
let ramCooldown = 0;
let gunshotAt = null;

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
window.addEventListener('wheel', (event) => {
  camDistance = Math.max(6, Math.min(16, camDistance + event.deltaY * 0.01));
}, { passive: true });

function collidesAt(x, z, radius) {
  for (const c of city.colliders) {
    if (Math.abs(x - c.x) < c.hx + radius && Math.abs(z - c.z) < c.hz + radius) return true;
  }
  return false;
}

function movePlayer(dx, dz) {
  const nx = player.x + dx;
  const nz = player.z + dz;
  if (!collidesAt(nx, player.z, PLAYER.radius)) player.x = nx;
  if (!collidesAt(player.x, nz, PLAYER.radius)) player.z = nz;
  player.x = Math.max(-CITY.half - 30, Math.min(CITY.half + 10, player.x));
  player.z = Math.max(-CITY.half - 10, Math.min(CITY.half + 10, player.z));
}

function enterCar() {
  const car = vehicles.nearestAnyCar(player.x, player.z, 4.5);
  if (!car) return false;
  if (car === player.car) return false;
  vehicles.steal(car, player);
  player.inCar = true;
  player.car = car;
  player.mesh.visible = false;
  audio.unlock();
  return true;
}
game.enterCar = enterCar;

function exitCar() {
  if (!player.inCar || !player.car) return;
  const car = player.car;
  const sideX = car.x + Math.cos(car.heading) * 2.6;
  const sideZ = car.z - Math.sin(car.heading) * 2.6;
  player.x = sideX;
  player.z = sideZ;
  player.heading = car.heading;
  player.inCar = false;
  player.car = null;
  player.mesh.visible = true;
  player.mesh.position.set(player.x, 0, player.z);
}
game.exitCar = exitCar;

game.teleportPlayer = (x, z, heading) => {
  if (player.inCar) exitCar();
  player.x = x;
  player.z = z;
  if (heading !== undefined) player.heading = heading;
  camYaw = player.heading;
  player.mesh.position.set(x, 0, z);
};

game.teleportToCar = (car) => {
  if (player.inCar) exitCar();
  player.x = car.x + 2;
  player.z = car.z + 2;
  player.heading = car.heading;
  player.mesh.position.set(player.x, 0, player.z);
};

function saveGame() {
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify({
      cash: player.cash, health: player.health, ammo: player.ammo,
      mission: missions.index, step: missions.step, x: player.x, z: player.z,
    }));
  } catch { /* storage can be off; the game still plays */ }
}
game.saveGame = saveGame;

function loadSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function applySave(save) {
  player.cash = save.cash ?? PLAYER.startCash;
  player.health = save.health ?? PLAYER.maxHealth;
  player.ammo = save.ammo ?? PLAYER.startAmmo;
  missions.restore(save.mission ?? 0, save.step ?? 0);
  game.teleportPlayer(save.x ?? 0, save.z ?? 20, 0);
  if (missions.index === 2) addCrime(3, 'The heat is on — reach the Hills hideout');
}

function show(id, visible) {
  document.getElementById(id).classList.toggle('hidden', !visible);
}

function startGame(useSave) {
  const save = useSave ? loadSave() : null;
  game.started = true;
  game.paused = false;
  game.over = false;
  show('start-screen', false);
  show('pause-menu', false);
  show('game-over', false);
  show('hud', true);
  if (save) applySave(save);
  audio.unlock();
  audio.startMusic();
}
game.startGame = startGame;

function gameOver(reason) {
  if (game.over) return;
  game.over = true;
  game.overReason = reason;
  document.getElementById('game-over-title').textContent = reason.includes('Busted') ? 'BUSTED' : 'WASTED';
  document.getElementById('game-over-text').textContent = reason;
  show('game-over', true);
  show('hud', false);
  saveGame();
}

function updateCamera(dt) {
  const targetX = player.inCar && player.car ? player.car.x : player.x;
  const targetZ = player.inCar && player.car ? player.car.z : player.z;
  const targetHeading = player.inCar && player.car ? player.car.heading : player.heading;
  let diff = targetHeading - camYaw;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  camYaw += diff * Math.min(1, dt * 3);
  const backX = Math.sin(camYaw) * camDistance;
  const backZ = Math.cos(camYaw) * camDistance;
  camera.position.set(targetX + backX, 5.2, targetZ + backZ);
  camera.lookAt(targetX, 1.6, targetZ);
}

function step(dt, inputState) {
  if (!game.started || game.paused || game.over) return;
  game.time += dt;
  const drag = inputState === undefined ? input.takeDrag() : 0;
  if (drag) {
    camYaw -= drag * 0.005;
    player.heading = camYaw;
  }
  const forward = inputState === undefined ? input.forward() : inputState.forward;
  const strafe = inputState === undefined ? input.strafe() : inputState.strafe;
  const running = inputState === undefined ? input.run() : inputState.run;
  const actions = inputState === undefined ? input.takeActions() : inputState.actions;

  if (actions & ACTION_PAUSE) {
    game.paused = true;
    show('pause-menu', true);
    return;
  }
  if (actions & ACTION_INTERACT) {
    if (player.inCar) exitCar();
    else if (!enterCar()) {
      // Interact at a mission marker on foot also counts as arriving.
      missions.update(0, player, vehicles, (n) => addCrime(n, ''));
    }
  }
  if (actions & ACTION_PUNCH && !player.inCar) {
    if (combat.punch(player, pedestrians)) audio.punch();
    else audio.denied();
  }
  if (actions & ACTION_RELOAD && !player.inCar) combat.reload(player);
  if ((actions & ACTION_SHOOT) && !player.inCar) {
    const result = combat.shoot(player, pedestrians, police, vehicles, camera);
    if (result === 'hit' || result === 'miss') {
      audio.shot();
      gunshotAt = { x: player.x, z: player.z };
    } else if (result === 'empty') {
      audio.denied();
      hud.showMessage('Out of ammo — press R to reload', 2);
    }
  }

  // Movement.
  if (player.inCar && player.car) {
    const steer = strafe;
    vehicles.drive(player.car, forward, steer, dt);
    player.x = player.car.x;
    player.z = player.car.z;
    player.speed = player.car.speed;
    player.heading = player.car.heading;
  } else {
    const speed = running ? PLAYER.runSpeed : PLAYER.walkSpeed;
    const fx = -Math.sin(player.heading);
    const fz = -Math.cos(player.heading);
    const rx = -fz;
    const rz = fx;
    const mx = fx * forward + rx * strafe;
    const mz = fz * forward + rz * strafe;
    const len = Math.hypot(mx, mz);
    if (len > 0) {
      movePlayer((mx / len) * speed * dt, (mz / len) * speed * dt);
      player.speed = speed;
      player.walkPhase += dt * speed * 1.6;
      player.heading = camYaw;
      if (forward < 0) player.heading = camYaw + Math.PI;
    } else {
      player.speed = 0;
    }
    player.mesh.position.set(player.x, Math.abs(Math.sin(player.walkPhase)) * 0.06, player.z);
    player.mesh.rotation.y = player.heading;
    player.legL.rotation.x = Math.sin(player.walkPhase) * 0.5 * (player.speed > 0 ? 1 : 0);
    player.legR.rotation.x = -Math.sin(player.walkPhase) * 0.5 * (player.speed > 0 ? 1 : 0);
    player.armL.rotation.x = -Math.sin(player.walkPhase) * 0.4 * (player.speed > 0 ? 1 : 0);
    player.armR.rotation.x = Math.sin(player.walkPhase) * 0.4 * (player.speed > 0 ? 1 : 0);
  }

  vehicles.updateTraffic(dt, player);
  pedestrians.update(dt, player, gunshotAt);
  gunshotAt = null;
  police.setPlayerPosition(player.x, player.z);
  const bustTimer = police.update(dt, player, game.wanted, () => gameOver('Busted by the Solmar Bay police — Madame Vela will bail you out.'), (car) => {
    if (ramCooldown <= 0) {
      ramCooldown = 0.8;
      player.health -= 4;
      if (player.inCar && player.car) player.car.speed *= 0.5;
      if (player.health <= 0) gameOver('Wasted — the Solmar Bay police impounded your ride.');
    }
  });
  ramCooldown = Math.max(0, ramCooldown - dt);
  combat.update(dt, player);

  // Wanted decay: lay low, out of sight, and the heat cools off.
  if (game.wanted > 0) {
    game.wantedTimer += dt;
    const nearestCop = police.nearestDistance(player);
    if (game.wantedTimer > 25 && nearestCop > 60) {
      game.wanted -= 1;
      game.wantedTimer = 0;
      if (game.wanted === 0) hud.showMessage('You lost the heat.', 2.5);
    }
  }
  // Mission 3 keeps the heat on until the hideout is reached.
  if (missions.index === 2 && missions.active && game.wanted === 0) {
    addCrime(3, 'The heat is on — reach the Hills hideout');
  }
  // Health slowly recovers when nobody is chasing.
  if (game.wanted === 0 && player.health < PLAYER.maxHealth) {
    player.health = Math.min(PLAYER.maxHealth, player.health + 2 * dt);
  }
  const missionState = missions.update(dt, player, vehicles, (n) => addCrime(n, ''));
  if (missionState === 'timeout') {
    hud.showMessage('Too slow — Vela reset the clock. The heat is back on.', 4);
  }

  audio.update(player.inCar && player.car ? player.car.speed : player.speed, game.wanted, game.time);
  updateCamera(dt);
  hud.update(game, dt);
}
game.step = step;

// Buttons.
document.getElementById('btn-start').addEventListener('click', () => startGame(false));
document.getElementById('btn-continue').addEventListener('click', () => startGame(true));
document.getElementById('btn-resume').addEventListener('click', () => {
  game.paused = false;
  show('pause-menu', false);
});
document.getElementById('btn-save').addEventListener('click', () => {
  saveGame();
  hud.showMessage('Progress saved.', 2);
});
document.getElementById('btn-restart').addEventListener('click', () => {
  window.location.reload();
});
document.getElementById('btn-retry').addEventListener('click', () => {
  window.location.reload();
});
if (loadSave()) show('btn-continue', true);

window.__game = game;

if (shot) {
  // Screenshot mode: stage the scene, paint it twice, flag readiness.
  show('start-screen', false);
  show('hud', true);
  stageShot(shot, game);
  let painted = 0;
  function paintShot() {
    updateCamera(0.016);
    hud.update(game, 0.016);
    renderer.render(scene, camera);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paintShot);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paintShot);
} else {
  let last = performance.now();
  let accumulator = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, 0.25);
    last = now;
    while (accumulator >= STEP && !game.paused && !game.over) {
      step(STEP);
      accumulator -= STEP;
    }
    if (game.started && !game.paused && !game.over) {
      if (input.takeActions() & ACTION_PAUSE) {
        game.paused = true;
        show('pause-menu', true);
      }
    }
    if (!game.started) {
      // The start screen shows the city alive behind it.
      game.time += 1 / 60;
      vehicles.updateTraffic(1 / 60, player);
      pedestrians.update(1 / 60, player, null);
      updateCamera(1 / 60);
    }
    renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);
}
