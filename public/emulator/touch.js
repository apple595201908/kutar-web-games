// Map touches to the original mouse controls. Directional games use the
// mouse's left/right buttons; their toolbar still uses the left button.
const gameCanvas = document.getElementById('canvas');
const touchMode = new URLSearchParams(location.search).get('controls') || 'direct';
const directional = touchMode === 'sides';
const activeTouches = new Map();
let primaryTouch = null;

function sendMouse(type, touch, button, buttons) {
  gameCanvas.dispatchEvent(new MouseEvent(type, {
    bubbles: true, cancelable: true, button, buttons,
    clientX: touch.clientX, clientY: touch.clientY,
  }));
}

function sideOf(touch) {
  const rect = gameCanvas.getBoundingClientRect();
  if (touch.clientX < rect.left || touch.clientX >= rect.right || touch.clientY < rect.top || touch.clientY >= rect.bottom) return null;
  return touch.clientY < rect.top + rect.height * (65 / 365)
    ? 'toolbar'
    : touch.clientX < rect.left + rect.width / 2 ? 'left' : 'right';
}

function buttonFor(side) { return side === 'right' ? 2 : 0; }
function maskFor(side) { return side === 'right' ? 2 : side ? 1 : 0; }
function activeMask() {
  let mask = 0;
  for (const side of activeTouches.values()) mask |= maskFor(side);
  return mask;
}

function addTouch(touch) {
  if (directional) {
    const side = sideOf(touch);
    const previousMask = activeMask();
    activeTouches.set(touch.identifier, side);
    const bit = maskFor(side);
    if (bit && !(previousMask & bit)) {
      sendMouse('mousemove', touch, -1, previousMask);
      sendMouse('mousedown', touch, buttonFor(side), activeMask());
    }
  } else {
    activeTouches.set(touch.identifier, null);
    if (primaryTouch === null) {
      primaryTouch = touch.identifier;
      sendMouse('mousemove', touch, -1, 0);
      sendMouse('mousedown', touch, 0, 1);
    }
  }
}

function moveTouch(touch) {
  if (!activeTouches.has(touch.identifier)) return;
  if (directional) {
    const previous = activeTouches.get(touch.identifier);
    const next = sideOf(touch);
    const before = activeMask();
    activeTouches.set(touch.identifier, next);
    const after = activeMask();
    const released = before & ~after;
    const pressed = after & ~before;
    if (released) sendMouse('mouseup', touch, released === 2 ? 2 : 0, after);
    if (pressed) sendMouse('mousedown', touch, pressed === 2 ? 2 : 0, after);
    if (previous === next) sendMouse('mousemove', touch, -1, after);
  } else if (primaryTouch === touch.identifier) {
    sendMouse('mousemove', touch, -1, 1);
  }
}

function removeTouch(touch, cancelled = false) {
  if (!activeTouches.has(touch.identifier)) return;
  if (directional) {
    const side = activeTouches.get(touch.identifier);
    const before = activeMask();
    activeTouches.delete(touch.identifier);
    const after = activeMask();
    const released = before & ~after;
    if (released) {
      sendMouse('mouseup', touch, released === 2 ? 2 : 0, after);
      if (side === 'toolbar' && !cancelled) sendMouse('click', touch, 0, after);
    }
  } else {
    activeTouches.delete(touch.identifier);
    if (primaryTouch === touch.identifier) {
      sendMouse('mouseup', touch, 0, 0);
      primaryTouch = null;
    }
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
    for (const touch of event.changedTouches) removeTouch(touch, name === 'touchcancel');
    if (!directional && primaryTouch === null && activeTouches.size) {
      const next = Array.from(event.touches).find(touch => activeTouches.has(touch.identifier));
      if (next) {
        primaryTouch = next.identifier;
        sendMouse('mousemove', next, -1, 0);
        sendMouse('mousedown', next, 0, 1);
      }
    }
  }, { passive: false });
}

document.addEventListener('visibilitychange', () => {
  if (!document.hidden) return;
  if (directional) {
    for (const [identifier] of [...activeTouches]) {
      const rect = gameCanvas.getBoundingClientRect();
      removeTouch({ identifier, clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2 }, true);
    }
  } else if (primaryTouch !== null) {
    const rect = gameCanvas.getBoundingClientRect();
    sendMouse('mouseup', { clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2 }, 0, 0);
  }
  activeTouches.clear();
  primaryTouch = null;
});
