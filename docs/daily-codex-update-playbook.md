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
- 英文版圖片本地化 QA
- 再跑一次 PM 健康檢查
- 輸出目前 `git status`

狀態檔會留在：

- `/private/tmp/drugnews-codex-daily-status.json`
- `/private/tmp/drugnews-codex-pm-health.json`

若只想快速看網站是否落後、SEO / AI 可讀檔是否完整、引用與延伸閱讀是否通過，再單獨跑：

```bash
/Users/jojo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node scripts/audit_daily_pm_health.mjs
```

若 GA4 或 Google Search Console 仍顯示未設定，拿到追蹤碼後直接跑：

```bash
npm run tracking:configure -- --ga4=G-XXXXXXXXXX --gsc=GOOGLE_SEARCH_CONSOLE_TOKEN
```

這會更新 `content/site-settings.json` 並把追蹤碼注入所有 HTML 頁面。Search Console 若貼上整段 HTML meta tag，指令會自動抽出 content token。

若輸出 `social_status.status` 是 `needs_capture`，再進入社群抓取流程。

## 1B. 12 小時首席體驗官檢查點

每完成約 12 小時工作量，或完成一輪文章更新 / 網站體驗 / 搜尋曝光改善後，產出可交付檢查報告：

```bash
npm run checkpoint:cxo
```

若本機沒有 `npm`，使用：

```bash
/Users/jojo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node scripts/summarize_daily_status.mjs
```

報告會寫到 `/private/tmp/drugnews-codex-daily-report.md`，並列出：

- 今天是否有新文章匯入
- 官網最新文章
- FB / Dcard 抓取阻塞原因
- 網站 QA 與 PM health 警示
- 首席體驗官本輪應檢查的重點

## 1A. Codex 每日最省 token 路線

每天開 Codex 後，固定只做這個順序，不重新掃整個專案：

1. 讀 `README.md`、`package.json`、`scripts/daily_social_update_check.mjs`、`scripts/import_facebook_posts_to_content.mjs`、`scripts/import_dcard_scrape_to_content.mjs`、`scripts/publish_articles.mjs`、`git status --short`。
2. 跑 `/bin/zsh scripts/codex_daily_start.sh`。
3. 若使用者已提供最新 FB / Dcard 網址，直接帶入每日入口：`/bin/zsh scripts/codex_daily_start.sh --facebook-post=URL` 或 `/bin/zsh scripts/codex_daily_start.sh --dcard-post=URL`。
4. 若專用 social-capture Chrome 抓不到 FB / Dcard，先改讀「目前已打開的單篇文章分頁」：`/bin/zsh scripts/codex_daily_start.sh --facebook-current` 或 `/bin/zsh scripts/codex_daily_start.sh --dcard-current`。
5. 若兩條路線都被登入牆或平台防爬擋住，停止，不猜內容；只要求使用者提供最新貼文網址，或全文加圖片。
6. 有資料才匯入、重建、QA、提交與部署。

2026-06-28 實測可行的 FB 備援路線：專用 Chrome profile 仍可能只抓到登入外殼，但日常 Chrome 若已登入 Facebook，可用 permalink 頁讀到完整長文與圖片。這條路只用於抓公開貼文正文與圖，不處理留言、互動數或私人資料。

固定原則：不要把 FB / Dcard API 當成必要條件。主路線永遠是「已登入 Chrome 頁面 → 正文與圖片 → 站內文章」，API 或公開 JSON 只作為加速檢查，不作為唯一來源。

若 Dcard profile 只載出個人頁頭部、沒有文章連結，直接改用單篇網址模式：

```bash
/bin/zsh scripts/codex_daily_start.sh --dcard-post="https://www.dcard.tw/f/persona_drugnews/p/POST_ID"
```

這比反覆重刷 profile 更省時間，也能保留正文分段與圖片。

若你已經把最新文章頁打開在 Chrome 裡，不需要複製網址，直接跑目前分頁模式：

```bash
/bin/zsh scripts/codex_daily_start.sh --dcard-current
/bin/zsh scripts/codex_daily_start.sh --facebook-current
```

這會從目前對應平台分頁讀正文與圖片，是 profile 頁被擋時最省 token、最穩的日常路線。

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
- 英文版每篇文章要像英文讀者會讀的文章，不只是中文直譯；圖片文字也要英文化。
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

每天也跑一次英文圖片本地化檢查，避免英文頁直接混入中文社群圖片：

```bash
/Users/jojo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node scripts/audit_english_localization.mjs
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
