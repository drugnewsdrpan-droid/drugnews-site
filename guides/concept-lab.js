(() => {
  const guideData = {
    regulatory: {
      title: "FDA 法規節點怎麼看",
      path: "Path 03 · Regulatory Execution",
      number: "投資入門 02",
      deck: "IND、NDA、BLA、PDUFA 與 CRL 不是一串縮寫，而是一條會改變時間、成功機率與資本需求的審查路徑。",
      objectives: ["分辨申請、受理與核准", "知道 PDUFA 日期能說什麼", "從 CRL 原因判斷修補難度"],
      labHeading: "同一個法規事件，影響可能完全不同",
      labIntro: "切換送件、審查時鐘與 CRL 分流，理解市場 headline 背後真正改變的風險。",
      progressId: "regulatory-milestones",
      english: "../en/",
      modes: [
        { id: "submission", label: "送件路徑", sub: "IND → NDA / BLA", visual: "申請不等於核准", kicker: "Submission Path", title: "先分辨公司走到哪一個法規動作", copy: "IND 通常在 FDA 收到後 30 天生效，除非 FDA 提前通知可開始或置於 clinical hold；這不等於 FDA 肯定試驗設計或產品。NDA 或 BLA 才是正式申請上市。", question: "這是 IND 生效、接受審查，還是核准上市？", limit: "把 IND 生效寫成 FDA 核准試驗或產品", caption: "流程為教學示意；IND 生效不等於 FDA 核准試驗結果或產品。" },
        { id: "pdufa", label: "審查時鐘", sub: "PDUFA", visual: "日期是決策目標，不是答案", kicker: "Review Clock", title: "PDUFA 是預計完成審查的日期", copy: "市場常把 PDUFA 視為二元事件，但結果可能包括核准、延長審查、限制標籤或 CRL。日期越近，投資人越要回到申請內容與剩餘風險。", question: "審查期間還有哪些未解決問題？", limit: "PDUFA 到期就一定核准" },
        { id: "crl", label: "補件分流", sub: "CRL", visual: "同一封 CRL，修補難度不同", kicker: "Complete Response", title: "CRL 要先拆原因，再談時間", copy: "療效、安全性、統計、CMC 與廠房缺失需要的補救方式完全不同。真正影響價值的是是否要重做試驗、能否只補文件，以及供應鏈能否被修復。", question: "需要新試驗、補分析，還是修正製造？", limit: "所有 CRL 都只是行政補件" }
      ],
      lead: "法規語言的難點，不是縮寫太多，而是每一個動作都只回答一個有限問題。投資人要把申請、審查、查廠、標籤與最終決策分開。",
      sections: [
        { id: "ind", title: "IND 生效／未被臨床暫停：得開始人體試驗", body: "IND 整合臨床前安全性、製造資訊與預定臨床方案。FDA 可在審查期間提出問題或 clinical hold；IND 生效不等於 FDA 已核准試驗結果、肯定試驗設計或核准產品。", example: "讀公司公告時，先確認是 IND submitted、IND effective / cleared，還是 first patient dosed；三者代表的執行進度不同。" },
        { id: "nda-bla", title: "NDA / BLA：把產品完整故事交給監管機關", body: "NDA 用於新藥，BLA 用於生物製劑。申請內容不只包括臨床資料，還包括非臨床、CMC、標籤、風險管理與製造設施。任何一層不可信，都可能影響核准。" },
        { id: "decision", title: "PDUFA 與 CRL：把事件拆成可修補與不可修補", body: "PDUFA 是審查目標日期；CRL 表示目前資料不足以核准。投資人最該問的是缺口在哪一層、補救需要多久、需要多少資本，以及補完後是否仍保有商業優勢。" }
      ],
      checklist: ["先確認事件動詞：submitted、accepted、cleared、approved", "找出臨床、統計、CMC、查廠與標籤的剩餘風險", "估算補件是否需要新試驗與額外資本", "把法規時間表連回現金跑道與商業化準備"],
      terms: [["IND", "人體臨床試驗前的研究用新藥申請。"], ["NDA", "小分子等新藥的上市申請。"], ["BLA", "生物製劑的上市申請。"], ["PDUFA", "FDA 預計完成審查並採取行動的目標日期。"], ["CRL", "FDA 認為目前申請尚不能核准的完整回覆函。"]],
      sources: [["21 CFR § 312.40 — General requirements for use of an investigational new drug", "https://www.ecfr.gov/current/title-21/chapter-I/subchapter-D/part-312/subpart-B/section-312.40", "核對 IND 一般於 FDA 收到後 30 天生效，以及 clinical hold 的法規條件。"], ["FDA — Enclosure: PDUFA Reauthorization Performance Goals and Procedures", "https://www.fda.gov/industry/prescription-drug-user-fee-amendments/enclosure-pdufa-reauthorization-performance-goals-and-procedures", "核對 review goal、action date 與重大修訂可能延長審查時鐘。"], ["FDA — Complete Response Letter Final Rule", "https://www.fda.gov/drugs/laws-acts-and-rules/complete-response-letter-final-rule", "核對 CRL 代表審查週期完成，但申請目前尚不能核准。"]]
    },
    "safety-cmc": {
      title: "安全性與 CMC 風險怎麼看",
      path: "Path 03 · Safety & Manufacturing",
      number: "投資入門 03",
      deck: "療效漂亮只是第一步。產品還要能找到可用劑量、穩定製造、通過查廠，並在商業規模下維持一致品質。",
      objectives: ["分辨 AE、SAE 與 DLT", "理解治療窗為何限制價值", "看懂製程放大與查廠風險"],
      labHeading: "從安全窗到商業批次，風險是一條連續路徑",
      labIntro: "三張概念圖分別呈現劑量、安全窗、製程放大與查廠控制點。",
      progressId: "safety-cmc",
      english: "../en/",
      modes: [
        { id: "window", label: "治療窗", sub: "Efficacy vs Toxicity", visual: "有效劑量與毒性之間的空間", kicker: "Therapeutic Window", title: "藥有效，不代表能安全地給到有效劑量", copy: "在劑量反應框架中，MED 與 MTD 都必須對應預先定義的判定標準。MTD 依 protocol 設定的 DLT 門檻、毒性類型與整體安全性資料判定，不是固定百分比。", question: "MED 與 MTD 之間是否留有可用空間？", limit: "看到反應就忽略 DLT、停藥與減量" },
        { id: "scale", label: "製程放大", sub: "Scale-up", visual: "放大的是產能，也可能放大變異", kicker: "Manufacturing Scale-up", title: "實驗室批次成功，不等於商業批次穩定", copy: "從小試、中試到商業規模，設備、原料、參數與分析方法都會改變。公司必須證明關鍵品質屬性可被控制，批次之間仍具一致性。", question: "關鍵品質屬性與製程參數是否被控制？", limit: "把委外製造當成風險已外包", caption: "容量僅為概念示意，實際規模依產品、製程與設備而異。" },
        { id: "inspection", label: "查廠與放行", sub: "GMP", visual: "每個控制點都要留下可信證據", kicker: "Inspection Readiness", title: "查廠檢查的是系統，不只是一台設備", copy: "監管機關會看設施、資料完整性、偏差處理、無菌保證與批次放行。缺失若影響產品品質或資料可信度，就可能擋住核准。", question: "缺失會不會影響產品品質或資料可信度？", limit: "把所有查廠缺失視為同等嚴重" }
      ],
      lead: "越接近上市，CMC 越不是後台工作，而是產品本身的一部分。安全性決定能不能給，製造與品質系統決定能不能穩定供應。",
      sections: [
        { id: "safety", title: "AE、SAE、DLT：先分辨嚴重度與因果", body: "AE 是治療期間出現的不良事件；SAE 依死亡、住院等嚴重結果定義；DLT 則用於限制劑量遞增。投資人還要看與藥物的關聯、停藥率、減量率與是否具類別效應。" },
        { id: "window", title: "安全窗會改寫產品定位", body: "如果療效需要高暴露，但毒性讓病人無法維持劑量，產品即使有活性，也可能只能用在較後線或特定族群。真正的競爭力是效益風險，而不是最高反應數字。" },
        { id: "cmc", title: "CMC：把每一批藥做成同一個產品", body: "CMC 涵蓋原料、製程、分析方法、規格、安定性、包裝與設施。製程放大、技術轉移或更換廠址時，還要用可比性資料證明產品品質沒有改變。", example: "CRL 若核心是 CMC 或委託製造設施，投資人應追蹤補件是否只需文件，還是需要重做批次、方法驗證或再次查廠。" }
      ],
      checklist: ["把 AE、SAE、DLT、停藥與減量分開", "確認 MED 與 MTD 的判定標準及兩者距離", "確認商業規模、技轉與可比性進度", "追蹤查廠缺失是否影響品質、供應或資料完整性"],
      terms: [["AE", "治療期間發生的不良事件。"], ["SAE", "造成死亡、住院等嚴重結果的不良事件。"], ["DLT", "限制劑量繼續上升的毒性。"], ["CQA", "必須被控制的關鍵品質屬性。"], ["Comparability", "證明製程變更前後產品品質仍可比較。"]],
      sources: [["FDA — Optimizing the Dosage of Human Prescription Drugs and Biological Products for the Treatment of Oncologic Diseases", "https://www.fda.gov/regulatory-information/search-fda-guidance-documents/optimizing-dosage-human-prescription-drugs-and-biological-products-treatment-oncologic-diseases", "核對劑量選擇須綜合安全性、耐受性、活性與效益風險，不以單一 MTD 代表最佳劑量。"], ["FDA — Oncology Dosing Tool Kit", "https://www.fda.gov/about-fda/oncology-center-excellence/oncology-dosing-tool-kit", "延伸核對 DLT、dose-response、exposure-response 與劑量最佳化。"], ["FDA — Quality Systems Approach to Pharmaceutical Current Good Manufacturing Practice Regulations", "https://www.fda.gov/regulatory-information/search-fda-guidance-documents/quality-systems-approach-pharmaceutical-current-good-manufacturing-practice-regulations", "核對製程控制、偏差處理、資料完整性與品質系統。"]]
    },
    "market-sizing": {
      title: "市場規模怎麼看",
      path: "Path 04 · Market & Commercialization",
      number: "投資入門 04",
      deck: "市場不是病人數乘上藥價。真正能形成收入的，是被診斷、適合治療、獲得給付，而且最後選擇這個產品的病人。",
      objectives: ["分辨 TAM、SAM、SOM", "把定價與可及性一起看", "理解採用曲線為何需要時間"],
      labHeading: "把百億市場拆回一個可驗證的病人漏斗",
      labIntro: "三張概念圖顯示理論市場、給付限制與商業化速度如何逐層改寫收入。",
      progressId: "market-sizing",
      english: "../en/",
      modes: [
        { id: "funnel", label: "病人漏斗", sub: "TAM → SAM → SOM", visual: "每一層限制都會縮小市場", kicker: "Patient Funnel", title: "TAM 是天花板，不是收入", copy: "理論病人數要依序扣掉診斷率、治療資格、可服務地區、給付、競品與實際市占。漏斗每一層都應該有可查證的假設。", question: "從總病人數到真正可得病人，中間扣掉了什麼？", limit: "病人數 × 藥價就當作營收" },
        { id: "pricing", label: "定價與給付", sub: "Price × Access", visual: "單價與可及性必須一起成立", kicker: "Price and Access", title: "藥價提高，不一定讓市場價值同步提高", copy: "價格越高，單一病人收入越大，但支付方可能限制使用條件。慢性病、罕病、癌症與一次性療法的給付邏輯不同，不能只看標價。", question: "誰付錢？使用條件會不會縮小病人池？", limit: "高定價直接等於高峰值銷售" },
        { id: "adoption", label: "採用曲線", sub: "Commercial Uptake", visual: "上市只是起點，收入需要爬坡", kicker: "Adoption Curve", title: "醫師、病人與支付方的轉換都需要時間", copy: "新療法要完成醫師教育、通路建置、給付談判與病人轉換。競品、用藥便利性與安全性會決定曲線斜率，而不是上市後立刻吃下 SOM。", question: "放量瓶頸是醫師、給付、產能還是競品？", limit: "上市第一年就套用成熟滲透率" }
      ],
      lead: "市場規模的工作，是把每一個樂觀假設拆成能被檢查的分母。TAM 可以說明天花板，SAM 與 SOM 才開始接近公司真正有機會拿到的收入。",
      sections: [
        { id: "tam", title: "TAM、SAM、SOM：從理論市場走到可取得份額", body: "TAM 是理論最大市場；SAM 是公司在適應症、地區、給付與產品能力下可服務的市場；SOM 才是考慮競品、採用與執行後可能取得的份額。" },
        { id: "price", title: "定價要和給付能力一起建模", body: "高藥價可以提高單位收入，也可能換來更嚴格的使用條件。估值時應區分標價、實收價格、折讓、病人自付與不同地區支付能力。" },
        { id: "uptake", title: "滲透率是一條曲線，不是一個固定百分比", body: "醫師採用、病人辨識、通路與產能都需要時間。市場模型應該有上市爬坡、峰值年份與競品進場，而不是從第一年就假設成熟市占。", example: "看到公司宣稱『百億美元市場』時，先要求病人漏斗、價格來源、給付假設、競品與達到峰值所需年份。" }
      ],
      checklist: ["列出總病人、診斷、治療、給付與可取得病人", "區分標價、實收價與不同地區價格", "設定上市爬坡與競品進場時間", "用悲觀、基準、樂觀情境檢查敏感度"],
      terms: [["TAM", "理論上可服務的最大市場。"], ["SAM", "公司產品與地區實際能服務的市場。"], ["SOM", "考慮競爭與執行後可能取得的份額。"], ["Penetration", "產品在可服務市場中的實際滲透率。"], ["Adoption Curve", "市場從早期使用到成熟採用的時間曲線。"]],
      sources: [["NCI — Surveillance, Epidemiology, and End Results Program", "https://seer.cancer.gov/", "核對 incidence、prevalence、survival 與病人母數；疾病市場估算應回到可追溯流行病學資料。"], ["CMS — Medicare Part B Drug Average Sales Price", "https://www.cms.gov/medicare/payment/fee-for-service-providers/part-b-drugs/average-drug-sales-price", "核對 Medicare Part B 支付價格；標價、實收價與給付可及性不可混為一談。"]]
    },
    "bd-licensing": {
      title: "BD 授權條款怎麼讀",
      titleParts: ["BD 授權條款", "怎麼讀"],
      path: "Path 04 · Business Development",
      number: "投資入門 05",
      deck: "headline 總額很醒目，但真正落袋的是 upfront；真正長期影響價值的，則是里程碑難度、權利範圍與 royalty。",
      objectives: ["分辨 upfront 與總交易額", "看懂 milestone 觸發條件", "從權利範圍判斷交易含金量"],
      labHeading: "交易不是一個數字，而是一條風險分配路徑",
      labIntro: "把 upfront、milestone、royalty 與商業權利放回時間軸，才看得到誰承擔風險、誰保留上行。",
      progressId: "bd-licensing",
      english: "../en/",
      modes: [
        { id: "upfront", label: "簽約金", sub: "Upfront", visual: "最確定的錢，在交易一開始", kicker: "Cash at Signing", title: "Upfront 是交易對資產當下信心的第一個硬訊號", copy: "Upfront 通常在簽約後支付，確定性高於多年後的里程碑。比較交易時，還要看資產階段、競爭程度與公司讓出的權利。", question: "簽約時真正支付多少？讓出了什麼？", limit: "把總交易額全部當成收入" },
        { id: "milestone", label: "里程碑", sub: "Milestones", visual: "每一筆付款都有觸發條件", kicker: "Contingent Payments", title: "Milestone 要按臨床、法規與銷售難度拆開", copy: "臨床、法規與商業里程碑的成功機率不同。越遠期、越依賴高銷售門檻的金額，越不能和 upfront 用同樣權重計算。", question: "每一筆款項要跨過哪一個風險門檻？", limit: "把所有 milestone 視為必然發生" },
        { id: "royalty", label: "權利與分潤", sub: "Royalty", visual: "長期上行取決於權利與分潤", kicker: "Rights and Economics", title: "Royalty 與地區權利決定成功後還剩多少價值", copy: "全球或區域、單一適應症或整個平台、共同推廣或完全授權，會改變公司保留的商業選擇權。Royalty 還要看級距、淨銷售定義與期限。", question: "公司保留哪些地區、適應症與共同商業化權利？", limit: "只比較 royalty 百分比，不看權利範圍" }
      ],
      lead: "授權交易的核心不是『金額大不大』，而是開發風險、資本負擔與成功後上行如何在雙方之間重新分配。",
      sections: [
        { id: "upfront", title: "Upfront：最硬，但仍要放回交易背景", body: "Upfront 是簽約時的現金或短期應收款，通常最具確定性。金額高可能反映競爭激烈、資產去風險程度高，也可能因公司讓出更廣泛權利。" },
        { id: "milestone", title: "Milestone：先按觸發條件分層", body: "臨床里程碑、法規里程碑與銷售里程碑的時間與機率不同。交易 headline 的總額常把多年後、門檻很高的付款全部加總。" },
        { id: "rights", title: "Royalty 與權利範圍：決定成功後的剩餘價值", body: "Royalty 可能分級，也會受專利、地區與銷售定義影響。投資人應同時看誰負責開發、誰出資、誰掌握定價與商業化，以及公司是否保留選擇權。", example: "同樣是十億美元 headline，一筆可能有高 upfront 與全球共同開發，另一筆可能大多是遠期銷售里程碑；兩者含金量不能直接相比。" }
      ],
      checklist: ["先拆 upfront、近程里程碑與遠期里程碑", "標記每一筆付款的觸發條件與時間", "確認地區、適應症、平台與共同商業化權利", "把交易現金流連回公司現金跑道與後續支出"],
      terms: [["Upfront", "簽約時或短期內支付的確定性較高款項。"], ["Milestone", "達成臨床、法規或商業條件才支付的款項。"], ["Royalty", "依淨銷售額計算的長期分潤。"], ["Option", "在特定條件下取得或擴大權利的選擇權。"], ["Co-development", "雙方共同承擔開發成本與決策。"]],
      sources: [["WIPO — Exchanging Value: Negotiating Technology Licensing Agreements", "https://www.wipo.int/edocs/pubdocs/en/licensing/903/wipo_pub_903.pdf", "核對 upfront、milestone、royalty、權利範圍與風險分配的授權架構。"], ["SEC — Regulation S-K Compliance & Disclosure Interpretations", "https://www.sec.gov/rules-regulations/staff-guidance/corporation-finance-interpretations/regulation-s-k", "核對上市公司重大合約的揭露要求，並回查實際 licensing agreement 條款。"]]
    },
    "patent-cycle": {
      title: "專利與競爭週期怎麼看",
      path: "Path 04 · Patent & Competition",
      number: "投資入門 06",
      deck: "專利不是一個到期日，而是一組會被挑戰、延長、繞開或被新配方補強的權利。LOE 則會重新分配收入與 BD 需求。",
      objectives: ["分辨專利與法規排他性", "理解 LOE 對現金流的影響", "把專利懸崖連到大藥廠 BD"],
      labHeading: "產品生命週期，從保護期一路走到收入缺口",
      labIntro: "三張圖把核心專利、LOE 收入曲線與大藥廠管線補洞放在同一條時間軸。",
      progressId: "patent-cycle",
      english: "../en/",
      modes: [
        { id: "protection", label: "保護層", sub: "Patent Estate", visual: "產品通常有多層保護", kicker: "Protection Stack", title: "核心物質專利之外，還有配方、用途與法規排他性", copy: "產品生命週期可能同時受物質、製程、配方、給藥與用途專利保護，也可能有資料或孤兒藥排他性。每一層強度與到期時間不同。", question: "真正難以繞開的是哪一層保護？", limit: "只看一個最晚到期日" },
        { id: "loe", label: "專利懸崖", sub: "Loss of Exclusivity", visual: "排他性結束後，價格與市占可能重估", kicker: "LOE Curve", title: "LOE 不是收入立刻歸零，而是競爭結構改變", copy: "學名藥與生物相似藥的侵蝕速度不同，也受給付、替代規則與製造門檻影響。估值要模擬價格、市占與時間，而不是直接砍成零。", question: "競品何時進場、能用多快速度取代？", limit: "所有產品都套用同一個懸崖斜率" },
        { id: "bdgap", label: "管線補洞", sub: "BD Demand", visual: "收入缺口會推動外部創新需求", kicker: "Portfolio Renewal", title: "專利懸崖越近，大藥廠越需要下一條收入曲線", copy: "當成熟產品失去排他性，內部管線若補不上，大藥廠會透過授權與併購買時間、資產或平台。投資人要看缺口規模與買入資產品質。", question: "新產品能否在舊收入下滑前接上？", limit: "看到併購就認為增長缺口已解決" }
      ],
      lead: "產品價值不是只看峰值銷售，還要看能維持多久。專利、法規排他性、競品與生命週期管理共同決定現金流的長度。",
      sections: [
        { id: "estate", title: "專利組合：不是一張證書，而是一整套防線", body: "物質專利通常最核心；製程、配方、給藥、用途與組合專利可補強生命週期。投資人要看權利範圍、地域、被挑戰風險與是否容易設計繞開。" },
        { id: "loe", title: "LOE：把競爭進場速度放進現金流", body: "排他性結束後的侵蝕速度取決於產品類型、替代規則、製造難度與競品數量。小分子學名藥與複雜生物製劑不能套同一條下降曲線。" },
        { id: "renewal", title: "專利懸崖會重塑 BD 與併購需求", body: "大藥廠會比較內部研發與外部資產誰能更快補上收入缺口。被買的可能是去風險產品、平台能力，或能縮短開發時間的組織。", example: "看大型藥廠裁員或併購時，把成熟產品 LOE 年份、收入缺口與新管線預計上市時間排在同一條時間軸。" }
      ],
      checklist: ["列出核心專利、補強專利與法規排他性", "區分專利到期與競品實際上市時間", "依產品類型估算價格與市占侵蝕", "把 LOE 缺口連到內部管線與 BD 策略"],
      terms: [["LOE", "Loss of Exclusivity，排他性結束。"], ["Patent Estate", "圍繞一個產品建立的整套專利組合。"], ["Data Exclusivity", "監管法規給予的資料排他保護。"], ["Generic", "與原廠小分子藥具相同活性成分的學名藥。"], ["Biosimilar", "與參考生物製劑高度相似的生物相似藥。"]],
      sources: [["FDA — How can I better understand Patents and Exclusivity?", "https://www.fda.gov/industry/fda-basics-industry/how-can-i-better-understand-patents-and-exclusivity", "核對 patent 與 FDA exclusivity 是不同保護，起算點、範圍與挑戰機制也不同。"], ["USPTO — Patent term calculator", "https://www.uspto.gov/patents/laws/patent-term-calculator", "核對專利期限需依申請日、調整與延長計算，不能直接套用上市後固定年數。"], ["FDA — Orange Book Data Files", "https://www.fda.gov/drugs/drug-approvals-and-databases/orange-book-data-files", "查核核准小分子藥的專利與排他資訊。"]]
    },
    valuation: {
      title: "生技估值與競爭格局",
      path: "Path 05 · Valuation",
      number: "投資入門 07",
      deck: "估值模型不是答案，而是把市場、成功機率、上市時間、競品與資本需求攤開，看看哪一個假設最容易錯。",
      objectives: ["理解 rNPV 的四個核心變數", "知道何時使用 SOTP", "用敏感度而不是單一目標價思考"],
      labHeading: "把估值拆成可被臨床與商業事件改寫的假設",
      labIntro: "切換 rNPV、SOTP 與敏感度矩陣，觀察模型如何把不確定性轉成價值區間。",
      progressId: "valuation",
      english: "../en/",
      modes: [
        { id: "rnpv", label: "風險調整", sub: "rNPV", visual: "未來價值要經過機率與時間", kicker: "Risk-adjusted NPV", title: "rNPV 把遠期現金流、成功率與折現放在一起", copy: "峰值銷售不是今天的價值。模型要乘上開發成功機率、扣除時間折現與後續成本；任何一個假設變動，都可能大幅改寫結果。", question: "價值最敏感的是成功率、銷售、時間還是成本？", limit: "把模型輸出當成精確目標價" },
        { id: "sotp", label: "分部加總", sub: "SOTP", visual: "不同業務要用不同邏輯估值", kicker: "Sum of the Parts", title: "已上市產品、臨床資產與現金不能塞進同一倍數", copy: "SOTP 把穩定現金流、高風險管線、平台、CDMO 或現金分開評價，再檢查公司層級成本與折價。", question: "每一部分的風險與現金流性質相同嗎？", limit: "所有業務都套用同一個營收倍數" },
        { id: "sensitivity", label: "敏感度", sub: "Scenario Matrix", visual: "估值應該是一個區間", kicker: "Sensitivity Analysis", title: "先找最會改變結論的假設", copy: "成功率與峰值銷售通常會共同放大估值差異。用情境矩陣檢查悲觀、基準與樂觀條件，比只報一個數字更接近真實決策。", question: "哪兩個假設足以讓投資結論翻轉？", limit: "只展示最樂觀的單一路徑" }
      ],
      lead: "生技公司常沒有穩定獲利，本益比未必適用。估值要從產品是否能成功、何時上市、能賣多少與還要花多少錢開始。",
      sections: [
        { id: "rnpv", title: "rNPV：把成功機率與時間帶回模型", body: "rNPV 是風險調整淨現值。它將未來現金流折現後，再依開發階段與證據調整成功機率。成功率不是固定表格，應隨疾病、終點、競品與數據品質修正。" },
        { id: "sotp", title: "SOTP：多業務公司要拆開評價", body: "已上市產品、臨床管線、平台授權、CDMO 與現金的風險不同。分部加總可以避免用同一個倍數掩蓋差異，但仍要扣除公司成本與執行折價。" },
        { id: "competition", title: "競爭格局會同時改寫銷售與成功率", body: "競品更早上市、療效更好、使用更方便或給付更有利，都可能壓低峰值銷售，也可能提高試驗需要證明的門檻。模型不能和產業現況分離。", example: "估值更新不只在主要終點公布時發生。競品數據、FDA 標籤、BD 條款、募資與 CMC 延誤都會改寫同一組假設。" }
      ],
      checklist: ["先建立病人漏斗、價格、滲透率與峰值年份", "依證據與階段調整成功機率", "納入上市時間、開發成本與資本稀釋", "用敏感度矩陣找出會讓結論翻轉的變數"],
      terms: [["rNPV", "經成功機率調整後的淨現值。"], ["SOTP", "將不同資產或業務分開估值後加總。"], ["Peak Sales", "產品成熟期可能達到的最高年銷售。"], ["Discount Rate", "反映時間與資本風險的折現率。"], ["Sensitivity", "檢查假設變動對估值結果的影響。"]],
      sources: [["Svennebring & Wikberg (2013) — Net present value approaches for drug discovery", "https://link.springer.com/article/10.1186/2193-1801-2-140", "核對 rNPV 以成功機率、開發階段、成本、時點與未來現金流做風險調整的概念。"], ["Dando & Lebmeier (2020) — A novel valuation model for medical intervention development based on progressive dynamic changes", "https://link.springer.com/article/10.1186/s13731-019-0111-1", "延伸核對醫療產品開發中風險、成本、時程與未來現金流的估值框架。"]]
    },
    "cash-runway": {
      title: "財務與現金跑道怎麼看",
      path: "Path 05 · Capital & Runway",
      number: "投資入門 08",
      deck: "臨床公司最重要的財務問題，不是今天有多少現金，而是這些現金能不能撐到下一個會改變價值的里程碑。",
      objectives: ["計算基礎 burn rate 與 runway", "把燒錢速度和臨床階段連動", "理解募資時點與稀釋"],
      labHeading: "把現金、燒錢與里程碑放在同一條時間軸",
      labIntro: "三張圖解分別呈現現金何時用完、支出何時加速，以及募資如何改變股東持分。",
      progressId: "cash-runway",
      english: "../en/",
      modes: [
        { id: "runway", label: "現金跑道", sub: "Cash Runway", visual: "現金線要先跨過下一個里程碑", kicker: "Cash vs Milestone", title: "跑道不是幾個月，而是能不能抵達價值事件", copy: "用現金與季度 burn rate 可以得到粗略 runway，但真正重要的是主要數據、藥證或交易發生前，公司是否需要被迫募資。", question: "現金用完日和下一個催化事件，誰先到？", limit: "只用最近一季支出直線外推" },
        { id: "burn", label: "燒錢速度", sub: "Burn Rate", visual: "試驗放大時，斜率會突然變陡", kicker: "Changing Cost Base", title: "Phase III、建廠與上市準備會改變 burn rate", copy: "燒錢不是固定值。試驗人數、站點、製造批次、商業團隊與庫存準備都可能讓支出階梯式上升。", question: "未來四季有哪些支出會讓 burn 加速？", limit: "永遠沿用過去平均 burn rate" },
        { id: "dilution", label: "募資與稀釋", sub: "Financing", visual: "新現金會延長跑道，也會改變持分", kicker: "Dilution Trade-off", title: "同樣募資，時點與股價會決定稀釋代價", copy: "好數據後募資、低股價壓力募資與策略投資的條件不同。投資人要同時看募資規模、價格、權證與資金能否推進到下一個去風險事件。", question: "新增股數換來的資金，能否創造更大的去風險價值？", limit: "只看現金增加，忽略股數與條款" }
      ],
      lead: "生技公司的現金跑道是一個時間與事件問題。若資金撐不到下一個能提高談判力或估值的里程碑，公司可能在最不利的時點募資。",
      sections: [
        { id: "runway", title: "Runway：先用基礎公式，再做事件調整", body: "基礎 runway 可用現金除以平均 burn rate 粗估，但應排除一次性收入與支出，再納入即將啟動的大型試驗、製造、送件與商業化準備。" },
        { id: "burn", title: "Burn rate 會隨開發階段改變", body: "Phase III 站點與病人數、商業批次、安定性研究、查廠準備與上市庫存都會讓支出增加。只用歷史平均值，容易高估跑道。" },
        { id: "dilution", title: "稀釋風險要和募資後的價值創造一起看", body: "募資本身不是壞事。關鍵是價格、條款與資金用途：如果新資金能讓公司跨過重要數據或法規門檻，可能提高後續談判力；若只是填補持續虧損，則要重新評估。", example: "把季度現金、預估 burn、下一個數據日與可能募資窗口畫在一條時間軸，比只看資產負債表的一個數字更有用。" }
      ],
      checklist: ["用可用現金與正常化 burn rate 計算基礎跑道", "加入試驗放大、製造與上市準備的支出階梯", "對齊下一個數據、法規與 BD 里程碑", "估算不同募資價格下的新股數、權證與持分變化"],
      terms: [["Burn Rate", "公司在一段期間內消耗現金的速度。"], ["Runway", "現金在目前與預估支出下能支撐的時間。"], ["Dilution", "增發新股後既有股東持分比例下降。"], ["ATM", "依市場條件逐步發行股票的融資工具。"], ["Catalyst", "可能改變公司風險與估值的重要事件。"]],
      sources: [["SEC — Beginners' Guide to Financial Statements", "https://www.sec.gov/about/reports-publications/beginners-guide-financial-statements", "核對現金、營運現金流、融資現金流與財務報表的基本關係。"], ["Investor.gov — Convertible Securities", "https://www.investor.gov/introduction-investing/investing-basics/glossary/convertible-securities", "核對可轉換證券轉換後增加流通股數與稀釋的基本機制。"], ["SEC — Financial Reporting Manual, Topic 9", "https://www.sec.gov/about/divisions-offices/division-corporation-finance/financial-reporting-manual/frm-topic-9", "核對流動性、資本需求與持續經營揭露。"]]
    }
  };

  const params = new URLSearchParams(window.location.search);
  const requestedGuide = document.body.dataset.guide || params.get("guide");
  const guideKey = guideData[requestedGuide] ? requestedGuide : "market-sizing";
  const guide = guideData[guideKey];
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const $ = (id) => document.getElementById(id);

  document.title = `${guide.title}｜Drugnews 生技投資互動指南`;
  document.querySelector('meta[name="description"]').content = guide.deck;
  $("breadcrumbCurrent").textContent = guide.title;
  $("lessonPath").textContent = guide.path;
  if (guide.titleParts) {
    const titleFragment = document.createDocumentFragment();
    guide.titleParts.forEach((part, index) => {
      const span = document.createElement("span");
      span.className = "concept-title-unit";
      span.textContent = part;
      titleFragment.append(span);
      if (index < guide.titleParts.length - 1) titleFragment.append(" ");
    });
    $("lessonTitle").replaceChildren(titleFragment);
  } else {
    $("lessonTitle").textContent = guide.title;
  }
  $("lessonDeck").textContent = guide.deck;
  $("lessonNumber").textContent = guide.number;
  $("labHeading").textContent = guide.labHeading;
  $("labIntro").textContent = guide.labIntro;
  $("lessonLead").textContent = guide.lead;
  $("englishGuideLink").href = guide.english;
  $("lessonObjectives").innerHTML = guide.objectives.map((objective) => `<li>${objective}</li>`).join("");

  $("lessonSections").innerHTML = guide.sections.map((section, index) => `<section id="${section.id}"><p class="lesson-section-number">0${index + 1}</p><h2>${section.title}</h2><p>${section.body}</p>${section.example ? `<div class="lesson-example"><strong>投資人應用</strong>${section.example}</div>` : ""}</section>`).join("");
  $("lessonSectionNav").innerHTML = guide.sections.map((section) => `<a href="#${section.id}">${section.title.replace(/：.*/, "")}</a>`).join("");

  $("investorChecklist").innerHTML = guide.checklist.map((item, index) => `<li><span>0${index + 1}</span><div><strong>${item}</strong></div></li>`).join("");
  $("conceptTerms").innerHTML = guide.terms.map(([term, definition]) => `<div class="concept-term"><strong>${term}</strong><p>${definition}</p></div>`).join("");
  const courseSequence = [
    { key: "clinical", href: "clinical-endpoints.html", title: "臨床終點怎麼看" },
    { key: "regulatory", href: "regulatory-milestones.html", title: "FDA 法規節點怎麼看" },
    { key: "safety-cmc", href: "safety-cmc-risk.html", title: "安全性與 CMC 風險怎麼看" },
    { key: "market-sizing", href: "market-sizing.html", title: "市場規模怎麼看" },
    { key: "bd-licensing", href: "bd-licensing-terms.html", title: "BD 授權條款怎麼讀" },
    { key: "patent-cycle", href: "patent-competition.html", title: "專利與競爭週期怎麼看" },
    { key: "valuation", href: "biotech-valuation.html", title: "生技估值怎麼做" },
    { key: "cash-runway", href: "cash-runway.html", title: "現金跑道與稀釋怎麼看" }
  ];
  const courseIndex = courseSequence.findIndex((item) => item.key === guideKey);
  const previousCourse = courseSequence[courseIndex - 1] || { href: "index.html", title: "生技投資學習資料庫" };
  const nextCourse = courseSequence[courseIndex + 1] || { href: "taiwan-biotech-clinical-trials.html", title: "台灣生技臨床資料庫" };
  const pager = document.querySelector(".course-pager");
  if (pager) pager.innerHTML = `<a href="${previousCourse.href}"><span>上一課</span><strong>${previousCourse.title}</strong></a><a href="${nextCourse.href}"><span>下一課</span><strong>${nextCourse.title}</strong></a>`;

  const tabsRoot = $("conceptTabs");
  tabsRoot.innerHTML = guide.modes.map((item, index) => `<button id="concept-tab-${item.id}" type="button" role="tab" aria-selected="${index === 0}" aria-controls="conceptPanel" data-mode-index="${index}" tabindex="${index === 0 ? 0 : -1}">${item.label}<span>${item.sub}</span></button>`).join("");

  const header = document.querySelector(".site-header");
  const navToggle = $("site-nav-toggle");
  const navButton = document.querySelector(".nav-menu-button");
  const readingProgress = $("lessonReadingProgress");
  function updateChrome() {
    header?.classList.toggle("preview-condensed", window.scrollY > 20);
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    if (readingProgress) readingProgress.style.width = `${scrollable > 0 ? Math.min(100, window.scrollY / scrollable * 100) : 0}%`;
  }
  function syncMenuState() { navButton?.setAttribute("aria-expanded", String(Boolean(navToggle?.checked))); }
  window.addEventListener("scroll", updateChrome, { passive: true });
  navToggle?.addEventListener("change", syncMenuState);
  navButton?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    navToggle.checked = !navToggle.checked;
    syncMenuState();
  });
  updateChrome();
  syncMenuState();

  const lab = $("conceptLab");
  const canvas = null;
  const panel = $("conceptPanel");
  const tabs = [...tabsRoot.querySelectorAll("[data-mode-index]")];
  const context = null;
  const picture = $("conceptPicture");
  const mobileSource = picture?.querySelector("source");
  const staticVisual = $("conceptVisual");
  const visualCaption = $("conceptModeCaption");
  const mobileViewport = window.matchMedia("(max-width: 680px)");
  let imageRequestId = 0;
  let width = 0;
  let height = 0;
  let dpr = 1;
  let modeIndex = 0;
  let modeStartedAt = performance.now();
  let visible = true;
  let lastFrame = 0;
  let animationFrame = 0;
  let animationUntil = 0;

  const conceptImages = {
    regulatory: { submission: "regulatory-submission-v1", pdufa: "regulatory-pdufa-v1", crl: "regulatory-crl-v1" },
    "safety-cmc": { window: "safety-window-v1", scale: "cmc-scaleup-v1", inspection: "cmc-inspection-v1" },
    "market-sizing": { funnel: "market-funnel-v1", pricing: "market-pricing-v1", adoption: "market-adoption-v1" },
    "bd-licensing": { upfront: "bd-upfront-v1", milestone: "bd-milestone-v1", royalty: "bd-royalty-v1" },
    "patent-cycle": { protection: "patent-protection-v1", loe: "patent-loe-v1", bdgap: "patent-bdgap-v1" },
    valuation: { rnpv: "valuation-rnpv-v1", sotp: "valuation-sotp-v1", sensitivity: "valuation-sensitivity-v1" },
    "cash-runway": { runway: "cash-runway-v1", burn: "cash-burn-v1", dilution: "cash-dilution-v1" }
  };

  const staticFlows = {
    regulatory: {
      submission: ["IND", "人體試驗", "NDA / BLA", "審查"],
      pdufa: ["受理", "審查互動", "查廠 / 標籤", "決策"],
      crl: ["臨床缺口", "安全性疑慮", "CMC / 查廠", "修補路徑"]
    },
    "safety-cmc": {
      window: ["有效暴露", "治療窗", "毒性門檻", "可用劑量"],
      scale: ["小試批次", "中試放大", "商業批次", "一致性"],
      inspection: ["設施", "資料完整性", "偏差處理", "批次放行"]
    },
    "market-sizing": {
      funnel: ["TAM", "診斷 / 可治療", "給付 / 地區", "SOM"],
      pricing: ["標價", "實收價", "可及病人", "收入"],
      adoption: ["上市", "醫師教育", "給付放量", "成熟市場"]
    },
    "bd-licensing": {
      upfront: ["資產權利", "簽約金", "開發責任", "現金跑道"],
      milestone: ["臨床", "法規", "上市", "銷售門檻"],
      royalty: ["地區權利", "淨銷售", "分潤級距", "長期上行"]
    },
    "patent-cycle": {
      protection: ["物質專利", "配方 / 用途", "法規排他", "保護強度"],
      loe: ["排他性", "競品進場", "價格侵蝕", "收入重估"],
      bdgap: ["成熟產品", "收入缺口", "外部資產", "管線更新"]
    },
    valuation: {
      rnpv: ["現金流", "成功機率", "上市時程", "折現 / 成本"],
      sotp: ["已上市產品", "臨床管線", "平台 / 現金", "公司折價"],
      sensitivity: ["悲觀", "基準", "樂觀", "結論翻轉點"]
    },
    "cash-runway": {
      runway: ["現金", "Burn rate", "下一里程碑", "募資窗口"],
      burn: ["Phase I", "Phase II", "Phase III", "上市準備"],
      dilution: ["新現金", "新增股數", "持分稀釋", "去風險價值"]
    }
  };

  function imageUrl(base, size) { return `../assets/guides/webp/${base}-${size}.webp`; }
  function preloadAdjacent(index) {
    [index - 1, index + 1].filter((next) => guide.modes[next]).forEach((next) => {
      const preload = new Image();
      preload.src = imageUrl(conceptImages[guideKey][guide.modes[next].id], mobileViewport.matches ? 720 : 1200);
    });
  }
  async function renderStaticVisual(item) {
    const base = conceptImages[guideKey]?.[item.id];
    if (!base || !staticVisual) return;
    const requestId = ++imageRequestId;
    const mobileUrl = imageUrl(base, 720);
    const desktopUrl = imageUrl(base, 1200);
    const next = new Image();
    next.src = mobileViewport.matches ? mobileUrl : desktopUrl;
    try { await next.decode(); } catch { return; }
    if (requestId !== imageRequestId) return;
    if (mobileSource) mobileSource.srcset = mobileUrl;
    staticVisual.src = desktopUrl;
    staticVisual.alt = `${guide.title}：${item.label}。${item.visual}。${item.question}`;
    staticVisual.dataset.zoomSrc = desktopUrl;
    staticVisual.dataset.conceptReady = "true";
  }

  function label(text, x, y, options = {}) {
    context.fillStyle = options.color || "#536d72";
    context.font = `${options.weight || 720} ${Math.max(options.size || 12, 12)}px system-ui, -apple-system, sans-serif`;
    context.textAlign = options.align || "left";
    context.fillText(text, x, y);
  }

  function line(x1, y1, x2, y2, color = "rgba(23,111,123,.36)", lineWidth = 1) {
    context.beginPath(); context.moveTo(x1, y1); context.lineTo(x2, y2); context.strokeStyle = color; context.lineWidth = lineWidth; context.stroke();
  }

  function node(x, y, radius, color, active = false) {
    context.beginPath(); context.arc(x, y, radius, 0, Math.PI * 2); context.fillStyle = active ? color : "rgba(250,253,252,.88)"; context.strokeStyle = color; context.lineWidth = active ? 3 : 1.5; context.shadowBlur = active ? 18 : 6; context.shadowColor = color; context.fill(); context.stroke(); context.shadowBlur = 0;
  }

  function animationProgress(time, duration = 1100) {
    if (reducedMotion.matches) return 1;
    const value = Math.min(1, (time - modeStartedAt) / duration);
    return 1 - (1 - value) ** 3;
  }

  function drawTimeline(items, active, time) {
    const left = width < 520 ? 38 : 62;
    const right = width - (width < 520 ? 30 : 48);
    const y = height * 0.55;
    line(left, y, right, y, "rgba(23,111,123,.32)", 2);
    items.forEach((item, index) => {
      const x = left + (right - left) * index / (items.length - 1);
      node(x, y, index === active ? 13 : 8, index === active ? "#a0522f" : "#176f7b", index <= active);
      label(item, x, y + 34 + (index % 2) * 18, { size: width < 520 ? 11 : 12, align: "center", color: "#405c62" });
    });
  }

  function drawRegulatory(time) {
    if (modeIndex === 0) drawTimeline(["臨床前", "IND", "Phase I–III", "NDA / BLA", "FDA Review"], 3, time);
    if (modeIndex === 1) {
      const left = width * 0.12, right = width * 0.88, y = height * 0.57;
      line(left, y, right, y, "rgba(23,111,123,.34)", 5);
      const p = animationProgress(time, 1500);
      line(left, y, left + (right - left) * p, y, "#176f7b", 5);
      [0, .25, .5, .75, 1].forEach((v, i) => { node(left + (right - left) * v, y, i === 4 ? 13 : 7, i === 4 ? "#a0522f" : "#176f7b", v <= p); });
      label("申請受理", left, y + 40, { align: "center" }); label("審查互動與查廠", (left + right) / 2, y - 30, { align: "center" }); label("PDUFA", right, y + 40, { align: "center", color: "#a0522f" });
    }
    if (modeIndex === 2) {
      const lanes = [
        ["臨床 / 統計缺口", "補分析或追加試驗", "#a0522f"],
        ["安全性疑慮", "補風險管理或更多追蹤", "#315f8b"],
        ["CMC / 查廠缺失", "修製程、文件或再查廠", "#176f7b"]
      ];
      const left = width * .12, right = width * .88;
      label("CRL 要先拆原因，再判斷補救難度", width * .5, height * .16, { align: "center", size: 13, color: "#173f48" });
      lanes.forEach(([gap, fix, color], index) => {
        const y = height * (.34 + index * .18);
        node(left, y, 11, color, true);
        line(left + 18, y, right - 18, y, `${color}88`, 3);
        node(right, y, 11, color, index !== 0);
        label(gap, left + 32, y - 12, { size: 12, color });
        label(fix, right - 32, y + 20, { align: "right", size: 12, color: "#405c62" });
      });
    }
  }

  function drawCMC(time) {
    const p = animationProgress(time, 1250);
    if (modeIndex === 0) {
      const left=width*.12,right=width*.9,bottom=height*.82,top=height*.2;
      line(left,bottom,right,bottom); line(left,bottom,left,top);
      context.fillStyle="rgba(53,123,105,.12)"; context.fillRect(left+(right-left)*.32,top,(right-left)*.28,bottom-top);
      label("劑量 / 暴露 →",right,bottom+30,{align:"right",color:"#405c62"});
      label("反應 / 毒性",left,top-16,{color:"#405c62"});
      label("治療窗",left+(right-left)*.46,top+24,{align:"center",color:"#357b69"});
      [["療效反應", "#176f7b", .28], ["毒性發生率", "#a0522f", .58]].forEach(([name,color,mid],idx)=>{ context.beginPath(); for(let i=0;i<=60*p;i++){const t=i/60,x=left+(right-left)*t,y=bottom-(bottom-top)/(1+Math.exp(-10*(t-mid))); if(i===0)context.moveTo(x,y);else context.lineTo(x,y);} context.strokeStyle=color;context.lineWidth=3;context.stroke();label(name,right-8,idx?top+42:top+70,{align:"right",color}); });
    }
    if (modeIndex === 1) {
      const sizes=[.12,.2,.3]; const xs=[.22,.5,.78];
      xs.forEach((ratio,index)=>{const x=width*ratio,base=height*.76,h=height*(.2+index*.1),w=width*sizes[index]; context.fillStyle="rgba(23,111,123,.12)";context.strokeStyle=index===2?"#a0522f":"#176f7b";context.lineWidth=index===2?3:1.5;context.fillRect(x-w/2,base-h,w,h);context.strokeRect(x-w/2,base-h,w,h); label(["小試", "中試", "商業規模"][index],x,base+28,{align:"center",color:index===2?"#a0522f":"#405c62"}); if(index<2){line(x+w/2,base-h*.5,xs[index+1]*width-width*sizes[index+1]/2,base-height*(.2+(index+1)*.1)*.5,"rgba(23,111,123,.36)",2);} });
      label("批次一致性與關鍵品質屬性必須維持",width*.5,height*.16,{align:"center",size:13,color:"#173f48"});
    }
    if (modeIndex === 2) {
      const items=["設施", "製程", "資料完整性", "偏差處理", "批次放行"];
      drawTimeline(items,4,time); label("GMP 系統必須讓每一批產品都可追溯、可解釋",width*.5,height*.24,{align:"center",size:13,color:"#173f48"});
    }
  }

  function drawMarket(time) {
    const p=animationProgress(time,1200);
    if(modeIndex===0){
      const layers=[{w:.82,y:.25,h:.16,c:"rgba(49,95,139,.2)",s:"TAM｜所有理論病人"},{w:.6,y:.43,h:.16,c:"rgba(23,111,123,.24)",s:"SAM｜可診斷、可治療、可服務"},{w:.34,y:.61,h:.16,c:"rgba(160,82,47,.25)",s:"SOM｜給付、競爭與實際市占"}];
      layers.forEach((l,i)=>{const w=width*l.w*p,x=(width-w)/2,y=height*l.y;context.fillStyle=l.c;context.strokeStyle=i===2?"#a0522f":"#176f7b";context.lineWidth=i===2?3:1.5;context.fillRect(x,y,w,height*l.h);context.strokeRect(x,y,w,height*l.h);label(l.s,width*.5,y+height*l.h*.58,{align:"center",size:width<520?10:13,color:"#183d45"});});
    }
    if(modeIndex===1){
      const left=width*.14,right=width*.88,bottom=height*.8,top=height*.2;line(left,bottom,right,bottom);line(left,bottom,left,top);
      context.beginPath(); for(let i=0;i<=60*p;i++){const t=i/60,x=left+(right-left)*t,y=bottom-(bottom-top)*t; if(i===0)context.moveTo(x,y);else context.lineTo(x,y);}context.strokeStyle="#a0522f";context.lineWidth=3;context.stroke();
      context.beginPath(); for(let i=0;i<=60*p;i++){const t=i/60,x=left+(right-left)*t,y=top+(bottom-top)*(.1+.8*t*t);if(i===0)context.moveTo(x,y);else context.lineTo(x,y);}context.strokeStyle="#176f7b";context.lineWidth=3;context.stroke();
      label("單價",right,top+18,{align:"right",color:"#a0522f"});label("可及病人",right,bottom-18,{align:"right",color:"#176f7b"});label("價格上升時，給付限制可能縮小可及性",width*.5,height*.12,{align:"center",size:12});
    }
    if(modeIndex===2){
      const left=width*.12,right=width*.9,bottom=height*.8,top=height*.2;line(left,bottom,right,bottom);line(left,bottom,left,top);
      context.beginPath();for(let i=0;i<=80*p;i++){const t=i/80,x=left+(right-left)*t,y=bottom-(bottom-top)/(1+Math.exp(-10*(t-.55)));if(i===0)context.moveTo(x,y);else context.lineTo(x,y);}context.strokeStyle="#176f7b";context.lineWidth=4;context.stroke();
      [.18,.5,.82].forEach((v,i)=>{const y=bottom-(bottom-top)/(1+Math.exp(-10*(v-.55)));node(left+(right-left)*v,y,7,i===1?"#a0522f":"#176f7b",true);label(["早期採用", "放量拐點", "成熟市場"][i],left+(right-left)*v,y-20,{align:"center",size:10});});
    }
  }

  function drawBD(time) {
    const p=animationProgress(time,1000); const left=width*.2,right=width*.8,cy=height*.5;
    if(modeIndex===0){node(left,cy,42,"#176f7b",true);node(right,cy,42,"#a0522f",true);label("授權方",left,cy+5,{align:"center",color:"#fff"});label("合作方",right,cy+5,{align:"center",color:"#fff"});line(right-45,cy-24,left+45,cy-24,"#a0522f",4);line(left+45,cy+24,right-45,cy+24,"#176f7b",4);label("Upfront cash",width*.5,cy-38,{align:"center",color:"#a0522f"});label("資產與權利",width*.5,cy+48,{align:"center",color:"#176f7b"});}
    if(modeIndex===1){drawTimeline(["簽約", "臨床", "法規", "上市", "銷售門檻"],Math.min(4,Math.floor(p*5)),time);label("越遠期的付款，條件越多、確定性越低",width*.5,height*.24,{align:"center",size:13});}
    if(modeIndex===2){
      const bars=[.22,.38,.55,.72];bars.forEach((xv,i)=>{const x=width*xv,h=height*(.16+i*.1),base=height*.78;context.fillStyle="rgba(23,111,123,.22)";context.fillRect(x-width*.035,base-h,width*.07,h);context.fillStyle="rgba(160,82,47,.42)";context.fillRect(x-width*.035,base-h,width*.07,h*.22);label(["上市初期","成長","成熟","峰值"][i],x,base+24,{align:"center",size:10});});label("銷售收入",width*.18,height*.2,{color:"#176f7b"});label("Royalty 分潤",width*.18,height*.24,{color:"#a0522f"});
    }
  }

  function drawPatent(time) {
    const p=animationProgress(time,1200);
    if(modeIndex===0){
      const left=width*.1,right=width*.9,y=height*.66;line(left,y,right,y,"rgba(23,111,123,.3)",3);const layers=[[.12,.72,"物質專利"],[.24,.82,"製程 / 配方"],[.34,.88,"用途 / 給藥"],[.18,.64,"法規排他"]];layers.forEach(([s,e,n],i)=>{const yy=height*(.26+i*.1);line(left+(right-left)*s,yy,left+(right-left)*(s+(e-s)*p),yy,i===0?"#a0522f":"#176f7b",8);label(n,left+(right-left)*s,yy-12,{size:10,color:i===0?"#a0522f":"#405c62"});});label("時間 →",right,y+28,{align:"right"});
    }
    if(modeIndex===1){
      const left=width*.1,right=width*.9,bottom=height*.8,top=height*.18;line(left,bottom,right,bottom);line(left,bottom,left,top);context.beginPath();context.moveTo(left,bottom);context.bezierCurveTo(width*.32,top,width*.58,top,width*.64,top+35);context.bezierCurveTo(width*.7,height*.65,width*.82,height*.72,right,height*.76);context.lineTo(right,bottom);context.lineTo(left,bottom);context.fillStyle="rgba(23,111,123,.18)";context.fill();context.strokeStyle="#176f7b";context.lineWidth=3;context.stroke();line(width*.64,top,width*.64,bottom,"#a0522f",2);label("LOE",width*.64,top-14,{align:"center",color:"#a0522f"});
    }
    if(modeIndex===2){
      const left=width*.12,right=width*.88,bottom=height*.8,top=height*.2;line(left,bottom,right,bottom);const oldEnd=width*.58;context.fillStyle="rgba(160,82,47,.18)";context.fillRect(left,top,oldEnd-left,bottom-top);context.fillStyle="rgba(23,111,123,.2)";context.fillRect(width*.66,height*.38,right-width*.66,bottom-height*.38);label("成熟產品收入",(left+oldEnd)/2,top+28,{align:"center",color:"#a0522f"});label("新資產收入曲線",(width*.66+right)/2,height*.38+28,{align:"center",color:"#176f7b"});label("需要用內部 R&D 或 BD 補上的收入缺口",width*.62,height*.26,{align:"center",size:11});
    }
  }

  function drawValuation(time) {
    const p=animationProgress(time,1100);
    if(modeIndex===0){
      const steps=[{n:"未來銷售",v:1,c:"#315f8b"},{n:"成功機率",v:.62,c:"#176f7b"},{n:"時間折現",v:.46,c:"#357b69"},{n:"後續成本",v:.35,c:"#a0522f"}];const left=width*.13,right=width*.88;steps.forEach((s,i)=>{const y=height*(.22+i*.16),w=(right-left)*s.v*p;context.fillStyle=`${s.c}33`;context.strokeStyle=s.c;context.fillRect(left,y,w,34);context.strokeRect(left,y,w,34);label(s.n,left-10,y+22,{align:"right",size:11,color:"#405c62"});});label("rNPV",right,height*.82,{align:"right",color:"#a0522f",size:14});
    }
    if(modeIndex===1){
      const parts=[{n:"已上市產品",v:.28,c:"#315f8b"},{n:"臨床管線",v:.34,c:"#176f7b"},{n:"平台 / CDMO",v:.18,c:"#357b69"},{n:"現金",v:.2,c:"#a0522f"}];const left=width*.18,right=width*.82,y=height*.54,h=72;let x=left;parts.forEach(s=>{const w=(right-left)*s.v*p;context.fillStyle=`${s.c}aa`;context.fillRect(x,y,w,h);label(s.n,x+w/2,y+h+25,{align:"center",size:width<520?9:10,color:s.c});x+=w;});label("SOTP：各部分用自己的風險與現金流邏輯",width*.5,height*.28,{align:"center",size:13});
    }
    if(modeIndex===2){
      const size=5,cell=Math.min(54,(width*.62)/size),startX=(width-cell*size)/2,startY=height*.22;for(let row=0;row<size;row++){for(let col=0;col<size;col++){const score=(row+col)/(size*2-2),alpha=.12+score*.6;context.fillStyle=`rgba(${Math.round(160-(score*120))},${Math.round(82+(score*45))},${Math.round(47+(score*65))},${alpha})`;context.fillRect(startX+col*cell,startY+row*cell,cell-2,cell-2);}}label("成功機率 →",startX+cell*size,startY-16,{align:"right"});label("峰值銷售 ↑",startX-10,startY+cell*size+22,{size:10});label("估值不是一格，而是一個情境區間",width*.5,startY+cell*size+46,{align:"center",color:"#a0522f"});
    }
  }

  function drawCash(time) {
    const p=animationProgress(time,1200);const left=width*.12,right=width*.9,bottom=height*.8,top=height*.2;
    if(modeIndex===0){line(left,bottom,right,bottom);line(left,bottom,left,top);context.beginPath();context.moveTo(left,top+18);context.lineTo(left+(right-left)*p,bottom-(bottom-top)*(.9-.82*p));context.strokeStyle="#a0522f";context.lineWidth=4;context.stroke();const milestone=left+(right-left)*.68;line(milestone,top,milestone,bottom,"#176f7b",2);label("下一個臨床 / 法規里程碑",milestone,top-14,{align:"center",color:"#176f7b"});label("現金餘額",left,top-14,{color:"#a0522f"});}
    if(modeIndex===1){line(left,bottom,right,bottom);line(left,bottom,left,top);const points=[[0,.08],[.3,.22],[.56,.45],[.78,.74],[1,.94]];context.beginPath();points.forEach(([xv,yv],i)=>{const x=left+(right-left)*xv*p,y=top+(bottom-top)*yv;if(i===0)context.moveTo(x,y);else context.lineTo(x,y);});context.strokeStyle="#a0522f";context.lineWidth=4;context.stroke();["Phase I","Phase II","Phase III","上市準備"].forEach((n,i)=>label(n,left+(right-left)*[.14,.42,.67,.88][i],bottom+26,{align:"center",size:10}));label("累積現金支出",left,top-14,{color:"#a0522f"});}
    if(modeIndex===2){
      const cx1=width*.3,cx2=width*.72,cy=height*.52,r=Math.min(78,width*.13);context.beginPath();context.arc(cx1,cy,r,0,Math.PI*2);context.fillStyle="rgba(23,111,123,.75)";context.fill();label("募資前",cx1,cy+r+28,{align:"center"});context.beginPath();context.moveTo(cx2,cy);context.arc(cx2,cy,r,-Math.PI/2,Math.PI*1.15);context.closePath();context.fillStyle="rgba(23,111,123,.75)";context.fill();context.beginPath();context.moveTo(cx2,cy);context.arc(cx2,cy,r,Math.PI*1.15,Math.PI*1.5);context.closePath();context.fillStyle="rgba(160,82,47,.78)";context.fill();label("募資後",cx2,cy+r+28,{align:"center"});label("新增股數",cx2+r*.75,cy-r*.65,{align:"center",color:"#a0522f"});line(cx1+r+20,cy,cx2-r-20,cy,"rgba(23,111,123,.35)",2);
    }
  }

  function draw(time, force=false) {
    if (!width || !height) return;
    if(!force&&(!visible||document.hidden))return;
    context.clearRect(0,0,width,height);
    if(guideKey==="regulatory")drawRegulatory(time);
    if(guideKey==="safety-cmc")drawCMC(time);
    if(guideKey==="market-sizing")drawMarket(time);
    if(guideKey==="bd-licensing")drawBD(time);
    if(guideKey==="patent-cycle")drawPatent(time);
    if(guideKey==="valuation")drawValuation(time);
    if(guideKey==="cash-runway")drawCash(time);
    canvas.dataset.conceptReady="true";
  }

  function resizeCanvas(){
    const nextWidth = Math.max(280, Math.round(panel.clientWidth || panel.getBoundingClientRect().width || 0));
    const nextHeight = nextWidth < 520 ? 340 : nextWidth < 900 ? 400 : 450;
    const nextDpr = Math.min(1.5,window.devicePixelRatio||1);
    if (nextWidth === width && nextHeight === height && nextDpr === dpr) return;
    width=nextWidth;height=nextHeight;dpr=nextDpr;
    canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);canvas.style.width=`${width}px`;canvas.style.height=`${height}px`;context.setTransform(dpr,0,0,dpr,0,0);draw(performance.now(),true);
  }

  function startAnimation() {
    renderStaticVisual(guide.modes[modeIndex]);
    preloadAdjacent(modeIndex);
  }

  function activateTab(tab,index){modeIndex=index;modeStartedAt=performance.now();const item=guide.modes[index];tabs.forEach((button,buttonIndex)=>{const active=buttonIndex===index;button.setAttribute("aria-selected",String(active));button.tabIndex=active?0:-1;});panel.setAttribute("aria-labelledby",tab.id);panel.setAttribute("aria-label",`${guide.title}：${item.label}。${item.visual}。${item.copy} 核心問題：${item.question}`);$("conceptVisualTitle").textContent=item.visual;$("conceptKicker").textContent=item.kicker;$("conceptTitle").textContent=item.title;$("conceptCopy").textContent=item.copy;$("conceptQuestion").textContent=item.question;$("conceptLimit").textContent=item.limit;if(visualCaption)visualCaption.textContent=item.caption||"教學示意圖，非特定公司、產品、試驗結果或通用定量規格；實際判讀須回到原始資料。";startAnimation();}
  tabs.forEach((tab,index)=>{tab.addEventListener("click",()=>activateTab(tab,index));tab.addEventListener("keydown",event=>{if(!["ArrowLeft","ArrowRight","Home","End"].includes(event.key))return;event.preventDefault();let next=index;if(event.key==="ArrowLeft")next=(index-1+tabs.length)%tabs.length;if(event.key==="ArrowRight")next=(index+1)%tabs.length;if(event.key==="Home")next=0;if(event.key==="End")next=tabs.length-1;tabs[next].focus();activateTab(tabs[next],next);});});

  function animate(time){ animationFrame = 0; renderStaticVisual(guide.modes[modeIndex]); }
  activateTab(tabs[0],0);

  const complete=$("lessonComplete");const progressKey="drugnews-guide-progress-v1";
  function readProgress(){try{return JSON.parse(localStorage.getItem(progressKey)||"[]");}catch{return[];}}
  complete.checked=new Set(readProgress()).has(guide.progressId);
  complete.addEventListener("change",()=>{const saved=new Set(readProgress());if(complete.checked)saved.add(guide.progressId);else saved.delete(guide.progressId);try{localStorage.setItem(progressKey,JSON.stringify([...saved]));}catch{/* Preview remains usable without storage. */}});
})();
