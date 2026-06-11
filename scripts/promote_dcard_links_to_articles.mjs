import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const PUBLISHED = path.join(ROOT, "content", "published");
const EXTERNAL = path.join(ROOT, "content", "external-articles.json");
const FACEBOOK_URL = "https://www.facebook.com/profile.php?id=61568446257142";
const DISCLAIMER = "本文僅供產業研究與知識分享，不構成投資、醫療、募資或個股建議。";

const posts = [
  {
    date: "2026-05-05",
    slug: "hair-growth-drug-breakthrough",
    title: "最強生髮藥暴漲 47%，為什麼可能改寫掉髮治療三十年僵局？",
    dcard_url: "https://www.dcard.tw/@drugnews/post/261416822",
    category: "臨床與 CMC",
    tags: ["生髮藥", "掉髮治療", "臨床數據", "市場重估", "商業分析系列"],
    summary: "掉髮治療多年缺乏真正突破，只要新機制能拿出明確臨床訊號，市場就可能重新替整個領域定價。",
    visual: {
      label: "Alopecia",
      color: "#1f8a70",
      accent: "#d97a2b",
      nodes: ["療效訊號", "安全性", "用藥便利", "市場重估"]
    },
    sections: [
      {
        heading: "不是只有股價暴漲，而是市場在重估一個舊難題",
        paragraphs: [
          "掉髮治療看起來像成熟市場，但真正有效、方便、可長期使用的選項其實不多。當一個候選藥或新機制讓市場看到更強的臨床訊號，股價反應往往不是單純追題材，而是在重新計算這個市場過去被低估的未滿足需求。",
          "投資人要看的不是新聞標題裡的漲幅，而是這個療效能不能從短期反應，走向可重複、可長期維持、可被醫師接受的治療位置。"
        ],
        bullets: ["掉髮市場大，但長期缺乏革命性產品。", "療效、耐受性與持續用藥，是商業化能否成立的三角。", "若機制能從外用或口服便利性切入，估值想像會明顯不同。"]
      },
      {
        heading: "臨床數據要看三件事",
        paragraphs: [
          "第一是終點是否有臨床意義，而不是只在統計上好看。第二是安全性是否能支撐長期使用，因為掉髮治療常常不是短療程。第三是患者與醫師是否願意把它放進日常處方流程。",
          "如果一個產品只能在小族群或高監測成本下使用，商業天花板就會被壓低；如果療效夠強、使用夠方便，才有機會真正改寫治療格局。"
        ],
        bullets: ["療效強度：是否達到肉眼與患者都感受得到的改善。", "安全性：是否能長期使用。", "商業位置：能否替代或搭配現有標準治療。"]
      },
      {
        heading: "Drugnews 的判斷",
        paragraphs: [
          "這類題材最容易被市場簡化成一日行情，但真正值得追蹤的是：新療法是否能把掉髮從保健品與舊藥市場，推向更標準化的新藥市場。若能成立，估值就不只是單一公司，而是整個皮膚科與生活品質藥物市場的重估。"
        ],
        bullets: ["先看臨床可信度，再看商業規模。", "不要只看股價反應，要看產品是否真的改變醫師行為。"]
      }
    ]
  },
  {
    date: "2026-05-09",
    slug: "clinical-trial-fraud-fda-withdrawal",
    title: "臨床試驗作假，FDA 撤市風暴！",
    dcard_url: "https://www.dcard.tw/@drugnews/post/261447912",
    category: "臨床與 CMC",
    tags: ["FDA", "臨床試驗", "資料完整性", "撤市風險", "法規"],
    summary: "臨床資料不只是科學問題，也是資產價值問題；一旦資料完整性被質疑，藥品命運可能被監管重新改寫。",
    visual: {
      label: "Data Integrity",
      color: "#173f5f",
      accent: "#d65a31",
      nodes: ["試驗中心", "原始資料", "稽核", "撤市風險"]
    },
    sections: [
      {
        heading: "資料可信度，是藥品價值的地基",
        paragraphs: [
          "一個藥品能不能上市，表面上看的是療效與安全性；但更底層的是資料能不能被相信。臨床試驗如果牽涉造假、漏報、紀錄不一致或稽核失敗，監管機關就不只是在質疑某個數字，而是在質疑整個證據鏈。",
          "這也是為什麼資料完整性事件常常會引發撤市、補件、重新試驗或標籤限制。對投資人來說，這不是法規細節，而是資產現金流可能被瞬間重估。"
        ],
        bullets: ["資料完整性問題會破壞整個臨床證據鏈。", "FDA 關注的是病人安全與決策依據是否可靠。", "撤市風險常常比單純療效不佳更難預測。"]
      },
      {
        heading: "不要只看藥效，也要看試驗品質",
        paragraphs: [
          "生技投資常被療效數字吸引，但真正成熟的分析會回頭看試驗設計、收案品質、中心分布、缺失資料比例與監管溝通紀錄。越是關鍵試驗，越不能只看公司簡報上的漂亮圖表。",
          "如果一個藥的核心證據高度依賴少數中心，或資料清理與稽核問題反覆出現，就算結果看起來正面，市場也應該給予折價。"
        ],
        bullets: ["多中心一致性比單點亮眼更重要。", "缺失資料與事後分析要特別留意。", "監管文件常比新聞稿更接近風險核心。"]
      },
      {
        heading: "Drugnews 的判斷",
        paragraphs: [
          "臨床試驗作假事件提醒我們：新藥價值不是只由科學假說決定，也由執行品質決定。好的資產需要好的臨床營運，否則再漂亮的機制都可能在法規面前失去說服力。"
        ],
        bullets: ["資料可信度是估值底線。", "監管風險不是附註，而是核心投資變數。"]
      }
    ]
  },
  {
    date: "2026-05-20",
    slug: "ai-drug-discovery-google-funding",
    title: "破紀錄 AI 製藥融資來了！Google 系公司一次募 21 億美元",
    dcard_url: "https://www.dcard.tw/@drugnews/post/261515495",
    category: "公司研究",
    tags: ["AI 製藥", "融資", "Google", "生技投資", "資本市場"],
    summary: "AI 製藥的大型融資不是只代表市場追逐 AI，而是在測試平台公司能否把演算法轉化成真正可授權、可上市的藥物資產。",
    visual: {
      label: "AI Drug Discovery",
      color: "#244c8f",
      accent: "#25a7a0",
      nodes: ["資料", "模型", "候選藥", "授權"]
    },
    sections: [
      {
        heading: "21 億美元融資，市場買的是平台還是管線？",
        paragraphs: [
          "AI 製藥公司能募到大型資金，代表資本市場仍願意押注研發效率的結構性改變。但真正的關鍵不是模型多漂亮，而是平台最後能否產生臨床上站得住腳的候選藥。",
          "在生技產業裡，資料、模型與自動化只是起點。能不能跨過毒理、CMC、臨床設計與授權談判，才決定 AI 製藥公司是不是能從科技故事變成藥品公司。"
        ],
        bullets: ["大型融資提高了平台公司的驗證壓力。", "市場會從 AI 故事，逐步轉向臨床與授權成果。", "真正有價值的是可重複產生候選藥的能力。"]
      },
      {
        heading: "AI 製藥的商業化要看兩條路",
        paragraphs: [
          "第一條路是自己推進管線，取得更高價值，但也承擔更高臨床風險。第二條路是與大藥廠合作或授權，讓平台能力轉化成現金流與外部驗證。",
          "投資人要特別看合作方是否願意支付前金、里程碑與研發分工，因為這些條款比單純宣布合作更能反映平台在產業裡的議價能力。"
        ],
        bullets: ["自研管線看臨床成功率。", "平台授權看前金、里程碑與合作深度。", "資料壁壘與實驗閉環，決定平台能否長期複利。"]
      },
      {
        heading: "Drugnews 的判斷",
        paragraphs: [
          "AI 製藥的下一階段，不會再只是誰的模型最大，而是誰能把模型變成臨床候選藥、把候選藥變成合作條款、把合作條款變成可驗證的商業價值。大型融資是入場券，不是終局答案。"
        ],
        bullets: ["AI 是工具，藥物資產才是價值落點。", "平台公司必須拿出比傳統研發更高的資本效率。"]
      }
    ]
  },
  {
    date: "2026-05-25",
    slug: "asthma-new-drug-immune-targets",
    title: "氣喘新藥正在換檔：從吸入三合一到上游免疫靶點",
    dcard_url: "https://www.dcard.tw/@drugnews/post/261543849",
    category: "臨床與 CMC",
    tags: ["氣喘", "免疫靶點", "臨床", "創新藥", "呼吸道疾病"],
    summary: "氣喘治療正在從症狀控制走向免疫分型，產品競爭也從吸入裝置延伸到上游發炎路徑。",
    visual: {
      label: "Asthma",
      color: "#2d6a8e",
      accent: "#e39d38",
      nodes: ["吸入治療", "T2 發炎", "生物製劑", "分型"]
    },
    sections: [
      {
        heading: "氣喘市場不只是吸入器競爭",
        paragraphs: [
          "傳統氣喘治療多圍繞吸入型藥物，包括支氣管擴張、類固醇與複方三合一產品。這些產品改善了大量患者的症狀控制，但對部分重度或特定發炎型氣喘，單靠吸入治療仍然不夠。",
          "近年氣喘新藥的重點開始往免疫上游移動，像 IL-4、IL-5、IL-13、TSLP 等路徑，都讓市場從一個大適應症，拆成更精準的生物標記與病人分群。"
        ],
        bullets: ["吸入三合一解決的是症狀與便利性。", "上游免疫靶點解決的是疾病驅動機制。", "生物標記會影響定價、給付與用藥順序。"]
      },
      {
        heading: "真正的競爭在病人分層",
        paragraphs: [
          "氣喘新藥不是誰能治療所有人，而是誰能在明確族群中提供最好的風險效益比。嗜酸性白血球、FeNO、過敏體質、急性惡化史，都可能影響醫師選擇哪一種藥。",
          "這代表產品定位不能只寫療效，而要能清楚回答：哪一群病人最適合？用在第幾線？能否減少急性惡化與口服類固醇使用？"
        ],
        bullets: ["病人分層會決定市場大小。", "急性惡化下降是商業化的重要證據。", "給付端會要求比症狀改善更硬的臨床價值。"]
      },
      {
        heading: "Drugnews 的判斷",
        paragraphs: [
          "呼吸道疾病正在從大眾用藥市場，走向更精準的免疫醫學市場。氣喘新藥的價值不只在療效，而在能否建立清楚的分型、用藥順序與長期疾病控制證據。"
        ],
        bullets: ["未來氣喘競爭會越來越像免疫疾病競爭。", "上游靶點能否改變治療路徑，是估值重點。"]
      }
    ]
  },
  {
    date: "2026-05-27",
    slug: "weight-loss-side-effect-new-track",
    title: "減肥藥新副作用，意外帶出新賽道？",
    dcard_url: "https://www.dcard.tw/@drugnews/post/261549898",
    category: "臨床與 CMC",
    tags: ["減肥藥", "GLP-1", "副作用", "新賽道", "代謝"],
    summary: "GLP-1 讓減重市場爆發，但副作用與長期用藥問題也正在催生新的產品定位與輔助治療機會。",
    visual: {
      label: "GLP-1 Safety",
      color: "#276678",
      accent: "#f08a5d",
      nodes: ["減重", "副作用", "肌肉流失", "新賽道"]
    },
    sections: [
      {
        heading: "副作用不是只有風險，也可能揭露新需求",
        paragraphs: [
          "GLP-1 類藥物改變了肥胖治療，但胃腸道不適、停藥反彈、肌肉量下降與長期依從性，讓市場開始意識到減重不只是把體重壓下來。",
          "當一個市場快速放大，副作用會變成下一輪創新的入口。能不能減少不適、保留肌肉、改善代謝品質，可能決定下一代產品的差異化。"
        ],
        bullets: ["副作用會影響長期用藥率。", "肌肉保留與身體組成會成為新終點。", "輔助療法與組合療法可能形成新市場。"]
      },
      {
        heading: "從減重到代謝品質",
        paragraphs: [
          "早期市場最重視體重下降百分比，但當同類產品越來越多，競爭會轉向更細的問題：減掉的是脂肪還是肌肉？停藥後能不能維持？是否改善脂肪肝、心血管與發炎風險？",
          "這些問題會把市場從單一 GLP-1 競賽，推向多機制組合與周邊照護。"
        ],
        bullets: ["體重下降只是第一層指標。", "代謝共病改善會提高藥物價值。", "患者體驗會影響真實世界滲透率。"]
      },
      {
        heading: "Drugnews 的判斷",
        paragraphs: [
          "減肥藥市場的下一波機會，可能不是單純更瘦，而是更安全、更可持續、更接近健康代謝。副作用訊號看似負面，但對產業來說，也常常是新產品定位開始成形的地方。"
        ],
        bullets: ["副作用會催生新適應症與配套療法。", "下一代競爭會從公斤數走向身體組成與長期維持。"]
      }
    ]
  },
  {
    date: "2026-05-27",
    slug: "generic-pharma-transformation-anxiety",
    title: "太陽製藥、梯瓦製藥 與 全球學名藥廠的轉型焦慮",
    dcard_url: "https://www.dcard.tw/@drugnews/post/261555997",
    category: "公司研究",
    tags: ["學名藥", "太陽製藥", "梯瓦製藥", "轉型", "製藥巨頭系列"],
    summary: "全球學名藥廠面對價格壓力與成長瓶頸，轉型焦慮的核心，是如何從製造與成本優勢走向更高價值的產品組合。",
    visual: {
      label: "Generic Pharma",
      color: "#1c4e80",
      accent: "#c27c2c",
      nodes: ["價格壓力", "特殊學名藥", "品牌藥", "全球供應"]
    },
    sections: [
      {
        heading: "學名藥不是沒有價值，而是舊模式變難了",
        paragraphs: [
          "學名藥產業長期靠規模、製造效率與通路能力創造價值，但當價格競爭加劇、監管要求提高、供應鏈成本上升，單純靠量和成本的模式就越來越辛苦。",
          "太陽製藥、梯瓦製藥這類公司面對的，不是單一產品問題，而是整個商業模式必須往特殊學名藥、複雜製劑、品牌藥與生物相似藥移動。"
        ],
        bullets: ["傳統學名藥毛利承壓。", "複雜製劑與特殊學名藥提高進入門檻。", "轉型需要研發能力與資本配置，不只是成本控制。"]
      },
      {
        heading: "轉型焦慮來自兩邊壓力",
        paragraphs: [
          "一邊是老產品持續被價格壓縮，另一邊是新產品需要更高研發投入、更長時間與更高失敗風險。這讓學名藥公司常常處在現金流與創新投資的拉扯中。",
          "投資人要看的是，公司是否真的建立差異化產品組合，而不是只在簡報裡說要轉型。"
        ],
        bullets: ["現金流能否支撐轉型。", "新產品組合是否有足夠進入門檻。", "債務、訴訟與合規風險會影響估值。"]
      },
      {
        heading: "Drugnews 的判斷",
        paragraphs: [
          "全球學名藥廠的價值，不會再只看出貨量，而是看誰能把製造優勢升級成更高技術門檻的產品平台。轉型成功的公司會被重新評價，轉型失敗的公司則可能繼續被低本益比困住。"
        ],
        bullets: ["轉型不是口號，要看產品組合品質。", "學名藥公司的估值差異，會越來越取決於技術門檻。"]
      }
    ]
  },
  {
    date: "2026-05-29",
    slug: "next-generation-obesity-therapy-directions",
    title: "減重藥物不只看體重了：下一代療法正在瞄準這些方向",
    dcard_url: "https://www.dcard.tw/@drugnews/post/261568567",
    category: "臨床與 CMC",
    tags: ["減重藥物", "GLP-1", "肥胖治療", "代謝", "商業分析系列"],
    summary: "下一代減重療法的競爭，會從體重下降延伸到肌肉保留、脂肪肝、心血管與代謝共病。",
    visual: {
      label: "Obesity 2.0",
      color: "#186a6b",
      accent: "#e09132",
      nodes: ["體重", "肌肉", "脂肪肝", "心血管"]
    },
    sections: [
      {
        heading: "體重下降只是第一場戰爭",
        paragraphs: [
          "GLP-1 已經證明肥胖可以被藥物大幅改變，但當市場出現多個有效產品後，競爭標準會被拉高。下一代療法不能只回答能瘦多少，還要回答瘦下來的品質如何。",
          "這也是為什麼肌肉保留、脂肪肝改善、心血管保護與代謝發炎，會變成新一輪產品定位的核心。"
        ],
        bullets: ["體重下降會逐漸商品化。", "身體組成與代謝共病會成為差異化。", "臨床終點越多，商業故事越完整。"]
      },
      {
        heading: "下一代產品要補 GLP-1 的空缺",
        paragraphs: [
          "GLP-1 強在食慾與體重控制，但它也留下未解問題：停藥後維持、肌肉流失、個體差異與副作用。新的機制或組合療法，會試圖補上這些空缺。",
          "市場會特別關注 amylin、glucagon、GIP、肌肉保留相關路徑，以及脂肪肝與心血管結局資料。"
        ],
        bullets: ["多重腸泌素機制會繼續競爭。", "肌肉保留可能變成高價值賽道。", "脂肪肝與心血管資料會支撐更大給付。"]
      },
      {
        heading: "Drugnews 的判斷",
        paragraphs: [
          "肥胖治療會從單純減重，走向代謝疾病管理。下一代勝出的產品，不一定是單次體重下降最誇張，而是能在療效、安全、長期維持與共病改善之間取得最佳平衡。"
        ],
        bullets: ["投資人要看完整治療框架。", "體重數字之外的臨床價值，會決定長期估值。"]
      }
    ]
  },
  {
    date: "2026-05-29",
    slug: "drug-combination-efficacy-doubling",
    title: "藥王的最佳搭檔？療效翻倍！",
    dcard_url: "https://www.dcard.tw/@drugnews/post/261574381",
    category: "臨床與 CMC",
    tags: ["藥物組合", "療效", "臨床數據", "商業分析系列", "聯合治療"],
    summary: "新藥競爭不只看單一產品，能不能找到最佳聯合治療夥伴，往往決定藥王生命週期與市場天花板。",
    visual: {
      label: "Combination",
      color: "#19376d",
      accent: "#df7857",
      nodes: ["主藥", "搭檔", "療效加乘", "生命週期"]
    },
    sections: [
      {
        heading: "藥王真正值錢的地方，是能延伸多少場景",
        paragraphs: [
          "一個成功藥物上市後，市場很快會問下一個問題：它能不能和其他藥物搭配，打進更早線別、更大族群或更難治的疾病狀態？如果答案是肯定的，藥王的生命週期就會被大幅延長。",
          "聯合治療的價值不只是療效變好，也包括提高使用順序、擴大適應症、延長專利與建立更強的臨床護城河。"
        ],
        bullets: ["搭配藥可以擴大適應症。", "療效加乘會提高醫師採用意願。", "生命週期管理是大藥廠最重要的商業能力之一。"]
      },
      {
        heading: "療效翻倍要看是不是換來更多風險",
        paragraphs: [
          "聯合治療最怕的是療效增加，但毒性、成本與用藥複雜度也一起增加。真正好的組合，是讓風險效益比明顯改善，而不是只在某個指標上看起來漂亮。",
          "因此投資人要看 ORR、PFS、OS，也要看停藥率、劑量調整、病人生活品質與給付可行性。"
        ],
        bullets: ["療效加乘必須搭配可接受安全性。", "商業化要看醫師是否願意改變處方。", "給付端會評估新增成本是否值得。"]
      },
      {
        heading: "Drugnews 的判斷",
        paragraphs: [
          "藥王不是單一產品，而是一個平台位置。誰能成為最佳搭檔，誰就有機會分享藥王市場的流量與定價能力。這也是為什麼聯合治療常常會帶出授權、併購與新估值故事。"
        ],
        bullets: ["聯合治療是商業策略，不只是臨床設計。", "最佳搭檔可能比單打獨鬥更有價值。"]
      }
    ]
  },
  {
    date: "2026-05-29",
    slug: "tavneos-safety-data-integrity-crisis",
    title: "Tavneos 危機：20 例死亡通報、資料完整性疑雲，Amgen 罕病明星藥站上撤市邊緣",
    dcard_url: "https://www.dcard.tw/@drugnews/post/261579396",
    category: "臨床與 CMC",
    tags: ["Tavneos", "Amgen", "罕病藥", "安全性", "法規風險"],
    summary: "罕病藥物的價值高度依賴可信資料與安全性信任，一旦死亡通報與資料完整性疑雲浮現，估值邏輯就會被迫重估。",
    visual: {
      label: "Tavneos",
      color: "#27496d",
      accent: "#c84b31",
      nodes: ["死亡通報", "安全性", "資料完整性", "撤市風險"]
    },
    sections: [
      {
        heading: "罕病明星藥最怕信任被打破",
        paragraphs: [
          "罕病藥常因患者少、治療選擇有限、價格高，而被市場賦予較高估值。但這種估值建立在一個前提上：臨床資料可信，安全性可控，醫師願意長期使用。",
          "當死亡通報、資料完整性或監管質疑浮現，市場擔心的不是單一事件，而是這個藥物原本的風險效益比是否需要重新評估。"
        ],
        bullets: ["罕病藥估值高度依賴醫師與監管信任。", "安全性事件會影響使用意願與給付態度。", "資料完整性疑雲會放大所有不確定性。"]
      },
      {
        heading: "死亡通報不等於一定撤市，但一定要重估風險",
        paragraphs: [
          "藥品上市後出現死亡通報，不代表必然由藥物造成，也不代表一定撤市。但它會觸發更嚴格的安全性分析，包括背景疾病風險、用藥族群、時間關聯與不良事件模式。",
          "若同時伴隨資料完整性疑慮，監管機關就可能要求補充資料、限制使用、更新標籤，甚至重新評估上市資格。"
        ],
        bullets: ["要區分關聯性與因果性。", "上市後真實世界資料很重要。", "監管反應會直接影響商業化曲線。"]
      },
      {
        heading: "Drugnews 的判斷",
        paragraphs: [
          "Tavneos 事件提醒投資人：罕病藥不是只看價格與小市場壟斷，也要看安全性、資料品質與監管韌性。越是高價藥，越承受更高的證據要求。"
        ],
        bullets: ["罕病藥估值不能忽略上市後風險。", "資料品質是高價藥商業化的底線。"]
      }
    ]
  }
];

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function svg({ title, summary, visual, card = "cover" }) {
  const nodes = visual.nodes;
  const nodeEls = nodes.map((node, index) => {
    const x = 170 + index * 190;
    return `<g transform="translate(${x} 278)">
      <circle r="42" fill="#ffffff" stroke="${visual.color}" stroke-width="5"/>
      <text y="7" text-anchor="middle" font-size="18" font-weight="700" fill="#102f3a">${escapeXml(node)}</text>
    </g>`;
  }).join("");
  const connectors = nodes.slice(1).map((_, index) => {
    const x1 = 212 + index * 190;
    const x2 = 318 + index * 190;
    return `<path d="M${x1} 278 C${x1 + 38} 248 ${x2 - 38} 248 ${x2} 278" fill="none" stroke="${visual.accent}" stroke-width="5" stroke-linecap="round"/>`;
  }).join("");
  const subtitle = card === "map" ? "Drugnews framework" : "Biotech business analysis";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675" role="img" aria-label="${escapeXml(title)}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#f7fbfb"/>
      <stop offset="1" stop-color="#eef5f3"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="18" stdDeviation="22" flood-color="#10313b" flood-opacity=".13"/>
    </filter>
  </defs>
  <rect width="1200" height="675" fill="url(#bg)"/>
  <path d="M0 540 C280 440 350 680 650 560 S960 380 1200 470" fill="none" stroke="#d7e6e8" stroke-width="5"/>
  <path d="M860 80 C990 110 1030 190 1200 175" fill="none" stroke="${visual.accent}" stroke-width="7" stroke-linecap="round" opacity=".75"/>
  <rect x="70" y="70" width="1060" height="535" rx="28" fill="#ffffff" filter="url(#shadow)" opacity=".94"/>
  <text x="110" y="132" font-size="22" font-weight="800" letter-spacing="3" fill="${visual.accent}">DRUGNEWS</text>
  <foreignObject x="110" y="150" width="890" height="112">
    <div xmlns="http://www.w3.org/1999/xhtml" style="font-family:-apple-system,BlinkMacSystemFont,'Noto Sans TC','PingFang TC',sans-serif;font-size:39px;line-height:1.2;color:#101820;font-weight:900;letter-spacing:0;">${escapeXml(title)}</div>
  </foreignObject>
  <foreignObject x="110" y="270" width="760" height="76">
    <div xmlns="http://www.w3.org/1999/xhtml" style="font-family:-apple-system,BlinkMacSystemFont,'Noto Sans TC','PingFang TC',sans-serif;font-size:23px;line-height:1.45;color:#5d6b76;font-weight:650;">${escapeXml(summary)}</div>
  </foreignObject>
  ${connectors}
  ${nodeEls}
  <g transform="translate(100 382)">
    <rect width="350" height="150" rx="26" fill="${visual.color}" opacity=".98"/>
    <circle cx="85" cy="76" r="45" fill="#ffffff" opacity=".2"/>
    <path d="M67 83 L82 98 L112 55" fill="none" stroke="#ffffff" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
    <text x="160" y="70" font-size="30" font-weight="900" fill="#ffffff">${escapeXml(visual.label)}</text>
    <text x="160" y="112" font-size="20" font-weight="700" fill="#d9f3f2">${escapeXml(subtitle)}</text>
  </g>
  <g transform="translate(520 410)">
    <rect width="520" height="88" rx="18" fill="#f5f8f8" stroke="#d5e1e4"/>
    <text x="32" y="55" font-size="24" font-weight="800" fill="#102f3a">讀法：先看臨床證據，再看商業位置與風險分配</text>
  </g>
</svg>
`;
}

function markdown(post) {
  const sections = post.sections.map((section, index) => {
    const image = index === 0
      ? `\n![${post.title}｜重點圖卡](images/cover.svg)\n`
      : index === 1
        ? `\n![${post.title}｜分析框架](images/framework.svg)\n`
        : "";
    const bullets = section.bullets.map((item) => `- ${item}`).join("\n");
    return `## ${section.heading}\n\n${section.paragraphs.join("\n\n")}\n${image}\n${bullets}`;
  }).join("\n\n");
  return `# ${post.title}\n\n${post.summary}\n\n${sections}\n\n## 小結\n\n這篇文章的重點不是把單一新聞看成短線題材，而是回到 Drugnews 一直強調的分析方法：從臨床證據、商業定位、競爭格局與監管風險四個面向，判斷一個生技醫藥事件是否真的會改變公司價值。\n\n${DISCLAIMER}\n`;
}

