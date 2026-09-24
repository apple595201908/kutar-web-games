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
    dispatchEvent(event) { events.push({ type: event.type, key: event.key, x: event.clientX }) },
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
    expect(events.filter(event => event.type.startsWith('key')).map(event => `${event.type}:${event.key}`)).toEqual([
      'keydown:ArrowLeft', 'keydown:ArrowRight', 'keyup:ArrowLeft', 'keyup:ArrowRight',
    ])
    expect(events.filter(event => event.type === 'mousedown')).toHaveLength(2)
    expect(events.filter(event => event.type === 'mouseup')).toHaveLength(2)
  })

  it('does not treat the original toolbar as a directional play area', () => {
    const { events, touch, fire } = harness()
    fire('touchstart', [touch(1, 25, 43)])
    expect(events.map(event => event.type)).toEqual(['mousemove', 'mousedown'])
  })

  it('switches direction when a finger crosses the middle', () => {
    const { events, touch, fire } = harness()
    fire('touchstart', [touch(1, 80, 200)])
    fire('touchmove', [touch(1, 320, 200)])
    expect(events.filter(event => event.type.startsWith('key')).map(event => `${event.type}:${event.key}`)).toEqual([
      'keydown:ArrowLeft', 'keyup:ArrowLeft', 'keydown:ArrowRight',
    ])
  })

  it('releases held input when the page becomes hidden', () => {
    const { document, documentListeners, events, touch, fire } = harness()
    fire('touchstart', [touch(1, 80, 200)])
    document.hidden = true
    documentListeners.get('visibilitychange')()
    expect(events.at(-2).type).toBe('keyup')
    expect(events.at(-1).type).toBe('mouseup')
  })

  it('maps a single-button game touch to mouse without direction keys', () => {
    const { events, touch, fire } = harness('single')
    const point = touch(1, 200, 220)
    fire('touchstart', [point])
    fire('touchend', [point], [])
    expect(events.map(event => event.type)).toEqual(['mousemove', 'mousedown', 'mouseup'])
  })
})
