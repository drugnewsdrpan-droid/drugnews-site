# 官網產業報告與單職缺交付接口

這是原網站publisher的排版／驗收接口，不是新作者、發布授權、會員系統或付款系統。
`render_product_template.mjs`只回傳HTML，正式放入官網仍沿原publisher、獨立驗收、正式版本及公開讀回。
`scripts/`由現有Pages流程排除，兩份`.tmpl`不作公開报告或職缺。

## 產業報告

`payload`包含`title, version, updated_at, source_owner, author, language, coverage, summary`。
`language`為`zh-Hant`或`en`；`coverage`為`full`或`executive_summary`。
英文摘要頁明確顯示Executive Summary，不替未交付的完整英版製造內容或下載連結。

`sections`依原作者順序提供`heading, body, figure_indices`；`figures`含原`src, alt, caption, language`及可得`source_url`。
每圖由一個明確段落位置承接，不重生原圖，語言為`zh-Hant/en/mixed`，不把中文圖稱已英化。
`references`逐筆含`title, url, date`；可重算資料與來源查核仍沿原内容owner交件。

`other_language`只放真的同版語言頁，含`href, language, label, version`。
`pdf`只放真的已驗文件，含`path, public_href, language, version`；必須有同版`pdf_sha256`與`pdf_language`獨立回件。
缺檔或hash不符不得產生下載鏈接。免強制留email；會員或客戶專屬材料不作免費報告輸入。

接受資料另含`independent, author_id, reviewer_id, score, p0, p1, payload_sha256, article_ai_feel, image_ai_feel`。
hash按`payloadHash`的穩定JSON產生；原內容／每圖≥95、P0=P1=0及AI感各≤20規則保持。
欄位只是機械綁定，原生作者與獨立回件的真來源仍須原owner核收；檔案不授權發布。

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
