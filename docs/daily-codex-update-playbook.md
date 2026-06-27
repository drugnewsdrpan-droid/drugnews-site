# Drugnews Daily Codex Update Playbook

每天打開 Codex 後，先用這份流程把社群文章更新到官網。目標是：少猜、少重跑、保留完整正文與圖片、同步中文站與英文站。

## 1. 先跑一鍵檢查

```bash
/bin/zsh scripts/daily_social_update.sh --capture-facebook --capture-dcard
```

這個指令會嘗試讀取已登入的 Chrome 裡的 Facebook 與 Dcard 頁面。若有新文章，會自動匯入、發布、重建搜尋索引、英文站、主題頁、公司頁、analytics 與 sitemap。

若本機沒有 `npm` 或一般 `node`，使用專案內建的保底路線：

```bash
/Users/jojo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node scripts/daily_social_update_check.mjs --capture-facebook --capture-dcard
```

## 2. 判讀輸出

- `imported_posts` 有文章：檢查新文章頁、圖片、手機版首屏、英文版與搜尋索引，確認後提交部署。
- `needs_capture` 且 diagnostics 沒候選：代表平台沒有吐出可讀內容，先開已登入 Chrome 到 FB / Dcard 最新貼文，再重跑一次。
- FB 若只抓到「官網上線公告」或課程/活動文，不可匯入成文章；繼續找長文候選，最多兩輪。
- Dcard 以 `https://www.dcard.tw/@drugnews` 最新公開貼文為準；若最新貼文已在網站上，回報「已同步」即可，不新增重複文章。
- 仍無法抓到：請使用者提供最新貼文網址或完整貼文文字與圖片，不要猜內容。

## 3. 必做 QA

每次有新文章都檢查：

- 正文是否保留原本分段。
- 圖片是否依文章邏輯插入，不只放封面。
- 首頁頭版是否使用免費文章，不用付費文章。
- 英文版是否同步，英文圖不要直接用中文圖。
- 英文圖若含關鍵文字，優先用「乾淨底圖或程式精準排字」，不要讓 AI 直接亂生小字。
- 參考資料不要有截斷網址，至少要是可點、可辨識的一手來源或明確媒體來源。
- 手機 390px 第一屏要看得到正文第一段開頭。

## 4. 英文圖表修正

寶泰英文版的估值圖二可重建：

```bash
npm run figure:protect:en:valuation
```

這會輸出：

- `assets/articles/protect-pet-medical-roche-platform-en/figure-02-en.png`
- `content/published/protect-pet-medical-roche-platform-en/images/figure-02-en.png`

## 5. 提交範圍

只提交本次產生或修正的文章、圖片、索引、sitemap、feed 與必要腳本。不要混入既有未提交圖片或其他無關改動。
