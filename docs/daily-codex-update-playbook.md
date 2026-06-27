# Drugnews Daily Codex Update Playbook

每天打開 Codex 後，先用這份流程把社群文章更新到官網。目標是：少猜、少重跑、保留完整正文與圖片、同步中文站與英文站。

## 1. 先跑一鍵檢查

每天打開 Codex 後，優先跑這個單一入口：

```bash
/bin/zsh scripts/codex_daily_start.sh
```

它會依序完成：

- PM 健康檢查
- 確認專用 Chrome 抓文環境
- 嘗試 FB / Dcard 抓取、去重、匯入與發布
- 引用與延伸閱讀 QA
- 再跑一次 PM 健康檢查
- 輸出目前 `git status`

狀態檔會留在：

- `/private/tmp/drugnews-codex-daily-status.json`
- `/private/tmp/drugnews-codex-pm-health.json`

若只想快速看網站是否落後、SEO / AI 可讀檔是否完整、引用與延伸閱讀是否通過，再單獨跑：

```bash
/Users/jojo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node scripts/audit_daily_pm_health.mjs
```

若輸出 `social_status.status` 是 `needs_capture`，再進入社群抓取流程。

第一次使用，或看到 Chrome remote debugging 不可用時，先開專用抓文 Chrome：

```bash
npm run chrome:social
```

若目前環境沒有 `npm`，直接跑：

```bash
/bin/zsh scripts/start_social_capture_chrome.sh
```

這會打開專門給 Drugnews 更新文章用的 Chrome profile。請在這個視窗登入 Facebook 與 Dcard；登入狀態會保留，之後每天通常不用重登。

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
- `needs_capture` 且 diagnostics 沒候選：先跑 `npm run chrome:social`，確認專用 Chrome 已登入 FB / Dcard，再重跑一次抓取。
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
- `news-sitemap.xml` 應包含最近 48 小時的公開文章，`robots.txt` 應宣告一般 sitemap 與 news sitemap。
- 每天至少跑一次引用檢查，不能讓省略網址繼續累積：

```bash
/Users/jojo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node scripts/audit_references.mjs --limit=30
```

若輸出 `truncated_url_articles` 大於 0，優先修最新文章的參考資料：補來源名、來源類型、日期與完整 URL；找不到可靠來源時要明確列為待補，不可自行猜網址。

每天也跑一次閱讀路徑檢查，確保最新文章底部不是單純推「最新」，而是至少 2 / 3 與原文有同標籤或同主題訊號：

```bash
/Users/jojo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node scripts/audit_reader_experience.mjs --limit=30
```

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
