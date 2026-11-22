// Deterministic screenshot scenes for Solmar Bay. Each scene starts the
// story fresh (no save), puts the player and the camera somewhere that
// shows one side of the game, and uses only fixed coordinates, so the same
// seed always stages the same picture: cover on foot in the city, city
// driving the orange Sunset GT down a Downtown avenue, chase fleeing the
// police at four wanted stars, mission standing by the first job's golden
// beacon in the Marina.

function putOnFoot(game, x, z, heading) {
  game.teleportPlayer(x, z, heading);
  game.setCameraDistance(10);
}

function putInCar(game, car, speed) {
  // Take a car directly, without the street-crime fanfare: screenshot
  // staging is not play, so no wanted message pops up over the picture.
  // Teleport on foot first so the camera swings in behind the car's heading.
  if (game.player.inCar) game.exitCar();
  game.teleportPlayer(car.x, car.z, car.heading);
  const player = game.player;
  car.parked = false;
  car.speed = speed;
  car.mesh.position.set(car.x, 0, car.z);
  car.mesh.rotation.y = car.heading;
  player.x = car.x;
  player.z = car.z;
  player.heading = car.heading;
  player.speed = speed;
  player.inCar = true;
  player.car = car;
  player.mesh.visible = false;
  player.mesh.position.set(car.x, 0, car.z);
}

export function stageShot(name, game) {
  game.startGame(false);
  if (name === 'city') {
    // The orange Sunset GT, fast down the Downtown avenue.
    const gt = game.vehicles.sunsetGt;
    putInCar(game, gt, 28);
    game.wanted = 0;
    game.setCameraDistance(12);
  } else if (name === 'chase') {
    // A stolen sedan, four wanted stars, two patrol cars coming head-on.
    // Park it on the avenue first, so the camera swings in behind it.
    const sedan = game.vehicles.parked[0];
    sedan.x = 0;
    sedan.z = 20;
    sedan.heading = 0;
    sedan.mesh.position.set(0, 0, 20);
    sedan.mesh.rotation.y = 0;
    putInCar(game, sedan, 24);
    game.wanted = 4;
    game.police.setPlayerPosition(0, 20);
    const first = game.police.spawn(0, -48, 0, 20);
    first.speed = 22;
    const second = game.police.spawn(7, -68, 0, 20);
    second.speed = 22;
    game.setCameraDistance(12);
  } else if (name === 'mission') {
    // On foot by the Marina kiosk, the golden beacon of job one ahead,
    // close enough that the HUD reads its distance.
    putOnFoot(game, -168, -168, Math.PI / 4);
  } else {
    // Cover: Rico on foot on the avenue, the whole city behind him.
    putOnFoot(game, 0, 20, 0);
  }
}
