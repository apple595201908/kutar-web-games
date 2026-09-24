# Kutar 網頁遊戲大集合

以 20 款原版 Windows 小遊戲為基礎的瀏覽器合集。主選單可選擇遊戲，網址 `?game=<id>` 可直接開啟指定遊戲。遊戲視窗維持原始的 406 × 365 像素（包含 400 × 300 遊玩區），在小螢幕上完整等比例縮小。

## 目前進度

20 款執行檔已完成雜湊確認、素材提取和原生參考畫面擷取。20 款在本機 BoxedWine 網頁執行環境都已顯示原版標題與遊玩畫面；部分已看到分數變化、失敗結算和重新開始。各款的已驗證項目及待驗項目記於 [`reference/verification.md`](reference/verification.md)，已核對的原版操作與資料來源記於 [`reference/controls.md`](reference/controls.md)。觸控橋接的多指、左右切換、頁面隱藏釋放等邏輯有自動測試，但仍需在實際手機上驗證。依使用者要求，先發佈供真人遊玩回饋的第一版；原版節奏與所有遊戲的得分、結束條件尚未逐款通過對照。

原計畫是以 Canvas 2D 逐款重寫。實測後改用 [BoxedWine 26R1.0](https://github.com/danoon2/Boxedwine/releases/tag/26R1.0) 在瀏覽器內執行原始程式，以保留原版判定、動畫、美術與音效。BoxedWine 網頁版載入和開場速度偏慢；《マニュファクチュア》在測試機約需一分鐘才顯示標題。這仍須確認各款在瀏覽器中的速度、輸入和儲存行為；目前不能宣稱完整 1:1 驗收通過。

另外，模擬器目前把視窗標題及結算對話框中的日文顯示成亂碼；改設日文 `LANG` 後也未修復。這是原版畫面一致性尚未達標的另一項問題。

## 本機執行

需要 Node.js 24、npm 和 Python 3。原始 EXE 必須由已獲授權的來源提供，不納入 Git 歷史。

```powershell
python tools/package_games.py --source 'C:\path\to\original-games'
python tools/verify_packages.py
npm ci
npm run dev
```

開啟 Vite 提示的 `http://127.0.0.1:5173/kutar-web-games/`。首次載入遊戲會下載約 37 MB 的 Wine 執行環境；之後可使用瀏覽器快取。

```powershell
npm run build
npm test
```

`dist/` 是靜態網站。遊戲封裝檔 `public/emulator/games/*.zip` 已忽略，不會提交到 Git。`tools/package_games.py` 依 `public/assets/sources.json` 驗證 20 個原始執行檔後，產生可重現的 ZIP 封裝。部署工作流程從私人 GitHub Release 取得封裝檔、再次驗證 SHA-256，再建置並部署網站。只有儲存庫公開時才執行部署工作。

## 第三方元件

BoxedWine 依 GPL-2.0 授權；授權全文位於 [`public/emulator/LICENSE-boxedwine.txt`](public/emulator/LICENSE-boxedwine.txt)，對應原始碼參見 [上游 26R1.0 標籤](https://github.com/danoon2/Boxedwine/tree/26R1.0)。遊戲內容的權利屬原作者；本專案使用者已確認擁有改編、素材與公開遊玩所需授權。
