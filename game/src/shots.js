// The screenshot scenes behind ?shot=cover|city|chase|mission. Each one
// plays the real game forward from a fresh start for a fixed number of
// steps with scripted inputs, so the frame is what a short game really
// looks like and the same seed always gives the same frame.

import { STEP } from './config.js';

const IDLE_INPUT = { forward: 0, strafe: 0, run: false, actions: 0 };

function runSteps(game, seconds, input) {
  const steps = Math.round(seconds / STEP);
  for (let i = 0; i < steps; i += 1) game.step(STEP, input || IDLE_INPUT);
}

export function stageShot(name, game) {
  game.startGame();
  if (name === 'city') {
    // Rico driving the Sunset GT down the Downtown avenue, police trailing.
    game.setCameraDistance(8);
    game.teleportToCar(game.vehicles.sunsetGt);
    game.enterCar();
    runSteps(game, 1, { forward: 1, strafe: 0, run: false, actions: 0 });
    runSteps(game, 2.5, { forward: 1, strafe: 0, run: false, actions: 0 });
    return;
  }
  if (name === 'chase') {
    // Four stars, two patrol cars closing in head-on on Rico's stolen car.
    game.setCameraDistance(9);
    const bright = [0xc23b2e, 0x2e5fa3, 0xd8a13c, 0xe8e0cc, 0x2e8b6a];
    const stolen = game.vehicles.cars.find((c) => !c.parked && bright.includes(c.color)) || game.vehicles.cars[0];
    game.teleportToCar(stolen);
    game.enterCar();
    game.addCrime(3, 'Stolen car spotted');
    runSteps(game, 0.5, IDLE_INPUT);
    const fx = -Math.sin(stolen.heading);
    const fz = -Math.cos(stolen.heading);
    game.police.spawnAt(stolen.x + fx * 55, stolen.z + fz * 55, stolen.x, stolen.z);
    game.police.spawnAt(stolen.x + fx * 42 - fz * 6, stolen.z + fz * 42 + fx * 6, stolen.x, stolen.z);
    runSteps(game, 2, { forward: 1, strafe: 0, run: false, actions: 0 });
    runSteps(game, 1.2, IDLE_INPUT);
    return;
  }
  if (name === 'mission') {
    // Mission 1 in progress: Rico on foot near the Marina kiosk marker.
    game.setCameraDistance(9);
    game.teleportPlayer(-180, -156, 0);
    runSteps(game, 6, IDLE_INPUT);
    return;
  }
  // cover: Rico on foot at the Downtown plaza, city and HUD in view.
  game.setCameraDistance(8);
  game.teleportPlayer(0, 60, Math.PI);
  runSteps(game, 8, IDLE_INPUT);
}
