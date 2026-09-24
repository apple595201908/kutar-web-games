type Phase = 'title' | 'ready' | 'playing' | 'boarding' | 'over'

export interface LiftGame {
  start(): void
  act(): void
  dispose(): void
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error(`圖片載入失敗：${url}`))
    image.src = url
  })
}

export async function createLiftGame(canvas: HTMLCanvasElement, baseUrl: string): Promise<LiftGame> {
  const file = (path: string) => `${baseUrl}${path}`
  const [title, bg, ...cats] = await Promise.all([
    loadImage(file('assets/lift/title-screen.png')),
    loadImage(file('native/lift/bg.png')),
    ...[1, 2, 3, 4].map(index => loadImage(file(`native/lift/kutar${index}.png`))),
  ])
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('這個瀏覽器無法建立 2D 畫面')
  ctx.imageSmoothingEnabled = false

  const sounds = Object.fromEntries(
    ['ready', 'go', 'jump', 'sit', 'boo'].map(name => [name, new Audio(file(`assets/lift/${name}.wav`))]),
  ) as Record<string, HTMLAudioElement>
  const highKey = 'kutar-lift-high-score'
  let highScore = 0
  try { highScore = Number(localStorage.getItem(highKey) || 0) || 0 } catch { /* Private mode may disable storage. */ }
  let phase: Phase = 'title'
  let score = 0
  let rider = 0
  let chairX = 430
  let chairSpeed = 128
  let phaseTime = 0
  let previousTime = 0
  let frame = 0
  let disposed = false

  function sound(name: string) {
    const audio = sounds[name]
    try {
      audio.currentTime = 0
      void audio.play().catch(() => { /* Safari may require another gesture. */ })
    } catch { /* Sound is optional when the browser blocks playback. */ }
  }

  function sprite(image: HTMLImageElement, sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, dw = sw, dh = sh) {
    ctx!.drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh)
  }

  function digits(value: number, x: number, y: number) {
    const chars = String(Math.min(value, 999)).padStart(3, '0')
    for (let index = 0; index < chars.length; index++) {
      const digit = Number(chars[index])
      sprite(bg, 218 + (digit % 5) * 36, (digit < 5 ? 0 : 37), 36, 38, x + index * 34, y, 35, 39)
    }
  }

  function drawScene() {
    // Original 400 × 300 playfield and original extracted background layers.
    sprite(bg, 0, 677, 400, 300, 0, 0)
    sprite(bg, 0, 398, 400, 37, 0, 23)
    sprite(bg, 209, 399, 37, 196, 209, 23)
    sprite(bg, 18, 457, 178, 145, 19, 83)
    sprite(bg, 143, 0, 75, 77, 64, 104, 75, 77)

    // The cable chair passes the rider from right to left. One press boards it.
    if (phase !== 'ready') sprite(bg, 70, 153, 145, 72, chairX - 66, 147)
    const cat = cats[rider % cats.length]
    if (phase === 'boarding') {
      sprite(cat, 248, 180, 128, 176, 145 + phaseTime * 38, 92, 128, 176)
    } else {
      const walk = phase === 'playing' ? Math.floor(performance.now() / 210) % 3 : 0
      sprite(cat, walk * 124 + 31, 0, 96, 178, 164, 90, 96, 178)
    }
    digits(score, 150, 5)
  }

  function drawOverlay(label: string) {
    ctx!.fillStyle = '#00000070'
    ctx!.fillRect(0, 0, 400, 300)
    ctx!.fillStyle = '#fff'
    ctx!.font = 'bold 29px sans-serif'
    ctx!.textAlign = 'center'
    ctx!.fillText(label, 200, 151)
    ctx!.font = 'bold 14px sans-serif'
    ctx!.fillText(`最高 ${highScore}`, 200, 181)
  }

  function render() {
    ctx!.clearRect(0, 0, 400, 300)
    if (phase === 'title') {
      ctx!.drawImage(title, 0, 0, 400, 300)
      return
    }
    drawScene()
    if (phase === 'ready') sprite(bg, 0, 1278, 364, 55, 18, 112)
    if (phase === 'over') drawOverlay('結束・再試一次')
  }

  function begin() {
    phase = 'ready'
    phaseTime = 0
    score = 0
    rider = 0
    chairX = 430
    chairSpeed = 128
    sound('ready')
    render()
  }

  function end() {
    phase = 'over'
    phaseTime = 0
    sound('boo')
    if (score > highScore) {
      highScore = score
      try { localStorage.setItem(highKey, String(score)) } catch { /* Private mode may disable storage. */ }
    }
  }

  function tick(time: number) {
    if (disposed) return
    const dt = previousTime ? Math.min((time - previousTime) / 1000, 0.05) : 0
    previousTime = time
    phaseTime += dt
    if (phase === 'ready' && phaseTime >= 0.9) {
      phase = 'playing'
      phaseTime = 0
      sound('go')
    } else if (phase === 'playing') {
      chairX -= chairSpeed * dt
      if (chairX < -80) end()
    } else if (phase === 'boarding' && phaseTime >= 0.6) {
      phase = 'playing'
      phaseTime = 0
      rider++
      chairSpeed = Math.min(255, 128 + score * 9)
      chairX = 430
    }
    render()
    frame = requestAnimationFrame(tick)
  }

  render()
  frame = requestAnimationFrame(tick)
  return {
    start: begin,
    act() {
      if (phase === 'title' || phase === 'over') { begin(); return }
      if (phase !== 'playing') return
      sound('jump')
      if (Math.abs(chairX - 200) <= 41) {
        phase = 'boarding'
        phaseTime = 0
        score++
        sound('sit')
      } else end()
      render()
    },
    dispose() {
      disposed = true
      cancelAnimationFrame(frame)
      for (const audio of Object.values(sounds)) audio.pause()
    },
  }
}
