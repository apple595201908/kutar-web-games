import './style.css'
import { gameById, games, type Game } from './games'

const root = document.querySelector<HTMLDivElement>('#app')!
const asset = (path: string) => `${import.meta.env.BASE_URL}${path}`
let cleanup: (() => void) | undefined

function gameUrl(id?: string) {
  const url = new URL(location.href)
  if (id) url.searchParams.set('game', id)
  else url.searchParams.delete('game')
  return url
}

function navigate(id?: string) {
  history.pushState(null, '', gameUrl(id))
  render()
  window.scrollTo({ top: 0, behavior: 'instant' })
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!)
}

function renderMenu() {
  document.title = 'Kutar 網頁遊戲大集合'
  root.innerHTML = `
    <header class="hero">
      <div class="hero-inner">
        <p class="eyebrow">THE ORIGINAL 20 MINI GAMES</p>
        <h1>Kutar <span>網頁遊戲大集合</span></h1>
        <p class="hero-copy">選一款遊戲，直接在瀏覽器裡玩。保留原版 400 × 300 畫面與原作節奏。</p>
        <a class="hero-jump" href="#games">選擇遊戲 <span aria-hidden="true">↓</span></a>
      </div>
      <div class="hero-cats" aria-hidden="true">●　●　●</div>
    </header>
    <main id="games" class="catalog">
      <div class="section-heading"><div><p class="eyebrow">GAME SELECT</p><h2>選擇遊戲</h2></div><span class="count">20 款原版遊戲</span></div>
      <div class="game-grid">
        ${games.map((game, index) => `
          <a class="game-card" href="${escapeHtml(gameUrl(game.id).toString())}" data-game="${escapeHtml(game.id)}" aria-label="遊玩 ${escapeHtml(game.name)}">
            <div class="game-art"><img src="${asset(`assets/${game.id.toLowerCase()}/title-screen.png`)}" alt="${escapeHtml(game.original)} 標題畫面" loading="lazy" width="400" height="300"><span class="play-badge" aria-hidden="true">▶</span></div>
            <div class="game-info"><span class="game-number">${String(index + 1).padStart(2, '0')}</span><div><h3>${escapeHtml(game.name)}</h3><p>${escapeHtml(game.original)}</p></div><span class="card-arrow" aria-hidden="true">↗</span></div>
          </a>`).join('')}
      </div>
      <p class="source-note">原作名稱與素材版權屬原作者。網頁執行環境使用 <a href="https://github.com/danoon2/Boxedwine" target="_blank" rel="noreferrer">BoxedWine</a>。</p>
    </main>`
  root.querySelectorAll<HTMLAnchorElement>('[data-game]').forEach(link => link.addEventListener('click', event => {
    if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    navigate(link.dataset.game)
  }))
}

