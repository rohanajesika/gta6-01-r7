[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/rohanajesika/gta6-01-r7/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/rohanajesika/gta6-01-r7/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

# Solmar Bay — Open-World Crime

A complete open-world crime game in the spirit of GTA 6, built for the [make.fun gta6-01 bounty](https://make.fun/bounty/gta6-01). You are Rico Marlin, a courier fresh off the bus in Solmar Bay, a sun-soaked fictional coastal city of five districts — Marina, Old Town, Hills, Port and Downtown. Madame Vela has three jobs for you: a sunset delivery, a stolen Sunset GT, and a getaway with the whole police force on your tail.

## What is in the game

- **A city to explore on foot and by car** — a 600×600 m road grid with five distinct districts, a marina promenade, a container port, downtown towers and a sunset sky.
- **Traffic and pedestrians** — 14 cars driving the grid and 18 locals strolling the sidewalks who flee from gunfire and speeding cars.
- **Cars to steal and drive** — walk up to any car and press E. Stealing one in public raises your wanted level.
- **A wanted level and police who respond** — five stars, patrol cars that chase and ram you, and a bust timer when they corner you on foot. Lay low and the heat cools off.
- **Missions and a story** — three chained jobs from fixer Madame Vela, each with a map marker, a golden beacon and a cash payout ($500 / $1,500 / $4,000).
- **Combat** — fists (F) and a pistol (click to shoot, R to reload).
- **HUD with a live minimap** — cash, health, wanted stars, mission objective with distance, district name, speed, and a minimap showing roads, traffic, police and the mission marker.
- **Start screen, pause menu and saving** — progress autosaves after every job and can be saved from the pause menu; Continue reloads it from localStorage.
- **Procedural sound** — engine hum, two-tone siren, gunshots, mission chimes and a slow synth pad, all generated with WebAudio. No audio files.
- **Deterministic screenshots** — `?shot=cover|city|chase|mission&seed=1` stages each scene from the real game rules.

## How to play

```sh
node serve.ts
```

Then open http://localhost:8080 in desktop Chrome. No network is needed — every file the game loads lives under `game/`.

| Key | Action |
| --- | --- |
| W A S D | Walk / drive |
| Shift | Run |
| E | Enter / exit a car |
| Click | Shoot the pistol |
| F | Punch |
| R | Reload |
| P / Esc | Pause |
| Drag mouse | Look around |
| Mouse wheel | Camera zoom |

## Layout

- `game/index.html` — the page, HUD and menus.
- `game/src/main.js` — boot, the game loop, camera, driving, wanted level and saving.
- `game/src/world.js` — the city: roads, buildings, palms, lamps and the mission beacon.
- `game/src/vehicles.js` — car factory, traffic AI and parked cars.
- `game/src/pedestrians.js` — locals on the sidewalks.
- `game/src/police.js` — the police response to the wanted level.
- `game/src/missions.js` — Madame Vela's three-job story chain.
- `game/src/combat.js` — fists and the pistol.
- `game/src/audio.js` — procedural WebAudio sound.
- `game/src/hud.js` — HUD and live minimap.
- `game/src/shots.js` — the deterministic screenshot scenes.
- `game/src/config.js` — every tuning number, name and colour.
- `game/src/input.js` — keyboard and mouse input.
- `game/src/random.js` — the seeded random generator.
- `game/vendor/three/` — three.js (vendored, minified).
- `main.ts` — the entry program: copies `game/` and `screenshots/` to `/output` and writes `dossier.json` with the vendored make.fun library.
- `screenshots/` — four real renders of the game (1280×720 JPEG).

Everything in this game — the city, the characters, the vehicles, the names, the story and the sounds — is original. Nothing is taken from any commercial game.
