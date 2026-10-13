# 藥時事全自動化：層級、時鐘、秘密

原則：每件事放在最不需要判斷的那一層；當天不生產（存量 ≥4 天）；每層只被更機械的另一層檢查；每個排程跑完打心跳。

## 層級

| 層 | 誰 | 做什麼 | 時鐘 |
|---|---|---|---|
| 0 平台內建 | GitHub Pages、Meta 排程貼文、Dcard／CMoney／方格子預約、YouTube 排程 | 到點把存量發出去 | 平台自己 |
| 1 程式（本 repo） | `engine-inbox.yml`、`pages.yml`、`engine-health.yml` | 投遞箱驗證上線、部署、健康檢查＋自動再部署＋開 issue | **cron-job.org**（準時）；GitHub cron 只當備援（會晚數小時） |
| 2 AI 判斷 | Claude 排程任務 | Gmail 客戶回信、判別器評分、晨報、讀 status.json 決定叫誰補、週審計 | Claude 排程 |
| 3 AI 操作瀏覽器 | dots（Mac） | 寫文章進投遞箱（提前 4 天）、每週批次預約社群貼文、學校 Outlook | dots 自己 |
| 4 人 | 老闆 | 權杖、登入、簽約、付錢、報價 | — |

## 第 1 層檢查：`engine-health.yml` → `scripts/engine_health.mjs`

檢查項（只認結果）：

| id | 嚴重度 | 看什麼 |
|---|---|---|
| `today_article_exists` | critical | 投遞箱今天的中文包是 published |
| `today_article_200` | critical | 今天文章 URL 回 200 |
| `today_en_200` | warn | 英文版 URL 回 200 |
| `homepage_first_is_today` | critical | 首頁第一個 `articles/` 連結以今天日期開頭 |
| `tomorrow_package_ready` | warn（20:00 後 critical） | 明天的中文包 pending 或 published |
| `stock_days` | warn | 未來有幾天的包（目標 ≥4） |
| `no_rejected_packages` | warn | 投遞箱沒有退件 |

失敗處理：官網相關 critical 失敗 → 自動 `engine-inbox.yml`（今天的包還 pending 時）＋ `pages.yml` 各跑一次，9 分鐘後重核。仍失敗 → 開／更新 issue「引擎健康檢查失敗 YYYY-MM-DD」（label `engine-health`）；恢復後自動關閉。

結果：`engine-status` 分支的 `status.json`（最新）與 `history/`（最近 200 次）。
原始網址：`https://raw.githubusercontent.com/drugnewsdrpan-droid/drugnews-site/engine-status/status.json`
第 2 層（Claude 排程）讀這個檔決定要不要叫 dots 補或通知老闆，不再自己 curl。

本機試跑：`node scripts/engine_health.mjs --out /tmp/status.json`（加 `--offline` 不連網、`--date 2026-10-15` 指定日期）。

## 準時的時鐘：cron-job.org 設定（老闆一次性）

1. GitHub → Settings → Developer settings → Fine-grained tokens → 新增：Repository `drugnews-site`，Permissions → Actions: **Read and write**。複製權杖。
2. cron-job.org 建四個工作，全部：Method `POST`、Header `Authorization: Bearer <權杖>`、Header `Accept: application/vnd.github+json`、Body `{"ref":"main"}`、時區 Asia/Taipei、失敗通知開啟。

| 名稱 | URL | 時間 |
|---|---|---|
| inbox 每 2 小時 | `https://api.github.com/repos/drugnewsdrpan-droid/drugnews-site/actions/workflows/engine-inbox.yml/dispatches` | 07:40、09:40、11:40、13:40、15:40、17:40、19:40、21:40、23:40 |
| pages 08:02 | `.../workflows/pages.yml/dispatches` | 08:02 |
| health 08:30／09:40 | `.../workflows/engine-health.yml/dispatches` | 08:30、09:40 |
| health 21:10 | `.../workflows/engine-health.yml/dispatches` | 21:10 |

3. healthchecks.io 建一個 check「engine-health」，期望週期 1 天、寬限 2 小時；把 ping URL 貼到 repo secret `HC_PING_ENGINE_HEALTH`。心跳沒到或 `/fail` → healthchecks 直接 email／推播老闆，不經任何 AI。

## 秘密（repo Settings → Secrets）

| 名稱 | 用途 | 狀態 |
|---|---|---|
| `DRUGNEWS_QUEUE_KEY_B64*` | 排程佇列簽章（既有） | 已設 |
| `HC_PING_ENGINE_HEALTH` | 健康檢查心跳 | 待設 |
| `META_PAGE_TOKEN` | 投遞箱驗證時用 Graph API 建 FB 排程貼文（下一階段） | 待設 |

## 下一階段（交 Codex）

1. `engine-inbox.yml`：驗證通過且 meta 有 `fb.text` 且 `META_PAGE_TOKEN` 存在 → Graph API `POST /{page-id}/feed` 帶 `published=false&scheduled_publish_time=<publish_at>`，post id 寫回 `inbox-log.json`；`engine_health.mjs` 新增 `fb_post_exists`。
2. 影片：`engine-video.yml` 以 HeyGen API 出片、YouTube Data API `publishAt` 排程；dots 不再上傳。
3. 每個 workflow 結尾加 healthchecks ping。