function renderGame(game: Game) {
  document.title = `${game.name}｜Kutar 網頁遊戲大集合`
  const src = asset(`emulator/boxedwine.html?app=${encodeURIComponent(game.id.toLowerCase())}&p=${encodeURIComponent(game.id + '.exe')}&resolution=406x365`)
  root.innerHTML = `
    <main class="play-page">
      <nav class="play-nav"><a class="back-link" href="${escapeHtml(gameUrl().toString())}" data-back>← 返回遊戲選單</a><span>KU<span class="brand-red">T</span>AR / ${escapeHtml(game.original)}</span></nav>
      <div class="play-heading"><p class="eyebrow">NOW PLAYING</p><h1>${escapeHtml(game.name)}</h1><p>${escapeHtml(game.original)}</p></div>
      <div class="play-layout">
        <div class="game-column">
          <div class="stage" aria-label="${escapeHtml(game.name)} 原版遊戲視窗"><iframe class="game-frame" title="${escapeHtml(game.name)} 遊戲" src="${src}" scrolling="no" allow="autoplay" loading="eager"></iframe><div class="stage-loading" role="status"><span class="loader"></span>正在啟動原版遊戲…</div></div>
          <div class="controls" aria-label="觸控操作">
            <button class="start-button" data-action="start" type="button">▶ 開始 / 重玩</button>
            ${game.control === 'sides' ? `<div class="side-controls"><button data-action="left" type="button">← 左半邊</button><button data-action="right" type="button">右半邊 →</button></div>` : game.control === 'single' ? `<button class="action-button" data-action="tap" type="button">點按 / 動作</button>` : `<p class="direct-hint">請直接點選遊戲畫面中的目標</p>`}
          </div>
        </div>
        <aside class="play-help"><div class="help-card"><p class="eyebrow">HOW TO PLAY</p><h2>操作方式</h2><p>${escapeHtml(game.description)}</p><p>先按遊戲視窗左上角的開始鍵，或使用下方「開始 / 重玩」。鍵盤與滑鼠可沿用原版操作；手機可點遊戲畫面或下方大按鍵。</p></div><div class="help-card mini"><span>原始畫面</span><strong>400 × 300</strong><span>完整等比例顯示</span></div></aside>
      </div>
    </main>`

  const frame = root.querySelector<HTMLIFrameElement>('.game-frame')!
  const stage = root.querySelector<HTMLElement>('.stage')!
  const loading = root.querySelector<HTMLElement>('.stage-loading')!
  const back = root.querySelector<HTMLAnchorElement>('[data-back]')!
  const controls = root.querySelector<HTMLElement>('.controls')!
  const pointers = new Map<number, string>()
  let readyTimer: number | undefined
  let destroyed = false

  const resize = () => stage.style.setProperty('--scale', String(stage.clientWidth / 406))
  const observer = new ResizeObserver(resize)
  observer.observe(stage)
  resize()

  function getCanvas() {
    try { return frame.contentDocument?.querySelector<HTMLCanvasElement>('#canvas') } catch { return null }
  }
  function mouse(x: number, y: number, down: boolean) {
    const canvas = getCanvas()
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const options: MouseEventInit = { bubbles: true, cancelable: true, button: 0, buttons: down ? 1 : 0, clientX: rect.left + x, clientY: rect.top + y, view: frame.contentWindow! }
    if (down) canvas.dispatchEvent(new MouseEvent('mousemove', { ...options, buttons: 0 }))
    canvas.dispatchEvent(new MouseEvent(down ? 'mousedown' : 'mouseup', options))
    if (!down) canvas.dispatchEvent(new MouseEvent('click', options))
  }
  function key(name: string, code: number, down: boolean) {
    const canvas = getCanvas()
    if (!canvas) return
    const event = new KeyboardEvent(down ? 'keydown' : 'keyup', { key: name, code: name === ' ' ? 'Space' : name, bubbles: true, cancelable: true, view: frame.contentWindow! })
    Object.defineProperty(event, 'keyCode', { get: () => code })
    Object.defineProperty(event, 'which', { get: () => code })
    canvas.dispatchEvent(event)
  }
  function action(name: string, down: boolean) {
    if (name === 'start') { mouse(25, 44, down); return }
    if (name === 'left') { key('ArrowLeft', 37, down); mouse(100, 210, down); return }
    if (name === 'right') { key('ArrowRight', 39, down); mouse(306, 210, down); return }
    key(' ', 32, down)
    mouse(203, 210, down)
  }
  function releaseAll() {
    for (const name of pointers.values()) action(name, false)
    pointers.clear()
  }
  function pointerDown(event: PointerEvent) {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-action]')
    if (!button) return
    event.preventDefault()
    button.setPointerCapture(event.pointerId)
    const name = button.dataset.action!
    pointers.set(event.pointerId, name)
    action(name, true)
  }
  function pointerUp(event: PointerEvent) {
    const name = pointers.get(event.pointerId)
    if (!name) return
    event.preventDefault()
    action(name, false)
    pointers.delete(event.pointerId)
  }
  function visibility() { if (document.hidden) releaseAll() }
  function onBack(event: MouseEvent) { event.preventDefault(); navigate() }

  frame.addEventListener('load', () => {
    readyTimer = window.setInterval(() => {
      if (destroyed) return
      try {
        const output = frame.contentDocument?.querySelector<HTMLTextAreaElement>('#output')?.value ?? ''
        if (output.includes('Showing Window')) {
          loading.classList.add('hidden')
          window.clearInterval(readyTimer)
        }
      } catch { /* frame will be retried */ }
    }, 250)
  })
  controls.addEventListener('pointerdown', pointerDown)
  controls.addEventListener('pointerup', pointerUp)
  controls.addEventListener('pointercancel', pointerUp)
  document.addEventListener('visibilitychange', visibility)
  back.addEventListener('click', onBack)
  cleanup = () => {
    destroyed = true
    releaseAll()
    observer.disconnect()
    window.clearInterval(readyTimer)
    document.removeEventListener('visibilitychange', visibility)
    frame.src = 'about:blank'
  }
}

function render() {
  cleanup?.()
  cleanup = undefined
  const id = new URLSearchParams(location.search).get('game')
  const game = id ? gameById.get(id) : undefined
  if (game) renderGame(game)
  else renderMenu()
}

window.addEventListener('popstate', render)
render()