await fs.mkdir(PUBLISHED, { recursive: true });

for (const post of posts) {
  const dir = path.join(PUBLISHED, post.slug);
  const imageDir = path.join(dir, "images");
  await fs.mkdir(imageDir, { recursive: true });
  const meta = {
    title: post.title,
    slug: post.slug,
    date: post.date,
    publish_at: `${post.date}T10:30:00+08:00`,
    category: post.category,
    tags: post.tags,
    summary: post.summary,
    cover_image: "images/cover.svg",
    cover_image_alt: `${post.title} 圖解封面`,
    source_platform: "Dcard",
    dcard_url: post.dcard_url,
    facebook_url: FACEBOOK_URL
  };
  await fs.writeFile(path.join(dir, "meta.json"), `${JSON.stringify(meta, null, 2)}\n`, "utf8");
  await fs.writeFile(path.join(dir, "article.md"), markdown(post), "utf8");
  await fs.writeFile(path.join(imageDir, "cover.svg"), svg(post), "utf8");
  await fs.writeFile(path.join(imageDir, "framework.svg"), svg({ ...post, visual: { ...post.visual, nodes: post.sections[1].bullets.slice(0, 4).map((item) => item.split("，")[0].slice(0, 9)) } , card: "map" }), "utf8");
  console.log(`Promoted ${post.date} ${post.slug}`);
}

const external = JSON.parse(await fs.readFile(EXTERNAL, "utf8"));
const filtered = external.filter((item) => item.source !== "Dcard");
await fs.writeFile(EXTERNAL, `${JSON.stringify(filtered, null, 2)}\n`, "utf8");
console.log(`Removed ${external.length - filtered.length} Dcard external link records`);
