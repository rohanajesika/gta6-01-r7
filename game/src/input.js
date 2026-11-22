// Keyboard and mouse input. Held keys are read every frame; one-shot presses
// (interact, punch, reload, pause) are queued as flags and taken once, so a
// press between two frames is never lost and never counted twice. Mouse drag
// orbits the camera; a click fires the pistol.

export const ACTION_INTERACT = 1;
export const ACTION_PUNCH = 2;
export const ACTION_RELOAD = 4;
export const ACTION_PAUSE = 8;
export const ACTION_SHOOT = 16;

const FORWARD = new Set(['KeyW', 'ArrowUp']);
const BACK = new Set(['KeyS', 'ArrowDown']);
const LEFT = new Set(['KeyA', 'ArrowLeft']);
const RIGHT = new Set(['KeyD', 'ArrowRight']);
const RUN = new Set(['ShiftLeft', 'ShiftRight']);

export function createInput(canvas) {
  const held = new Set();
  let actions = 0;
  let dragX = 0;
  let dragging = false;
  let lastX = 0;

  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    held.add(event.code);
    if (event.code === 'KeyE') actions |= ACTION_INTERACT;
    else if (event.code === 'KeyF') actions |= ACTION_PUNCH;
    else if (event.code === 'KeyR') actions |= ACTION_RELOAD;
    else if (event.code === 'KeyP' || event.code === 'Escape') actions |= ACTION_PAUSE;
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) {
      event.preventDefault();
    }
  });
  window.addEventListener('keyup', (event) => {
    held.delete(event.code);
  });
  window.addEventListener('blur', () => {
    held.clear();
    dragging = false;
  });
  canvas.addEventListener('mousedown', (event) => {
    dragging = true;
    lastX = event.clientX;
    actions |= ACTION_SHOOT;
  });
  window.addEventListener('mouseup', () => {
    dragging = false;
  });
  window.addEventListener('mousemove', (event) => {
    if (!dragging) return;
    dragX += event.clientX - lastX;
    lastX = event.clientX;
  });

  function has(set) {
    for (const code of set) if (held.has(code)) return true;
    return false;
  }

  return {
    forward: () => (has(FORWARD) ? 1 : 0) - (has(BACK) ? 1 : 0),
    strafe: () => (has(RIGHT) ? 1 : 0) - (has(LEFT) ? 1 : 0),
    run: () => has(RUN),
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    takeDrag() {
      const taken = dragX;
      dragX = 0;
      return taken;
    },
  };
}
