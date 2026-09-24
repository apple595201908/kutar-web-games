import './style.css'
import { gameById, games, type Game } from './games'

const root = document.querySelector<HTMLDivElement>('#app')!
const asset = (path: string) => `${import.meta.env.BASE_URL}${path}`
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
let cleanup: (() => void) | undefined
let hasLaunchedGame = false
const preloads = new Map<string, Promise<ArrayBuffer>>()

declare global {
  interface Window {
    __kutarTakePreload?: (url: string) => Promise<ArrayBuffer> | undefined
  }
}

function preload(path: string) {
  const url = new URL(asset(path), location.href).href
  const existing = preloads.get(url)
  if (existing) return existing
  const pending = fetch(url).then(async response => {
    if (!response.ok) throw new Error(`Unable to preload ${path}: ${response.status}`)
    return response.arrayBuffer()
  })
  preloads.set(url, pending)
  void pending.then(() => {
    // Keep the downloaded bytes briefly for an imminent launch; the browser
    // HTTP cache handles later visits without retaining 37 MB in this page.
    window.setTimeout(() => {
      if (preloads.get(url) === pending) preloads.delete(url)
    }, 30_000)
  }, () => {
    if (preloads.get(url) === pending) preloads.delete(url)
  })
  return pending
}

window.__kutarTakePreload = url => {
  const pending = preloads.get(url)
  preloads.delete(url)
  return pending
}

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
        <p class="hero-copy">選一款遊戲，直接在瀏覽器裡玩。以原版 400 × 300 畫面與美術呈現。</p>
        <p class="first-release">第一版體驗中：20 款已在桌面瀏覽器進入遊戲；iPhone Safari 相容模式與部分操作、音效、計分仍待實玩確認。首次載入可能較久。</p>
        ${hasLaunchedGame || isIOS ? '' : '<p class="runtime-status" role="status">正在預先準備遊戲執行環境…</p>'}
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
  if (!hasLaunchedGame && !isIOS) {
    const status = root.querySelector<HTMLElement>('.runtime-status')!
    void preload('emulator/boxedwine.zip').then(() => {
      if (status.isConnected) status.textContent = '遊戲執行環境已備妥，選好就能開始。'
    }, () => {
      if (status.isConnected) status.textContent = '預先載入未完成，選擇遊戲後會重試。'
    })
  }
  if (!isIOS) root.querySelectorAll<HTMLAnchorElement>('[data-game]').forEach(link => {
    const warmGame = () => preload(`emulator/games/${link.dataset.game!.toLowerCase()}.zip`)
    link.addEventListener('pointerdown', warmGame, { once: true })
    link.addEventListener('focus', warmGame, { once: true })
  })
}

