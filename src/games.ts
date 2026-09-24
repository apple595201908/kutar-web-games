export type Control = 'single' | 'sides' | 'direct'

export interface Game {
  id: string
  name: string
  original: string
  control: Control
  description: string
}

export const games: Game[] = [
  { id: 'balloon', name: '風船大派送', original: 'クターのフウセン', control: 'sides', description: '把風船交給前來的客人。' },
  { id: 'chan', name: '刀劍對決', original: 'クターのチャンバラ', control: 'sides', description: '迎擊左右出現的對手。' },
  { id: 'concert', name: '演唱會工作人員', original: 'クターのコンサートスタッフ', control: 'sides', description: '把跑向舞台的觀眾推回原位。' },
  { id: 'endroll', name: '特技謝幕', original: 'クターのエンドロール', control: 'sides', description: '騎機車閃避特技用火藥，越貼近危險邊緣分數越高。' },
  { id: 'HipDance', name: '臀舞', original: 'クターのヒップダンス', control: 'sides', description: '記住前兩位舞者的左右手動作，按節奏重現。' },
  { id: 'hvst', name: '豐收', original: 'クターのハーベスト', control: 'sides', description: '長按左鍵或右鍵移動收割機，避開障礙並收割作物。' },
  { id: 'ikki', name: '一口氣喝完', original: 'クターの一気ノミ', control: 'single', description: '連點喝奶；過快會把牛奶噴出來。' },
  { id: 'kodomo', name: '這孩子是誰的？', original: 'クターのこのコだれのコ?', control: 'direct', description: '根據兩隻クター的顏色，選出牠們孩子的顏色。' },
  { id: 'kona', name: '粉工廠', original: 'クターの粉', control: 'sides', description: '接住左右落下的粉末，別讓它灑出去。' },
  { id: 'lift', name: '纜車', original: 'クターのリフト', control: 'single', description: '抓準乘上纜車的時機。' },
  { id: 'makyu', name: '魔球', original: 'クターのマキュー', control: 'single', description: '抓準球路揮棒。' },
  { id: 'manu', name: '漢堡工廠', original: 'クターのマニュファクチュア', control: 'direct', description: '動手完成輸送帶上接連送來的食物。' },
  { id: 'musa', name: '飛鼠', original: 'クターのムササビ', control: 'single', description: '披上布飛行，收集掛在氣球下的蘋果。' },
  { id: 'nawa', name: '跳繩', original: 'クターのナワトビ', control: 'single', description: '看準節奏跳過繩子。' },
  { id: 'rocket', name: '火箭', original: 'クターのロケット', control: 'sides', description: '在太空中閃避隕石。' },
  { id: 'rodeo', name: '牛仔', original: 'クターのロデオ', control: 'sides', description: '左右維持平衡。' },
  { id: 'santa', name: '聖誕老人', original: 'クターのサンタ', control: 'sides', description: '把禮物送到對的位置。' },
  { id: 't-shirt', name: 'T 恤', original: 'クターのTシャツ', control: 'sides', description: '穿上掉下來的 T 恤，小心別把褲子套在頭上。' },
  { id: 'tube', name: '雪地滑行', original: 'クターのチューブライダー', control: 'single', description: '沿著雪坡持續彈跳。' },
  { id: 'apple', name: '盡情摘蘋果', original: 'クターの取り放題!', control: 'sides', description: '用背上的籃子接住落下的蘋果。' },
]

export const gameById = new Map(games.map(game => [game.id, game]))
