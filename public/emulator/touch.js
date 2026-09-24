// Bridge direct touches on the unscaled original game canvas into SDL mouse
// events. Directional games also treat the two halves as arrow keys.
const gameCanvas = document.getElementById('canvas');
const touchMode = new URLSearchParams(location.search).get('controls') || 'direct';
const activeTouches = new Map();
let primaryTouch = null;

function sendMouse(type, touch, buttons) {
  gameCanvas.dispatchEvent(new MouseEvent(type, {
    bubbles: true, cancelable: true, button: 0, buttons,
    clientX: touch.clientX, clientY: touch.clientY,
  }));
}

function sendKey(side, down) {
  if (!side) return;
  const left = side === 'left';
  const key = left ? 'ArrowLeft' : 'ArrowRight';
  const code = left ? 37 : 39;
  const event = new KeyboardEvent(down ? 'keydown' : 'keyup', {
    bubbles: true, cancelable: true, key, code: key,
  });
  Object.defineProperty(event, 'keyCode', { get: () => code });
  Object.defineProperty(event, 'which', { get: () => code });
  gameCanvas.dispatchEvent(event);
}

function sideOf(touch) {
  if (touchMode !== 'sides') return null;
  const rect = gameCanvas.getBoundingClientRect();
  const playTop = rect.top + rect.height * (65 / 365);
  if (touch.clientY < playTop || touch.clientY >= rect.bottom || touch.clientX < rect.left || touch.clientX >= rect.right) return null;
  return touch.clientX < rect.left + rect.width / 2 ? 'left' : 'right';
}

function addTouch(touch) {
  const side = sideOf(touch);
  if (side && ![...activeTouches.values()].includes(side)) sendKey(side, true);
  activeTouches.set(touch.identifier, side);
  if (primaryTouch === null) {
    primaryTouch = touch.identifier;
    sendMouse('mousemove', touch, 0);
    sendMouse('mousedown', touch, 1);
  }
}

function moveTouch(touch) {
  if (!activeTouches.has(touch.identifier)) return;
  const previous = activeTouches.get(touch.identifier);
  const next = sideOf(touch);
  if (previous !== next) {
    activeTouches.set(touch.identifier, next);
    if (previous && ![...activeTouches.values()].includes(previous)) sendKey(previous, false);
    if (next && [...activeTouches.values()].filter(value => value === next).length === 1) sendKey(next, true);
  }
  if (primaryTouch === touch.identifier) sendMouse('mousemove', touch, 1);
}

function removeTouch(touch) {
  if (!activeTouches.has(touch.identifier)) return;
  const side = activeTouches.get(touch.identifier);
  activeTouches.delete(touch.identifier);
  if (side && ![...activeTouches.values()].includes(side)) sendKey(side, false);
  if (primaryTouch === touch.identifier) {
    sendMouse('mouseup', touch, 0);
    primaryTouch = null;
  }
}

gameCanvas.addEventListener('touchstart', event => {
  event.preventDefault();
  event.stopImmediatePropagation();
  for (const touch of event.changedTouches) addTouch(touch);
}, { passive: false });

gameCanvas.addEventListener('touchmove', event => {
  event.preventDefault();
  event.stopImmediatePropagation();
  for (const touch of event.changedTouches) moveTouch(touch);
}, { passive: false });

for (const name of ['touchend', 'touchcancel']) {
  gameCanvas.addEventListener(name, event => {
    event.preventDefault();
    event.stopImmediatePropagation();
    for (const touch of event.changedTouches) removeTouch(touch);
    if (primaryTouch === null && activeTouches.size) {
      const next = Array.from(event.touches).find(touch => activeTouches.has(touch.identifier));
      if (next) {
        primaryTouch = next.identifier;
        sendMouse('mousemove', next, 0);
        sendMouse('mousedown', next, 1);
      }
    }
  }, { passive: false });
}

document.addEventListener('visibilitychange', () => {
  if (!document.hidden) return;
  for (const side of new Set(activeTouches.values())) sendKey(side, false);
  if (primaryTouch !== null) {
    const rect = gameCanvas.getBoundingClientRect();
    sendMouse('mouseup', { clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2 }, 0);
  }
  activeTouches.clear();
  primaryTouch = null;
});
