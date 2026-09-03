# 官方來源與事實邊界｜Anthropic MHS／Claude Science

## 一級來源

1. Anthropic，2026-08-27，〈Previewing the Model Hardware Standard〉  
   https://www.anthropic.com/news/model-hardware-standard-research-preview
2. Anthropic，2026-08-27，〈Expanding our support for scientists〉  
   https://www.anthropic.com/news/expanding-support-for-scientists
3. Anthropic，2026-06-30，〈Claude Science, an AI workbench for scientists, is now available〉  
   https://www.anthropic.com/news/claude-science-ai-workbench

## 逐項核對

| 主張 | 官方依據 | 可用寫法 | 禁止外推／限制 |
|---|---|---|---|
| MHS 定位 | Anthropic 稱其為供 AI 代理安全操作實體設備的 shared specification，現為 research preview | 「模型硬體標準研究預覽」「AI 與設備之間的共通標準層」 | 不寫「已成產業標準」「已全面接管實驗室」 |
| 開放範圍 | 首批科學研究機構與先進製造夥伴；尚未開源 | 「限量研究預覽，預計先建立安全評估與最佳實務」 | 不寫「任何人現在都能用」 |
| 相容條件 | 可用於有 programmable interface 的設備；不支援完全沒有程式介面的硬體 | 「只支援有可程式化介面的設備」 | 不寫「所有老儀器即插即用」 |
| 模型中立 | 官方稱 model-agnostic，可由標準協定存取 | 「理論上不限 Claude」 | 不推論其他模型已完成相容或實際部署 |
| 整合時間 | 官方總述稱傳統可需數週至數月，MHS 可降至數小時或數分鐘；個別 Baker 案例六台儀器不到一週 | 需把總述與個案分開 | 不把最短時間套用到所有實驗室 |
| 基因泰克 BCA | 概念驗證；三設備；Claude 找到水約 140 µL/s、BSA 約 10 µL/s，專家認為合理 | 可寫「在該設備與設定下找到合理參數」 | 不寫成通用最佳參數，不寫新藥發現成功 |
| 基因泰克限制 | 泡沫錯誤被 Claude 當成參數／程式問題，需要研究人員指導 | 「物理直覺仍不足，需專家監督」 | 不寫「AI 能自行處理所有故障」 |
| Baker／Pinglay | qPCR 遠端監控與停止、機械手臂／移液器微孔盤交接；六設備接入不到一週；均為 proofs of concept | 「示範降低監控與交接人力」 | 不寫「蛋白質發現全流程已自主運轉」 |
| 蛋白質成本 | 官方個案稱設計最低約 0.01 美元；實驗測試約 100 美元並需一週 labor per candidate | 需標示為該實驗室案例與估算 | 不寫成全產業平均成本 |
| Janelia | 顯微鏡設備整合、線上監控與代理控制；某 rig 將約半天手動設定化為一步 | 「降低設備設定與控制摩擦」 | 原文未支持「數週成像壓成一天」的廣泛說法，不採用 |
| QuEra 99.3% | 700 次盲測中 695 次恢復正確 lock；既有腳本約 58%、150 秒；最難擾動 10–14 秒 | 可用於明確限定的雷射鎖定恢復案例 | 不外推到生命科學實驗或所有硬體控制 |
| QuEra 限制 | 實體硬體故障時 Claude 不知如何排查；有時因風險判定等待人工批准而停一整夜 | 「安全過嚴會停機，物理故障仍需人」 | 不寫成無人值守已成熟 |
| 10,000 席 | 10,000 seats，為期一年；需由學術／非營利研究機構 PI 或同等者驗證後加團隊 | 「全球科學家方案 10,000 席」 | 不寫成任何個人科學家皆可直接領取 |
| 價格 | Standard 免費；Premium 具 5 倍用量，每月 15 美元，最長一年 | 可直接引用並註明方案條件 | 不寫永久免費或一般消費方案價格 |
| 額外點數 | 任一研究者可申請 AI for Science，每案最高 50,000 美元 credits | 「最高」而非保證取得 | 不寫成普發補助 |
| Claude Science | 2026-06-30 beta；Pro、Max、Team、Enterprise；整合常用工具、可稽核產物、運算資源、60+ skills/connectors | 「測試版科學工作台」 | 不寫成正式成熟產品或已完成監管驗證 |
| 夥伴生態 | AWS、Automata、Danaher、Doosan、MBF、QIAGEN、Tecan、Universal Robots 等的狀態從 support、testing、exploring 到 building driver 不等 | 一律寫「早期合作、測試或計畫支援名單」 | 不寫成已簽大額商業合約、已帶來營收 |
| 安全 | Anthropic 將在預覽期建立 safety evaluations、best practices、physical safety roadmap | 「安全框架仍在建立」 | 不寫成安全責任已解決 |

## 來源稿中未採用或降級的說法

- 「Claude 接管物理實驗室」：僅保留為讀者熟悉的話題背景，不作事實陳述。
- 「原本數週的成像實驗壓成 1 天」：三份指定官方來源未找到相同、可直接支持的廣泛敘述；不採用。
- 「AI 能自己生成完整操作說明書」：官方較精確說法是，驅動程式的自然語言標籤可協助生成設備參考檔；正文依此改寫。
- 「設備故障都能自行解決」：官方僅稱某些情況可恢復，並提供物理故障無法處理的反例。
- 「小公司必然受損」：屬產業推論，正文改寫成條件式，並區分低價值連接工作與高價值驗證整合。

## 醫療／投資邊界

- 所有生命科學案例都是研究或概念驗證，不構成新藥療效、安全或臨床成功證據。
- 夥伴名單不等於訂單、收入、獨家合作或投資推薦。
- 台灣段落只談能力與可能切入環節，不指定無公開合作證據的受益公司。
- 三版文末均有醫療與投資免責。