function renderGame(game: Game) {
  hasLaunchedGame = true
  if (!isIOS) {
    preload('emulator/boxedwine.zip')
    preload(`emulator/games/${game.id.toLowerCase()}.zip`)
  }
  document.title = `${game.name}｜Kutar 網頁遊戲大集合`
  const src = asset(`emulator/boxedwine.html?v=launch-4&app=${encodeURIComponent(game.id.toLowerCase())}&p=${encodeURIComponent(game.id + '.exe')}&resolution=406x365&controls=${game.control}${isIOS ? '&storage=memory&safe=1' : ''}`)
  root.innerHTML = `
    <main class="play-page">
      <nav class="play-nav"><a class="back-link" href="${escapeHtml(gameUrl().toString())}" data-back>← 返回遊戲選單</a><span>KU<span class="brand-red">T</span>AR / ${escapeHtml(game.original)}</span></nav>
      <div class="play-heading"><p class="eyebrow">NOW PLAYING</p><h1>${escapeHtml(game.name)}</h1><p>${escapeHtml(game.original)}</p></div>
      <div class="play-layout">
        <div class="game-column">
          <div class="stage" aria-label="${escapeHtml(game.name)} 原版遊戲視窗"><iframe class="game-frame" title="${escapeHtml(game.name)} 遊戲" src="${src}" scrolling="no" allow="autoplay" loading="eager"></iframe><div class="stage-loading" role="status"><span class="loader"></span>正在啟動原版遊戲…</div></div>
          <div class="controls" aria-label="觸控操作">
            <button class="start-button" data-action="start" type="button">▶ 開始 / 重玩</button>
            ${game.control === 'sides' ? `<div class="side-controls"><button data-action="left" type="button">← 左半邊</button><button data-action="right" type="button">右半邊 →</button></div>` : game.control === 'single' ? `<button class="action-button" data-action="tap" type="button">${game.id === 'ikki' ? '連點喝奶' : '點按 / 動作'}</button>` : `<p class="direct-hint">請直接點選遊戲畫面中的目標</p>`}
          </div>
        </div>
        <aside class="play-help"><div class="help-card"><p class="eyebrow">HOW TO PLAY</p><h2>操作方式</h2><p>${escapeHtml(game.description)}</p><p>等原版標題畫面出現後，按「開始 / 重玩」或鍵盤 F5。鍵盤與滑鼠可沿用原版操作；手機可點遊戲畫面或下方大按鍵。</p>${game.id === 'ikki' ? '<p class="game-caveat">第一版已知問題：網頁版連點喝奶的反應尚未確認，歡迎先試玩並回報。</p>' : ''}${isIOS ? '<p class="game-caveat">iPhone 相容模式暫不保存遊戲內的分數。</p>' : ''}<p class="game-caveat">第一版體驗中：手機操作、音效及完整計分流程仍待實玩確認。</p></div><div class="help-card mini"><span>原始畫面</span><strong>400 × 300</strong><span>完整等比例顯示</span></div></aside>
      </div>
    </main>`

  const frame = root.querySelector<HTMLIFrameElement>('.game-frame')!
  const stage = root.querySelector<HTMLElement>('.stage')!
  const loading = root.querySelector<HTMLElement>('.stage-loading')!
  const back = root.querySelector<HTMLAnchorElement>('[data-back]')!
  const controls = root.querySelector<HTMLElement>('.controls')!
  const pointers = new Map<number, string>()
  const pressedAt = new Map<string, number>()
  const releaseTimers = new Map<string, number>()
  let readyTimer: number | undefined
  let errorTimer: number | undefined
  let destroyed = false

  const resize = () => stage.style.setProperty('--scale', String(stage.clientWidth / 406))
  const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(resize)
  observer?.observe(stage)
  window.addEventListener('resize', resize)
  resize()

  function getCanvas() {
    try { return frame.contentDocument?.querySelector<HTMLCanvasElement>('#canvas') } catch { return null }
  }
  function mouse(x: number, y: number, button: number, down: boolean) {
    const canvas = getCanvas()
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const buttons = [...new Set(pointers.values())].reduce((mask, name) => mask | (name === 'right' ? 2 : name === 'left' || name === 'tap' ? 1 : 0), 0)
    const options: MouseEventInit = { bubbles: true, cancelable: true, button, buttons, clientX: rect.left + x, clientY: rect.top + y, view: frame.contentWindow! }
    if (down) canvas.dispatchEvent(new MouseEvent('mousemove', { ...options, button: -1 }))
    canvas.dispatchEvent(new MouseEvent(down ? 'mousedown' : 'mouseup', options))
    if (!down && button === 0) canvas.dispatchEvent(new MouseEvent('click', options))
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
    if (name === 'start') { key('F5', 116, down); return }
    if (name === 'left') { mouse(100, 210, 0, down); return }
    if (name === 'right') { mouse(306, 210, 2, down); return }
    mouse(203, 210, 0, down)
  }
  function releaseAll() {
    const names = new Set(pointers.values())
    for (const [name, timer] of releaseTimers) {
      window.clearTimeout(timer)
      names.add(name)
    }
    releaseTimers.clear()
    pressedAt.clear()
    pointers.clear()
    for (const name of names) action(name, false)
  }
  function pointerDown(event: PointerEvent) {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-action]')
    if (!button) return
    event.preventDefault()
    button.setPointerCapture(event.pointerId)
    const name = button.dataset.action!
    if (pointers.has(event.pointerId)) return
    const pending = releaseTimers.get(name)
    if (pending !== undefined) {
      window.clearTimeout(pending)
      releaseTimers.delete(name)
      action(name, false)
    }
    const alreadyDown = [...pointers.values()].includes(name)
    pointers.set(event.pointerId, name)
    if (!alreadyDown) {
      pressedAt.set(name, performance.now())
      action(name, true)
    }
  }
  function pointerUp(event: PointerEvent) {
    const name = pointers.get(event.pointerId)
    if (!name) return
    event.preventDefault()
    pointers.delete(event.pointerId)
    if ([...pointers.values()].includes(name)) return
    const elapsed = performance.now() - (pressedAt.get(name) ?? 0)
    const delay = event.type === 'pointercancel' ? 0 : Math.max(0, 120 - elapsed)
    pressedAt.delete(name)
    if (!delay) action(name, false)
    else releaseTimers.set(name, window.setTimeout(() => {
      releaseTimers.delete(name)
      if (!destroyed) action(name, false)
    }, delay))
  }
  function visibility() { if (document.hidden) releaseAll() }
  function onBack(event: MouseEvent) { event.preventDefault(); navigate() }

  function showLoadFailure() {
    if (destroyed || loading.classList.contains('hidden')) return
    loading.innerHTML = '<span>遊戲未能啟動。</span><button type="button" data-retry>重新嘗試</button>'
  }
  function onLoadingClick(event: MouseEvent) {
    if (!(event.target as HTMLElement).closest('[data-retry]')) return
    loading.innerHTML = '<span class="loader"></span>正在重新啟動原版遊戲…'
    window.clearTimeout(errorTimer)
    errorTimer = window.setTimeout(showLoadFailure, 90_000)
    frame.src = `${src}&retry=${Date.now()}`
  }
  function onRuntimeMessage(event: MessageEvent) {
    if (event.origin !== location.origin || event.source !== frame.contentWindow || event.data?.type !== 'kutar-launch-error') return
    showLoadFailure()
  }
  errorTimer = window.setTimeout(showLoadFailure, 90_000)
  readyTimer = window.setInterval(() => {
    if (destroyed) return
    try {
      const output = frame.contentDocument?.querySelector<HTMLTextAreaElement>('#output')?.value ?? ''
      if (output.includes('Showing Window')) {
        loading.classList.add('hidden')
        window.clearInterval(readyTimer)
        window.clearTimeout(errorTimer)
      }
    } catch { /* frame will be retried */ }
  }, 250)
  loading.addEventListener('click', onLoadingClick)
  window.addEventListener('message', onRuntimeMessage)
  controls.addEventListener('pointerdown', pointerDown)
  controls.addEventListener('pointerup', pointerUp)
  controls.addEventListener('pointercancel', pointerUp)
  document.addEventListener('visibilitychange', visibility)
  back.addEventListener('click', onBack)
  cleanup = () => {
    destroyed = true
    releaseAll()
    observer?.disconnect()
    window.removeEventListener('resize', resize)
    window.clearInterval(readyTimer)
    window.clearTimeout(errorTimer)
    document.removeEventListener('visibilitychange', visibility)
    window.removeEventListener('message', onRuntimeMessage)
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
