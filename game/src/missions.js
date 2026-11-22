// Madame Vela's three-job story chain. Each mission has steps with a map
// marker; reaching a marker (or, for the car jobs, arriving in the right
// vehicle) advances the step, pays the reward at the end and moves the
// beacon. Mission 3 starts the heat itself: wanted 3, and the player must
// reach the Hills hideout before the timer runs out.

import { MISSIONS } from './config.js';

export function createMissions(beacon, beaconBase, onComplete, onStep) {
  let index = 0;
  let step = 0;
  let done = false;
  let timer = 0;
  let active = true;

  function current() {
    return MISSIONS[index];
  }

  function currentStep() {
    const mission = current();
    return mission ? mission.steps[Math.min(step, mission.steps.length - 1)] : null;
  }

  function moveBeacon() {
    const target = currentStep();
    if (!target || !active) {
      beacon.visible = false;
      beaconBase.visible = false;
      return;
    }
    beacon.position.set(target.x, 45, target.z);
    beaconBase.position.set(target.x, 0.06, target.z);
    beacon.visible = true;
    beaconBase.visible = true;
  }

  function advance(player, vehicles) {
    const mission = current();
    if (!mission || !active) return;
    const target = mission.steps[step];
    const px = player.inCar && player.car ? player.car.x : player.x;
    const pz = player.inCar && player.car ? player.car.z : player.z;
    const dist = Math.hypot(px - target.x, pz - target.z);
    let reached = dist < 7;
    // Mission 2 step 1 only counts in the Sunset GT itself.
    if (index === 1 && step === 0) {
      reached = player.inCar && player.car === vehicles.sunsetGt && dist < 7;
    }
    // Mission 2 step 2 only counts while driving the GT.
    if (index === 1 && step === 1) {
      reached = player.inCar && player.car === vehicles.sunsetGt && dist < 8;
    }
    if (!reached) return;
    step += 1;
    if (onStep) onStep(mission, step);
    if (step >= mission.steps.length) {
      const reward = mission.reward;
      if (onComplete) onComplete(mission, reward);
      index += 1;
      step = 0;
      timer = 0;
      if (index >= MISSIONS.length) {
        done = true;
        active = false;
      } else if (index === 2) {
        // Mission 3 opens with the heat already on.
        timer = MISSIONS[2].timeLimit;
      }
    }
    moveBeacon();
  }

  function update(dt, player, vehicles, setWanted) {
    if (!active) return 'done';
    const mission = current();
    if (index === 2 && step === 0 && timer <= 0) {
      timer = mission.timeLimit;
      if (setWanted) setWanted(3);
    }
    if (index === 2) {
      timer -= dt;
      if (timer <= 0) {
        timer = mission.timeLimit;
        if (setWanted) setWanted(3);
        return 'timeout';
      }
    }
    advance(player, vehicles);
    return 'active';
  }

  function restore(missionIndex, missionStep) {
    if ((missionIndex | 0) >= MISSIONS.length) {
      // The story is finished: stay finished, never replay the last job.
      index = MISSIONS.length;
      step = 0;
      done = true;
      active = false;
      timer = 0;
    } else {
      index = Math.max(0, missionIndex | 0);
      step = Math.max(0, missionStep | 0);
      done = false;
      active = true;
      timer = index === 2 ? MISSIONS[2].timeLimit : 0;
    }
    moveBeacon();
  }

  moveBeacon();

  return {
    get index() { return index; },
    get step() { return step; },
    get done() { return done; },
    get timer() { return timer; },
    get active() { return active; },
    current, currentStep, update, restore, moveBeacon,
  };
}
