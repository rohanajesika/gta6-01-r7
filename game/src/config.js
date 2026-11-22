// Solmar Bay — every tuning number, name and colour in one place.
// The city is a 600 by 600 metre grid centred on (0, 0); roads run every 60 m.
// Nothing here touches the DOM or three.js, so the rules stay testable on their own.

export const CITY = { half: 300, roadStep: 60, roadHalfWidth: 7, blockHalf: 23 };

/** The simulation's fixed step, in seconds: 60 updates a second. */
export const STEP = 1 / 60;

export const DISTRICTS = [
  { name: 'Marina', x0: -300, z0: -300, x1: -120, z1: 60, tint: 0x7fb6c9, tower: false },
  { name: 'Old Town', x0: -300, z0: 60, x1: -120, z1: 300, tint: 0xd9a066, tower: false },
  { name: 'Downtown', x0: -120, z0: -120, x1: 120, z1: 120, tint: 0x8f9bb0, tower: true },
  { name: 'Port', x0: 120, z0: -300, x1: 300, z1: 60, tint: 0x9a8f7a, tower: false },
  { name: 'Hills', x0: 120, z0: 60, x1: 300, z1: 300, tint: 0x7ba05b, tower: false },
];

export function districtAt(x, z) {
  for (const d of DISTRICTS) {
    if (x >= d.x0 && x < d.x1 && z >= d.z0 && z < d.z1) return d.name;
  }
  return 'Solmar Bay';
}

export const PLAYER = {
  walkSpeed: 6,
  runSpeed: 10,
  radius: 0.7,
  maxHealth: 100,
  startCash: 120,
  startAmmo: 24,
  maxAmmo: 48,
  punchRange: 2.6,
  punchDamage: 34,
};

export const CAR = {
  accel: 22,
  brake: 34,
  reverseAccel: 12,
  maxSpeed: 38,
  maxReverse: 10,
  turnRate: 1.9,
  radius: 1.6,
};

export const TRAFFIC_COUNT = 14;
export const PEDESTRIAN_COUNT = 18;
export const MAX_POLICE_CARS = 4;

export const WANTED = {
  decaySeconds: 25,
  policeSpawnDelay: 2.5,
  bustSeconds: 3,
  bustRange: 5,
};

export const MISSIONS = [
  {
    id: 1,
    title: 'Mission 1 — Sunset Delivery',
    giver: 'Madame Vela',
    reward: 500,
    steps: [
      { text: 'Pick up the package at the Marina kiosk', x: -180, z: -180 },
      { text: 'Deliver it to the Old Town cafe before dark', x: -180, z: 180 },
    ],
  },
  {
    id: 2,
    title: 'Mission 2 — The Sunset GT',
    giver: 'Madame Vela',
    reward: 1500,
    steps: [
      { text: 'Steal the orange Sunset GT at the Downtown showroom', x: 30, z: -60 },
      { text: 'Drive the GT to Vela\u2019s garage at the Port', x: 180, z: -60 },
    ],
  },
  {
    id: 3,
    title: 'Mission 3 — Heat Escape',
    giver: 'Madame Vela',
    reward: 4000,
    steps: [
      { text: 'Lose the heat: reach the Hills hideout with the police on your tail', x: 240, z: 240 },
    ],
    timeLimit: 180,
  },
];

export const SAVE_KEY = 'solmar-bay-save-v1';

export const PALETTE = {
  sky: 0xff9e57,
  skyTop: 0x2e4a7a,
  fog: 0xf2a05e,
  ground: 0x8a7a5e,
  asphalt: 0x33363d,
  sidewalk: 0x9a938a,
  water: 0x2e6f8e,
  building: 0xcfc4b0,
  text: '#f5efe4',
  muted: '#cbbfa8',
  gold: '#f2c94c',
  danger: '#e5534b',
  police: '#3b6fd4',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
