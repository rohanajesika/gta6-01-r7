// The HUD: cash, health, wanted stars, the current mission and its distance,
// the district name, a message banner, and a live minimap drawn on a small
// 2D canvas — roads, the player, police, traffic and the mission marker.

import { CITY, districtAt } from './config.js';

export function createHud(document) {
  const cashEl = document.getElementById('hud-cash');
  const healthFill = document.getElementById('hud-health-fill');
  const starsEl = document.getElementById('hud-stars');
  const missionTitle = document.getElementById('hud-mission-title');
  const missionText = document.getElementById('hud-mission-text');
  const districtEl = document.getElementById('hud-district');
  const messageEl = document.getElementById('hud-message');
  const ammoEl = document.getElementById('hud-ammo');
  const speedEl = document.getElementById('hud-speed');
  const minimap = document.getElementById('minimap');
  const mapCtx = minimap.getContext('2d');
  let messageTimer = 0;
  let lastCash = -1;
  let lastWanted = -1;

  function showMessage(text, seconds) {
    messageEl.textContent = text;
    messageEl.classList.remove('hidden');
    messageTimer = seconds || 3;
  }

  function hideMessage() {
    messageEl.classList.add('hidden');
    messageTimer = 0;
  }

  function drawMinimap(game) {
    const size = 180;
    const scale = size / (CITY.half * 2 + 40);
    const toMap = (x, z) => [(x + CITY.half + 20) * scale, (z + CITY.half + 20) * scale];
    mapCtx.fillStyle = '#20242e';
    mapCtx.fillRect(0, 0, size, size);
    mapCtx.strokeStyle = '#5a6068';
    mapCtx.lineWidth = 2;
    for (let c = -CITY.half; c <= CITY.half; c += CITY.roadStep) {
      const [ax, ay] = toMap(c, -CITY.half);
      const [bx, by] = toMap(c, CITY.half);
      mapCtx.beginPath();
      mapCtx.moveTo(ax, ay);
      mapCtx.lineTo(bx, by);
      mapCtx.stroke();
      const [cx, cy] = toMap(-CITY.half, c);
      const [dx, dy] = toMap(CITY.half, c);
      mapCtx.beginPath();
      mapCtx.moveTo(cx, cy);
      mapCtx.lineTo(dx, dy);
      mapCtx.stroke();
    }
    // Water at the west edge.
    mapCtx.fillStyle = '#2e6f8e';
    mapCtx.fillRect(0, 0, 12, size);
    // Mission marker.
    const step = game.missions.currentStep();
    if (step && game.missions.active) {
      const [mx, my] = toMap(step.x, step.z);
      mapCtx.fillStyle = '#f2c94c';
      mapCtx.beginPath();
      mapCtx.arc(mx, my, 5, 0, Math.PI * 2);
      mapCtx.fill();
    }
    // Police as blue dots, traffic as grey dots.
    for (const car of game.police.cars) {
      const [px, py] = toMap(car.x, car.z);
      mapCtx.fillStyle = '#5a9cf2';
      mapCtx.fillRect(px - 2, py - 2, 4, 4);
    }
    for (const car of game.vehicles.cars) {
      if (car.parked) continue;
      const [px, py] = toMap(car.x, car.z);
      mapCtx.fillStyle = '#8b93a3';
      mapCtx.fillRect(px - 1, py - 1, 2, 2);
    }
    // The player, a white arrow pointing where they face.
    const px = game.player.inCar && game.player.car ? game.player.car.x : game.player.x;
    const pz = game.player.inCar && game.player.car ? game.player.car.z : game.player.z;
    const [mx, my] = toMap(px, pz);
    const heading = game.player.inCar && game.player.car ? game.player.car.heading : game.player.heading;
    mapCtx.save();
    mapCtx.translate(mx, my);
    mapCtx.rotate(-heading);
    mapCtx.fillStyle = '#ffffff';
    mapCtx.beginPath();
    mapCtx.moveTo(0, -6);
    mapCtx.lineTo(4, 5);
    mapCtx.lineTo(-4, 5);
    mapCtx.closePath();
    mapCtx.fill();
    mapCtx.restore();
  }

  function update(game, dt) {
    if (messageTimer > 0) {
      messageTimer -= dt;
      if (messageTimer <= 0) hideMessage();
    }
    if (game.player.cash !== lastCash) {
      lastCash = game.player.cash;
      cashEl.textContent = `$${game.player.cash.toLocaleString('en-US')}`;
    }
    healthFill.style.width = `${Math.max(0, game.player.health)}%`;
    healthFill.style.background = game.player.health > 50 ? '#4caf6d' : game.player.health > 25 ? '#f2c94c' : '#e5534b';
    if (game.wanted !== lastWanted) {
      lastWanted = game.wanted;
      starsEl.textContent = '\u2605'.repeat(game.wanted) + '\u2606'.repeat(5 - game.wanted);
      starsEl.classList.toggle('hot', game.wanted > 0);
    }
    const mission = game.missions.current();
    if (mission && game.missions.active) {
      missionTitle.textContent = mission.title;
      const step = game.missions.currentStep();
      const px = game.player.inCar && game.player.car ? game.player.car.x : game.player.x;
      const pz = game.player.inCar && game.player.car ? game.player.car.z : game.player.z;
      const dist = step ? Math.round(Math.hypot(px - step.x, pz - step.z)) : 0;
      missionText.textContent = step ? `${step.text} — ${dist}m` : '';
    } else if (game.missions.done) {
      missionTitle.textContent = 'Solmar Bay — Free Roam';
      missionText.textContent = 'All three jobs done. The city is yours, Rico.';
    }
    const px = game.player.inCar && game.player.car ? game.player.car.x : game.player.x;
    const pz = game.player.inCar && game.player.car ? game.player.car.z : game.player.z;
    districtEl.textContent = districtAt(px, pz);
    ammoEl.textContent = game.combat.reloading ? 'Reloading…' : `Ammo ${game.player.ammo}`;
    const speed = game.player.inCar && game.player.car ? Math.abs(game.player.car.speed) * 3.6 : Math.abs(game.player.speed || 0) * 3.6;
    speedEl.textContent = game.player.inCar ? `${Math.round(speed)} km/h` : '';
    drawMinimap(game);
  }

  return { update, showMessage, hideMessage };
}
