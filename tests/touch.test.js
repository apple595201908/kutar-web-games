import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'

const source = readFileSync(new URL('../public/emulator/touch.js', import.meta.url), 'utf8')

function harness(mode = 'sides') {
  const canvasListeners = new Map()
  const documentListeners = new Map()
  const events = []
  const canvas = {
    addEventListener(name, handler) { canvasListeners.set(name, handler) },
    dispatchEvent(event) { events.push({ type: event.type, button: event.button, buttons: event.buttons, x: event.clientX }) },
    getBoundingClientRect() { return { left: 0, top: 0, right: 406, bottom: 365, width: 406, height: 365 } },
  }
  const document = {
    hidden: false,
    getElementById(id) { return id === 'canvas' ? canvas : null },
    addEventListener(name, handler) { documentListeners.set(name, handler) },
  }
  class EventStub {
    constructor(type, options) { this.type = type; Object.assign(this, options) }
  }
  runInNewContext(source, {
    document, location: { search: `?controls=${mode}` }, URLSearchParams,
    MouseEvent: EventStub, KeyboardEvent: EventStub,
  })
  const touch = (identifier, clientX, clientY) => ({ identifier, clientX, clientY })
  function fire(name, changedTouches, touches = changedTouches) {
    canvasListeners.get(name)({ changedTouches, touches, preventDefault() {}, stopImmediatePropagation() {} })
  }
  return { document, documentListeners, events, touch, fire }
}

describe('touch bridge', () => {
  it('keeps two sides independent and releases both when fingers leave', () => {
    const { events, touch, fire } = harness()
    const left = touch(1, 80, 200)
    const right = touch(2, 330, 200)
    fire('touchstart', [left], [left])
    fire('touchstart', [right], [left, right])
    fire('touchend', [left], [right])
    fire('touchend', [right], [])
    expect(events.filter(event => event.type === 'mousedown' || event.type === 'mouseup').map(event => `${event.type}:${event.button}`)).toEqual([
      'mousedown:0', 'mousedown:2', 'mouseup:0', 'mouseup:2',
    ])
    expect(events.filter(event => event.type === 'mousedown')).toHaveLength(2)
    expect(events.filter(event => event.type === 'mouseup')).toHaveLength(2)
  })

  it('does not treat the original toolbar as a directional play area', () => {
    const { events, touch, fire } = harness()
    const point = touch(1, 25, 43)
    fire('touchstart', [point])
    fire('touchend', [point], [])
    expect(events.map(event => event.type)).toEqual(['mousemove', 'mousedown', 'mouseup', 'click'])
    expect(events[1].button).toBe(0)
  })

  it('switches direction when a finger crosses the middle', () => {
    const { events, touch, fire } = harness()
    fire('touchstart', [touch(1, 80, 200)])
    fire('touchmove', [touch(1, 320, 200)])
    expect(events.filter(event => event.type === 'mousedown' || event.type === 'mouseup').map(event => `${event.type}:${event.button}`)).toEqual([
      'mousedown:0', 'mouseup:0', 'mousedown:2',
    ])
  })

  it('releases held input when the page becomes hidden', () => {
    const { document, documentListeners, events, touch, fire } = harness()
    fire('touchstart', [touch(1, 80, 200)])
    fire('touchstart', [touch(2, 320, 200)])
    document.hidden = true
    documentListeners.get('visibilitychange')()
    expect(events.filter(event => event.type === 'mouseup').map(event => event.button)).toEqual([0, 2])
    expect(events.some(event => event.type === 'click')).toBe(false)
  })

  it('keeps a side held until its last finger lifts', () => {
    const { events, touch, fire } = harness()
    const first = touch(1, 80, 200)
    const second = touch(2, 90, 200)
    fire('touchstart', [first], [first])
    fire('touchstart', [second], [first, second])
    fire('touchend', [first], [second])
    expect(events.filter(event => event.type === 'mousedown')).toHaveLength(1)
    expect(events.filter(event => event.type === 'mouseup')).toHaveLength(0)
    fire('touchend', [second], [])
    expect(events.filter(event => event.type === 'mouseup')).toHaveLength(1)
  })

  it('maps a single-button game touch to mouse without direction keys', () => {
    const { events, touch, fire } = harness('single')
    const point = touch(1, 200, 220)
    fire('touchstart', [point])
    fire('touchend', [point], [])
    expect(events.map(event => event.type)).toEqual(['mousemove', 'mousedown', 'mouseup'])
  })
})
