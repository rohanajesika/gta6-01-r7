// Combat: fists and the pistol. A punch knocks down the nearest pedestrian
// in reach; a shot fires toward the centre of the screen and hits the first
// pedestrian, police car or traffic car in a narrow cone ahead. Both raise
// the wanted level the first time they are used in a quiet moment, and both
// spend ammo or nothing at all — the pistol spends one round a shot.

import { PLAYER } from './config.js';

export function createCombat(onCrime) {
  let reloadTimer = 0;
  let muzzleTimer = 0;

  function punch(player, pedestrians) {
    const target = pedestrians.nearest(player.x, player.z, PLAYER.punchRange);
    if (!target) return false;
    pedestrians.knockDown(target);
    if (onCrime) onCrime(1, 'Assault on a local');
    return true;
  }

  function shoot(player, pedestrians, police, vehicles, camera) {
    if (player.ammo <= 0) return 'empty';
    if (reloadTimer > 0) return 'reloading';
    player.ammo -= 1;
    muzzleTimer = 0.12;
    // Fire along the camera's forward direction on the ground plane.
    const dirX = -Math.sin(player.heading);
    const dirZ = -Math.cos(player.heading);
    let best = null;
    let bestD = 70;
    for (const p of pedestrians.people) {
      if (p.down > 0) continue;
      const dx = p.x - player.x;
      const dz = p.z - player.z;
      const along = dx * dirX + dz * dirZ;
      const side = Math.abs(dx * dirZ - dz * dirX);
      if (along > 0 && along < bestD && side < 2.5) {
        bestD = along;
        best = { kind: 'ped', ref: p };
      }
    }
    for (const car of police.cars) {
      const dx = car.x - player.x;
      const dz = car.z - player.z;
      const along = dx * dirX + dz * dirZ;
      const side = Math.abs(dx * dirZ - dz * dirX);
      if (along > 0 && along < bestD && side < 3) {
        bestD = along;
        best = { kind: 'police', ref: car };
      }
    }
    for (const car of vehicles.cars) {
      if (car.parked || (player.inCar && player.car === car)) continue;
      const dx = car.x - player.x;
      const dz = car.z - player.z;
      const along = dx * dirX + dz * dirZ;
      const side = Math.abs(dx * dirZ - dz * dirX);
      if (along > 0 && along < bestD && side < 3) {
        bestD = along;
        best = { kind: 'car', ref: car };
      }
    }
    if (best) {
      if (best.kind === 'ped') pedestrians.knockDown(best.ref);
      if (best.kind === 'car') best.ref.aiSpeed = 0;
      if (best.kind === 'police') best.ref.speed *= 0.4;
    }
    if (onCrime) onCrime(1, 'Shots fired in public');
    return best ? 'hit' : 'miss';
  }

  function update(dt, player) {
    if (reloadTimer > 0) {
      reloadTimer -= dt;
      if (reloadTimer <= 0) {
        player.ammo = PLAYER.maxAmmo;
      }
    }
    if (muzzleTimer > 0) muzzleTimer -= dt;
  }

  function reload(player) {
    if (player.ammo >= PLAYER.maxAmmo || reloadTimer > 0) return false;
    reloadTimer = 1.2;
    return true;
  }

  return {
    punch, shoot, update, reload,
    get reloading() { return reloadTimer > 0; },
    get muzzle() { return muzzleTimer > 0; },
  };
}
