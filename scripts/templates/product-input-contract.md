# 官網產業報告與單職缺交付接口

這是原網站publisher的排版／驗收接口，不是新作者、發布授權、會員系統或付款系統。
`render_product_template.mjs`只回傳HTML，正式放入官網仍沿原publisher、獨立驗收、正式版本及公開讀回。
`scripts/`由現有Pages流程排除，兩份`.tmpl`不作公開报告或職缺。

## 產業報告

`payload`包含`title, version, updated_at, source_owner, author, language, coverage, summary`。
正式包另含原publisher指定的`canonical_url`，限真實官網`/reports/*.html`固定網址；預覽無分享功能，不把localhost或暫存檔當正式網址。
`author`須是真實編輯／機構作者，且獨立回件有`author_attribution_verified=true`；「待原作者交稿」等占位文字只留預覽，不補林博士背書。
`language`為`zh-Hant`或`en`；`coverage`為`full`或`executive_summary`。
英文摘要頁明確顯示Executive Summary，不替未交付的完整英版製造內容或下載連結。

`sections`依原作者順序提供`id, heading, body, figure_indices`，正式包必須有唯一固定`id`；預覽才可回落章序號。`aliases`可保留舊錨點。
首次實際發布保存同版章節身份與錨點mapping；下一包`published_anchor_ids`／`published_anchor_map`取原已發布版本，不是新猜名單。
如更名，以`key`保持原章節身份、alias保持舊URL，發布後不因重排改指向；重排、刪舊錨點或挪給別章會被拒。
`figures`含原`src, alt, caption, language`，每圖必須有`source_url`或`source_urls`且對應有日期的`references`。
每圖由一個明確段落位置承接，不重生原圖，語言為`zh-Hant/en/mixed`，不把中文圖稱已英化。
`kind=quantitative`須有原圖可核的`key_info, unit, period, population`，在圖說下以可提取文字顯示；不是由publisher補數字。
`kind=mechanism`只需真`steps`與`evidence_scope`和來源，不強塞單位、期間、對象或虛數字。
`og_image`取同版已接受的原圖，含`src, alt, width, height`，真bytes/hash/尺寸仍由原publisher核收；有圖的正式包必須綁一張真OG圖。
原生分享只在讀者點擊時開啟裝置選擇；不可用退回固定整頁或本章URL複製，取消不覆寫剪貼簿。複製被拒時顯示可手選網址，不把重導算成功。
正式包`revisions`含每筆真`version, date, summary`，最後一筆對應當前版本，另有可見「版本與更正」區；不得編造已發生更正。
`references`逐筆含`title, url, date`；可重算資料與來源查核仍沿原内容owner交件。

`other_language`只放真的同版語言頁，含`href, language, label, version`。
首發主交付是已合格完整中文圖文HTML＋分享；不等待PDF、EN或雙格式layout一致。PDF不作首屏CTA或強制download。
`pdf`可選，只放真的已驗文件，含`path, public_href, language, version`；若附加，必須有同版`pdf_sha256`與`pdf_language`獨立回件。
缺檔或hash不符不得產生下載鏈接。免強制留email；會員或客戶專屬材料不作免費報告輸入。

接受資料另含`independent, author_id, reviewer_id, score, p0, p1, payload_sha256, article_ai_feel, image_ai_feel`。
hash按`payloadHash`的穩定JSON產生；原內容／每圖≥95、P0=P1=0及AI感各≤20規則保持。
欄位只是機械綁定，原生作者與獨立回件的真來源仍須原owner核收；檔案不授權發布。
`original_report_schema`承接作者同版HTML既有Report物件，獨立回件綁`original_report_schema_sha256=payloadHash(original_report_schema)`；原publisher以真版本核發布URL/datePublished/free存取標記，作者、headline、語言與canonical需對應同包。輸出只序列化這個已綁原物件，保留所有原欄位，不創新type/AI專用schema或補林博士背書。
真renderer產物須直接通過既有builder的Report解析／索引回歸，不能用測試另造JSON-LD代替。真合格報告進公開collection後，原search-ready adapter才把已核canonical／日期／作者的reportURL合併到原`ai-index.json.latest_articles`；0真報告不造空條目，也不改citation guidance或原文章列。

## 企業徵才

單一刊登包為官網一個職缺頁＋FB一則，首批NT$5,000未稅／職缺。
官網publisher不代FB操作、不認列付款、不接CV／篩選／推薦，不做獵頭佣金或錄用保證。

`payload`包含`title, company, location, employment_type, salary, responsibilities, requirements, official_apply_url, valid_through`與版本／來源欄位。
期限為企業確認的完整台北時間，官方Apply使用HTTPS；截至期限的輸出移除應徵CTA並顯示已截止。
接受資料須另外綁`employer_publication_confirmed, commission_evidence_ref`及原owner驗過的`payment_verified`或`included_in_existing_contract`。
企業委託／收款或年約已含權益與獨立内容QA俱全才接正式刊登；公開職缺搜尋不代付費委託。

## 本批預覽

預覽明確標示版型、noindex/nofollow，沒有真職缺、Report下載或JobPosting schema。
本批不調模型、API、timer、grant、DNS、金流或既有日更queue/LOCK。
