type Phase = 'title' | 'ready' | 'playing' | 'spit' | 'clear'

export interface IkkiGame {
  start(): void
  act(): void
  dispose(): void
}

function image(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const result = new Image()
    result.onload = () => resolve(result)
    result.onerror = () => reject(new Error(`圖片載入失敗：${url}`))
    result.src = url
  })
}

export async function createIkkiGame(canvas: HTMLCanvasElement, baseUrl: string): Promise<IkkiGame> {
  const file = (path: string) => `${baseUrl}${path}`
  const [title, atlas] = await Promise.all([
    image(file('assets/ikki/title-screen.png')),
    image(file('native/ikki/all.png')),
  ])
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('這個瀏覽器無法建立 2D 畫面')
  ctx.imageSmoothingEnabled = false
  const sounds = Object.fromEntries(
    ['ready', 'go', 'gokkun', 'pu', 'puha', 'spew', 'bgm'].map(name => [name, new Audio(file(`assets/ikki/${name}.wav`))]),
  ) as Record<string, HTMLAudioElement>
  sounds.bgm.loop = true
  let best = 0
  try { best = Number(localStorage.getItem('kutar-ikki-best-time') || 0) || 0 } catch { /* Storage can be unavailable. */ }
  let phase: Phase = 'title'
  let phaseTime = 0
  let elapsed = 0
  let lastDrink = -1
  let lastFrame = 0
  let remaining = 1
  let heat = 0
  let drinks = 0
  let frame = 0
  let disposed = false

  function sound(name: string) {
    const audio = sounds[name]
    try {
      audio.currentTime = 0
      void audio.play().catch(() => { /* Audio may need a fresh gesture on Safari. */ })
    } catch { /* Audio is optional. */ }
  }

  function sprite(sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, dw = sw, dh = sh) {
    ctx!.drawImage(atlas, sx, sy, sw, sh, dx, dy, dw, dh)
  }

  function timeDigits(seconds: number) {
    const value = Math.min(99.99, seconds).toFixed(2).padStart(5, '0')
    let x = 115
    for (const character of value) {
      if (character === '.') {
        ctx!.fillStyle = '#b9ff4c'
        ctx!.strokeStyle = '#3534cf'
        ctx!.lineWidth = 2
        ctx!.strokeRect(x, 36, 5, 5)
        ctx!.fillRect(x, 36, 5, 5)
        x += 11
      } else {
        const digit = Number(character)
        const small = x > 182
        sprite(digit * 33, 1240, 33, 37, x, small ? 15 : 9, small ? 28 : 33, small ? 32 : 37)
        x += small ? 27 : 33
      }
    }
    ctx!.font = 'bold 19px Arial, sans-serif'
    ctx!.lineWidth = 3
    ctx!.strokeStyle = '#3437c9'
    ctx!.fillStyle = '#aeff46'
    ctx!.strokeText('SEC', x + 1, 40)
    ctx!.fillText('SEC', x + 1, 40)
  }

  function drawScene() {
    sprite(0, 640, 400, 300, 0, 0)
    const drinking = phase === 'playing' && phaseTime < 0.20 && drinks > 0
    if (phase === 'spit') sprite(200, 160, 100, 160, 145, 87)
    else if (phase === 'clear') sprite(100, 0, 100, 160, 145, 87)
    else if (drinking) sprite((drinks % 2) * 100, 160, 100, 160, 145, 87)
    else sprite(0, 0, 100, 160, 145, 87)

    sprite(remaining > 0.25 ? 300 : 350, 160, 50, 100, 297, 118)
    if (phase === 'playing' && heat > 0.34) {
      const danger = heat > 0.7
      sprite(danger ? 275 : 200, 0, 75, 60, 110, 109, 53, 42)
    }
    timeDigits(elapsed)
  }

  function overlay(titleText: string, detail: string) {
    ctx!.fillStyle = '#101055aa'
    ctx!.fillRect(0, 0, 400, 300)
    ctx!.fillStyle = '#fff'
    ctx!.textAlign = 'center'
    ctx!.font = 'bold 28px sans-serif'
    ctx!.fillText(titleText, 200, 146)
    ctx!.font = 'bold 15px sans-serif'
    ctx!.fillText(detail, 200, 177)
    ctx!.textAlign = 'start'
  }

  function draw() {
    ctx!.clearRect(0, 0, 400, 300)
    if (phase === 'title') { ctx!.drawImage(title, 0, 0, 400, 300); return }
    drawScene()
    if (phase === 'ready') sprite(0, 1320, 364, 56, 18, 118)
    if (phase === 'spit') overlay('吹出牛奶了！', '點按再試一次')
    if (phase === 'clear') overlay(`完成！${elapsed.toFixed(2)} 秒`, best ? `最佳 ${best.toFixed(2)} 秒・點按重玩` : '點按重玩')
  }

  function start() {
    phase = 'ready'
    phaseTime = 0
    elapsed = 0
    lastDrink = -1
    remaining = 1
    heat = 0
    drinks = 0
    sound('ready')
    sound('bgm')
    draw()
  }

  function tick(time: number) {
    if (disposed) return
    const dt = lastFrame ? Math.min((time - lastFrame) / 1000, 0.05) : 0
    lastFrame = time
    phaseTime += dt
    if (phase === 'ready' && phaseTime > 0.9) {
      phase = 'playing'
      phaseTime = 0
      sound('go')
    } else if (phase === 'playing') {
      elapsed += dt
      heat = Math.max(0, heat - dt * 0.7)
    }
    draw()
    frame = requestAnimationFrame(tick)
  }

  draw()
  frame = requestAnimationFrame(tick)
  return {
    start,
    act() {
      if (phase === 'title' || phase === 'clear' || phase === 'spit') { start(); return }
      if (phase !== 'playing') return
      const gap = lastDrink < 0 ? Infinity : elapsed - lastDrink
      lastDrink = elapsed
      phaseTime = 0
      heat += gap < 0.18 ? 0.40 : 0.29
      drinks++
      if (heat >= 1) {
        phase = 'spit'
        sound('spew')
      } else {
        remaining = Math.max(0, remaining - 1 / 14)
        sound('gokkun')
        if (drinks >= 14) {
          phase = 'clear'
          sound('puha')
          if (!best || elapsed < best) {
            best = elapsed
            try { localStorage.setItem('kutar-ikki-best-time', String(best)) } catch { /* Storage can be unavailable. */ }
          }
        }
      }
      draw()
    },
    dispose() {
      disposed = true
      cancelAnimationFrame(frame)
      for (const audio of Object.values(sounds)) audio.pause()
    },
  }
}
