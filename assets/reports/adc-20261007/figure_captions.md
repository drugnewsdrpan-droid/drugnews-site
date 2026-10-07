# ADC R2｜逐圖圖說、來源與數據

研究母版 **ADC-20261007-R1**；圖文版本 **ADC-20261007-R1-LAYERED-HTML-R2-1.0**。研究資料截至 **2026-10-07（Asia/Taipei）**，新增來源核讀同日。編輯歸屬：**Drugnews｜藥時事**。

本附件提供四種圖解的繁中與忠實英文說明。完整可機讀來源、日期角色及支持位置見 [figure_sources.json](figure_sources.json)。新增來源只有R10、D35；企業關係圖回讀既有D01、R07、D16。

This appendix supplies Traditional Chinese and faithful English descriptions for four figure designs. The research parent, cutoff and presentation version above apply to both languages. The machine-readable index preserves source locations and date roles. R10 and D35 are the only new sources; D01, R07 and D16 were re-read for the company map.


<a id="figure-P01"></a>
## P01｜下一代ADC，要修好哪一段？

**讀者問題：** ADC如何把負載送到作用位置？下一代設計要改善哪個失效環節？
**一句圖義：** 下一代設計的價值，在於改善特定失效環節。

**圖說：** 抗體先結合膜上靶點，ADC經內吞與胞內運輸，依連接子及抗體設計釋出活性負載。Topo-I抑制負載通往細胞核，造成DNA損傷；微管抑制負載在胞質干擾微管與細胞分裂。兩條作用分支代表替代負載類別。血中穩定、抗原異質性、胞內遞送與負載抗藥，將技術差異連到可檢驗的失效環節。

### Which step should the next ADC improve?

**Reader question:** How does an ADC deliver its payload to its site of action, and which failure point should a new design improve?
**Takeaway:** A next-generation design is valuable for the failure point it improves.

**Caption:** The antibody binds a surface antigen. The ADC is internalized and traffics intracellularly before releasing an active payload, according to its linker and antibody design. A Topo-I inhibitor payload enters the nucleus and causes DNA damage; a microtubule inhibitor acts on cytoplasmic microtubules and cell division. These are alternative payload classes. Blood stability, antigen heterogeneity, intracellular delivery and payload resistance connect design differences to testable failure points.

**看圖 / Assets：** [繁中PNG](figures/P01_ZH.png) · [ZH editable SVG](figures/P01_ZH.svg) · [English PNG](figures/P01_EN.png) · [EN editable SVG](figures/P01_EN.svg)。
**尺寸 / Dimensions：** 兩語原尺寸 1170 × 4158 px；實際390px檢查尺寸 390 × 1386 px。 / Both languages: native 1170 × 4158 px; actual mobile review render 390 × 1386 px。
**生成方式：** 沿原創可編輯SVG機轉圖作指定差異修正，再由Inkscape將兩語各張完整SVG轉為PNG。 / A scoped correction to the original editable SVG mechanism drawing; Inkscape renders each complete language-specific SVG to PNG.

**數據 / Data：** [P01_mechanism.json](data/P01_mechanism.json).
**來源 / Sources：** [R02](#source-R02) · [R03](#source-R03) · [R04](#source-R04) · [R06](#source-R06) · [R10](#source-R10).

**R2來源修正：** 刪除原recycled_complex節點、內體返回膜面的灰色虛線與相應F3回收文字；F3改為胞內遞送。T14未能以公開原文核對的分支不再作本圖依據。R10直接支持另一項2019年anti-HER2 ADC臨床前研究的pH依賴抗原解離與溶小體累積，沒有替DCB／LYSward平台背書；抗原解離不寫成酸敏連接子。

**R2 source correction:** The recycled_complex node, gray endosome-to-surface branch and corresponding F3 recycling text were removed; F3 now describes intracellular delivery. The branch not verified against T14’s public text is no longer used in this figure. R10 directly supports pH-dependent antigen dissociation and lysosomal accumulation in a separate 2019 preclinical anti-HER2 ADC study; it does not verify DCB/LYSward. Antigen dissociation is not relabeled as an acid-sensitive linker.

**圖的範圍 / Figure scope：** 典型內吞途徑概念圖；尺寸、分子數、抗原密度及機率不按比例。Topo-I與微管分支為替代負載類別；未畫旁觀者作用。 / A schematic of a typical internalizing ADC route; sizes, molecule counts, antigen density and probabilities are not quantitative. Topo-I and microtubule branches are alternative payload classes; no bystander pathway is shown.

**Alt（繁中）：** 上方為胞外，抗體Fab端結合細胞膜上的抗原，膜內陷形成容納ADC的胞內體。青綠色實線箭頭由胞內體指向溶小體。釋出的橙色小分子負載越過溶小體膜，再以兩條替代路徑分別通往細胞核DNA與胞質微管。胞外橙色虛線表示可能的過早釋放；圖中沒有回到膜面的灰色回收分支。沿途標示血中穩定、抗原異質性、胞內遞送與負載抗藥。

**Alt (English):** The upper region is extracellular. An antibody Fab tip binds a transmembrane antigen; membrane invagination forms an endosome containing the ADC. A solid teal arrow leads from the endosome to a lysosome. Released orange small-molecule payload crosses the lysosomal membrane and follows alternative routes to nuclear DNA or cytoplasmic microtubules. An extracellular orange dashed path depicts possible premature release. No gray return-to-surface recycling branch is shown. Blood stability, antigen heterogeneity, intracellular delivery and payload resistance are annotated.

<a id="figure-P02"></a>
## P02｜各自第一線PFS改善，接續療效仍需證據

**讀者問題：** ADC走向第一線的證據，究竟比較了哪些人、治療與終點？
**一句圖義：** 各自同試驗對照支持第一線PFS改善；這些試驗不能回答既往Topo-I ADC失敗後的接續療效。

**圖說：** 三個獨立三期試驗panel，分別呈現原試驗組與對照組的BICR中位PFS：TROPION-Breast02為10.8對5.6個月，ASCENT-03為9.7對6.9個月，ASCENT-04為11.2對7.8個月。FDA比較N依序644、558、443；各自HR與95% CI另作文字，OS另列。圖序沿F05，不作跨試驗療效排序。

### First-line PFS gains, sequencing needs evidence

**Reader question:** Which patients, treatments and endpoints were compared in the evidence for first-line ADCs?
**Takeaway:** Each trial supports a PFS benefit against its own first-line comparator; these trials do not establish efficacy after prior topoisomerase-I ADC failure.

**Caption:** Three independent phase 3 panels show BICR-assessed median PFS for each original experimental arm and comparator: 10.8 versus 5.6 months in TROPION-Breast02, 9.7 versus 6.9 months in ASCENT-03, and 11.2 versus 7.8 months in ASCENT-04. FDA comparison Ns are 644, 558 and 443. Each HR and 95% CI is a separate text annotation; OS is shown separately. Panel order follows F05 and is not a cross-trial efficacy ranking.

**看圖 / Assets：** [繁中PNG](figures/P02_ZH.png) · [ZH editable SVG](figures/P02_ZH.svg) · [English PNG](figures/P02_EN.png) · [EN editable SVG](figures/P02_EN.svg)。
**尺寸 / Dimensions：** 兩語原尺寸 1170 × 5205 px；實際390px檢查尺寸 390 × 1735 px。 / Both languages: native 1170 × 5205 px; actual mobile review render 390 × 1735 px。
**生成方式：** 原Matplotlib定量長條圖，保留SVG文字；原兩語完整SVG經Inkscape整張轉PNG。本輪直接沿用原PNG/SVG，未重畫。 / Original Matplotlib quantitative bars with editable SVG text; each complete original SVG was rasterized with Inkscape. R2 reuses the PNG/SVG files unchanged.

**數據 / Data：** [P02_clinical.csv](data/P02_clinical.csv) · [P02_clinical.json](data/P02_clinical.json).
**來源 / Sources：** [C03](#source-C03) · [C06](#source-C06) · [C18](#source-C18) · [C19](#source-C19) · [C20](#source-C20).

### 可抽取的試驗數值 / Extractable trial values

共同範圍：成人不可切除局部晚期／轉移TNBC、未接受該晚期階段全身治療的試驗族群。 / Shared setting: adults with unresectable locally advanced or metastatic TNBC and no prior systemic therapy for advanced disease.

**TROPION-Breast02｜N＝644（FDA）**

- 人群：不適合PD-(L)1治療。Dato-DXd對醫師選擇化療；中位PFS **10.8對5.6個月**，HR **0.57**（95% CI **0.47–0.69**）。FDA公告：**2026-05-22**。[C03](#source-C03)
- Population: Not candidates for PD-(L)1 therapy. Dato-DXd versus Investigator's choice chemotherapy; median PFS **10.8 versus 5.6 months**, HR **0.57** (95% CI **0.47–0.69**). FDA announcement: **2026-05-22**.
- 另列OS / Separate OS: median **23.7 vs 18.7 months**；HR **0.79**（95% CI **0.64–0.98**）。

**ASCENT-03｜N＝558（FDA）**

- 人群：不適合PD-(L)1治療。SG對nab-paclitaxel、paclitaxel或gemcitabine＋carboplatin；中位PFS **9.7對6.9個月**，HR **0.62**（95% CI **0.50–0.77**）。FDA公告：**2026-06-24**。[C06](#source-C06)
- Population: Not candidates for PD-(L)1 therapy. SG versus Nab-paclitaxel, paclitaxel, or gemcitabine plus carboplatin; median PFS **9.7 versus 6.9 months**, HR **0.62** (95% CI **0.50–0.77**). FDA announcement: **2026-06-24**.
- OS：FDA核准分析時尚未成熟。 / OS was immature at the cited FDA approval analysis.

**ASCENT-04 / KEYNOTE-D19｜N＝443（FDA）**

- 人群：PD-L1 CPS≥10。SG＋pembrolizumab對醫師選擇化療＋pembrolizumab；中位PFS **11.2對7.8個月**，HR **0.65**（95% CI **0.51–0.84**）。FDA公告：**2026-06-24**。[C06](#source-C06)
- Population: PD-L1 CPS ≥10. SG＋pembrolizumab versus Investigator's choice chemotherapy plus pembrolizumab; median PFS **11.2 versus 7.8 months**, HR **0.65** (95% CI **0.51–0.84**). FDA announcement: **2026-06-24**.
- OS：FDA核准分析時尚未成熟。 / OS was immature at the cited FDA approval analysis.

**單位與縮寫：** PFS＝無惡化存活期；OS＝總存活期；HR＝風險比；CI＝信賴區間；N為人數。PFS／OS以月計，HR與CI無單位，幣種不適用。HR不由兩個中位月數相除求得。

**Units and abbreviations:** PFS = progression-free survival; OS = overall survival; HR = hazard ratio; CI = confidence interval; N counts participants. PFS/OS are in months, HR/CI are dimensionless, and currency is not applicable. An HR is not obtained by dividing two medians.

**日期及缺項：** FDA 2026-05-22及2026-06-24均為公告日，不是試驗資料截點。三試驗trial_data_cutoff均未存，保留null。ASCENT-03沿FDA數值N＝558，原C19登錄另為623（ACTUAL），兩者關係仍未知；ASCENT-03／04分組N及成熟OS數值未補造。

**Dates and missing values:** May 22 and June 24, 2026 are FDA announcement dates, not trial data cutoffs. All three trial_data_cutoff fields remain null because no cutoff was stored. ASCENT-03 keeps the FDA numerical N = 558; the stored C19 registry enrollment is 623 (ACTUAL), and their relationship remains unknown. Missing ASCENT-03/04 arm Ns and mature OS values have not been invented.

原185值盤點未有同口徑年度銷售序列；R2另以D35新增P03三年原值，沒有改寫原P02盤點或25值。 / The original 185-value inventory contained no eligible annual sales series. R2 adds P03 from D35 while preserving P02’s original inventory and 25 values.

**Alt（繁中）：** 三個獨立的0–12個月橫向PFS長條比較；青綠為ADC組、灰藍為原對照組。前兩試驗人群不適合PD-(L)1治療，ASCENT-04為PD-L1 CPS≥10。每panel文字保留N、HR／CI及FDA公告日，HR／CI未作月數誤差線。

**Alt (English):** Three independent horizontal PFS bar comparisons, each on a 0–12-month axis. Teal indicates the ADC arm and gray-blue its original comparator. The first two populations are not candidates for PD-(L)1 therapy; ASCENT-04 has PD-L1 CPS ≥10. Each panel retains N, HR/CI and the FDA announcement date as text; HR/CI is not a month-based error bar.

<a id="figure-P03"></a>
## P03｜Trodelvy銷售續增，增速放慢

**讀者問題：** 代表ADC產品的已披露年度銷售，顯示了什麼商業變化？
**一句圖義：** 銷售續增、增速放慢；適應症組合仍影響商業表現。

**圖說：** Gilead同一份2025年Form 10-K披露Trodelvy在2023、2024、2025年淨產品銷售為1,063、1,315、1,397百萬美元；同比依原值重算為23.7%與6.2%。口徑為合併報表全球合計、US GAAP淨產品銷售及名義美元。公司稱2025乳癌需求增長被膀胱癌適應症撤回部分抵銷，未拆各因素金額。

### Trodelvy sales rose; growth slowed

**Reader question:** What commercial change is visible in a representative ADC’s disclosed annual sales?
**Takeaway:** Sales rose while growth slowed; indication mix still affects commercial performance.

**Caption:** Gilead’s 2025 Form 10-K reports Trodelvy net product sales of USD 1,063 million, USD 1,315 million and USD 1,397 million in 2023, 2024 and 2025. Recalculated annual growth is 23.7% and 6.2%. The scope is Gilead’s global consolidated US GAAP net product sales in nominal USD. Management attributed growth to breast cancer demand, partly offset by withdrawal of the bladder cancer indication, without quantifying each factor.

**看圖 / Assets：** [繁中PNG](figures/P03_ZH.png) · [ZH editable SVG](figures/P03_ZH.svg) · [English PNG](figures/P03_EN.png) · [EN editable SVG](figures/P03_EN.svg)。
**尺寸 / Dimensions：** 兩語原尺寸 1170 × 2550 px；實際390px檢查尺寸 390 × 850 px。 / Both languages: native 1170 × 2550 px; actual mobile review render 390 × 850 px。
**生成方式：** Matplotlib原創定量柱狀圖，SVG保留可編輯文字；每語完整SVG以Inkscape整張轉為PNG。 / An original Matplotlib quantitative bar chart with editable SVG text; Inkscape rasterizes each complete language-specific SVG to PNG.

**數據 / Data：** [P03_sales.csv](data/P03_sales.csv) · [P03_sales.json](data/P03_sales.json).
**來源 / Sources：** [D35](#source-D35).

**重算 / Recalculation：** `(1,315 ÷ 1,063 − 1) × 100% = 23.7%`；`(1,397 ÷ 1,315 − 1) × 100% = 6.2%`（四捨五入至一位小數 / rounded to one decimal place）。

**口徑與時序 / Scope and timing：** 一個代表品，非全球ADC市場；不加計合作款或權利金，不將2026第一線核准倒作2025銷售原因。 / One representative product, not the global ADC market; no collaboration payments or royalties are added, and 2026 first-line approvals are not used to explain 2025 sales retrospectively.

財務期間 / Financial periods：2023、2024、2025各完整曆年。申報 / Filed：2026-02-24。核讀 / Checked：2026-10-07。原單位 / Original unit：USD million；名義美元 / nominal USD。

**Alt（繁中）：** 三柱圖以零為基線，呈現Trodelvy在Gilead合併報表的2023至2025年度淨產品銷售：1,063、1,315、1,397百萬美元。下方獨立文字標示2024較2023增長23.7%、2025較2024增長6.2%，百分比未與美元共軸。數值為完整年度、名義美元；D35為2026年2月24日申報的2025 Form 10-K。單一代表品，非全球ADC市場。

**Alt (English):** A zero-baseline three-bar chart shows Trodelvy annual net product sales in Gilead’s consolidated accounts for 2023–2025: USD 1,063 million, USD 1,315 million and USD 1,397 million. Separate text below shows growth of 23.7% for 2024 versus 2023 and 6.2% for 2025 versus 2024. Percentages do not share the dollar axis. Values cover complete years in nominal USD. Source D35 is the 2025 Form 10-K filed February 24, 2026. One representative product, not the global ADC market.

<a id="figure-P04"></a>
## P04｜合作、供應與組織持有，是不同承諾

**讀者問題：** 同樣布局ADC，企業究竟取得什麼、又由誰負責把候選藥往前推？
**一句圖義：** 同一DXd平台可連結不同全球夥伴；看清資產、地域權利與製造責任，才能看懂合作的價值。

**圖說：** 選列R1已有的合作配置：第一三共以不同DXd資產連結AstraZeneca與Merck，並承擔所列合作資產的製造供應；Gilead收購Tubulis，取得資產、平台與團隊。連線只表示已披露的特定關係，不代表所有公司互有合約。合作原始日期見圖；來源回讀2026-10-07。[D01][R07][D16]

### Alliances, supply and ownership are different commitments

**Reader question:** When companies invest in ADCs, what do they obtain and who is responsible for moving each candidate forward?
**Takeaway:** One DXd platform can connect with different global partners; assets, territorial rights and manufacturing responsibilities explain the value of each alliance.

**Caption:** Selected alliances already covered in R1: Daiichi Sankyo connects different DXd assets with AstraZeneca and Merck and is responsible for manufacturing and supply of the listed partnered assets. Gilead acquired Tubulis, including its assets, platform and team. Lines represent only the disclosed relationships shown. Original agreement dates appear in the figure; sources re-read on 2026-10-07. [D01][R07][D16]

**看圖 / Assets：** [繁中PNG](figures/P04_ZH.png) · [ZH editable SVG](figures/P04_ZH.svg) · [English PNG](figures/P04_EN.png) · [EN editable SVG](figures/P04_EN.svg)。
**尺寸 / Dimensions：** 兩語原尺寸 1170 × 3534 px；實際390px檢查尺寸 390 × 1178 px。 / Both languages: native 1170 × 3534 px; actual mobile review render 390 × 1178 px。
**生成方式：** 原創可編輯SVG節點／關係圖，使用真實向量路徑與文字；Inkscape將每語完整SVG轉為PNG。 / An original editable SVG node-and-relationship map using vector paths and text; Inkscape rasterizes each complete language-specific SVG to PNG.

**數據 / Data：** [P04_roles.json](data/P04_roles.json) · [P04_edges.csv](data/P04_edges.csv).
**來源 / Sources：** [D01](#source-D01) · [R07](#source-R07) · [D16](#source-D16).

**日期與範圍 / Dates and scope：** 選列三項已有直接公告支持的關係；節點尺寸不代表金額。D01呈現2023原始合作配置，沒有聲稱重核所有後續修約；共同商業化責任不代表每項候選藥已獲上市許可。 / Three selected relationships supported by direct announcements; node sizes do not encode financial value. D01 depicts the original 2023 agreement configuration, without claiming to recheck all later amendments. Commercialization responsibilities do not imply marketing authorization for every candidate.

圖中保留原始日期精度：Enhertu合作2019-03；Datroway合作2020-07；Merck三資產合作2023-10-19；Tubulis收購完成2026-05-21。來源回讀2026-10-07。圖不編碼金額、幣種或市占。

Original date precision is retained: March 2019 for the Enhertu alliance, July 2020 for Datroway, October 19, 2023 for the Merck three-asset agreement, and May 21, 2026 for completion of the Tubulis acquisition. Sources were re-read October 7, 2026. The map encodes no financial amount, currency or market share.

**Alt（繁中）：** 企業分工關係圖。上方第一三共節點標示所列DXd合作資產的製造與供應，兩條雙向連線分別連到AstraZeneca與Merck／MSD。AstraZeneca連線列Enhertu的2019-03合作與Datroway的2020-07合作，來源R07；Merck連線列HER3-DXd、I-DXd及R-DXd的2023-10-19合作，來源D01。兩合作群均為日本以外共同開發與商業化，日本獨家權利由第一三共保留。下方獨立群由Gilead單向箭頭指向Tubulis，標2026-05-21完成收購及來源D16，納入ADC平台、資產及團隊，並列TUB-040與TUB-030。兩群沒有交叉合約連線，節點大小不表示財務規模。資料截至2026-10-07。

**Alt (English):** Company-role relationship map. The upper Daiichi Sankyo node identifies manufacturing and supply of the partnered DXd assets shown. Two bidirectional alliance links lead to AstraZeneca and Merck/MSD. The AstraZeneca link identifies the March 2019 Enhertu and July 2020 Datroway alliances, source R07; the Merck link identifies the October 19, 2023 HER3-DXd, I-DXd and R-DXd alliance, source D01. Both alliances cover co-development and commercialization outside Japan, with Daiichi Sankyo retaining exclusive Japanese rights. A separate lower group shows a directional arrow from Gilead to Tubulis, recording completion of the acquisition on May 21, 2026, source D16. It includes the ADC platform, assets and team, with TUB-040 and TUB-030 named. No contractual link between the two groups is shown in this diagram, and node size has no financial meaning. Evidence cutoff: October 7, 2026.

## 逐圖來源入口 / Source locations

以下為本附錄實際使用的14個來源入口。完整必要原文短摘、數字支持及取得範圍存於`figure_sources.json`；沒有把未重讀來源標為本輪新驗。 / These are the 14 sources used by this appendix. The JSON index retains required excerpts, numeric support and access scope without describing reused sources as newly verified.

<a id="source-R02"></a>
### R02｜FDA — Clinical Pharmacology Considerations for Antibody-Drug Conjugates Guidance for Industry

[公開原始來源 / Public source](https://www.fda.gov/media/155997/download)

- 支持圖號 / Figure: P01。發布／申報 / Published or filed: **2024-03**。資料日期 / Data date: **2024-03**。
- 日期角色 / Date role: guidance publication month.
- 支持 / Support: 支持結合、內吞、釋出活性負載的典型路徑，以及ADC與游離負載暴露須分開考量。 / Binding, endocytosis, payload release and separate exposure to ADC and free payload.
- 位置 / Locator: Guidance II.A (printed p.2; PDF page 5), II.B (printed p.3; PDF page 6), III.A–B.
- 取得範圍 / Access scope: existing R1/pilot record reused; not newly fetched for this appendix.

<a id="source-R03"></a>
### R03｜Abelman et al. — TOP1 Mutations and Cross-Resistance to Antibody–Drug Conjugates in Patients with Metastatic Breast Cancer

[公開原始來源 / Public source](https://pmc.ncbi.nlm.nih.gov/articles/PMC12079096/)

- 支持圖號 / Figure: P01。發布／申報 / Published or filed: **2025-01-02**。資料日期 / Data date: **2020-09 to 2024-01; issue 2025-05-15**。
- 日期角色 / Date role: testing period and journal issue date.
- 支持 / Support: 支持負載靶點改變所致抗藥；R1記錄TOP1變異可能影響SN38與deruxtecan，非前瞻選藥規則。 / TOP1-associated resistance can affect SN38 and deruxtecan payloads; not a prospective treatment-selection rule.
- 位置 / Locator: Abstract—Results (same original article, publisher/PubMed public search index); R1 Results—Frequency of TOP1 mutations; Clinical outcomes; Discussion.
- 取得範圍 / Access scope: existing R1/pilot record reused; not newly fetched for this appendix.

<a id="source-R04"></a>
### R04｜Ogitani et al. — Bystander killing effect of DS-8201a in tumors with HER2 heterogeneity

[公開原始來源 / Public source](https://onlinelibrary.wiley.com/doi/full/10.1111/cas.12966)

- 支持圖號 / Figure: P01。發布／申報 / Published or filed: **2016-05-11**。資料日期 / Data date: **2016**。
- 日期角色 / Date role: cell and mouse study.
- 支持 / Support: 以HER2異質性模型支持靶點分布不均的遞送問題；本圖未繪旁觀者作用。 / Heterogeneous HER2 models establish uneven antigen distribution as a delivery problem. No bystander effect is drawn.
- 位置 / Locator: R1 source locator: Abstract and Results.
- 取得範圍 / Access scope: existing R1/pilot record reused; not newly fetched for this appendix.

<a id="source-R06"></a>
### R06｜Yamazaki et al. — Antibody-drug conjugates with dual payloads for combating breast tumor heterogeneity and drug resistance

[公開原始來源 / Public source](https://www.nature.com/articles/s41467-021-23793-7)

- 支持圖號 / Figure: P01。發布／申報 / Published or filed: **2021-06-10**。資料日期 / Data date: **2021**。
- 日期角色 / Date role: preclinical study.
- 支持 / Support: 支持循環穩定、溶小體釋放、異質性與外排相關的負載差異；微管類別沿用R1之R06_MECHANISM。 / Lysosomal release, circulation stability, heterogeneity and MMAE/MMAF properties; R1 record R06_MECHANISM supplies the microtubule class label.
- 位置 / Locator: Design and preparation; Fig.1 legend; Pharmacokinetic profiles; Fig.5 HER2-heterogeneous xenograft model.
- 取得範圍 / Access scope: existing R1/pilot record reused; not newly fetched for this appendix.

<a id="source-C03"></a>
### C03｜FDA: Datroway 第一線非PD-(L)1治療候選TNBC核准

[公開原始來源 / Public source](https://www.fda.gov/drugs/resources-information-approved-drugs/fda-approves-datopotamab-deruxtecan-dlnk-unresectable-or-metastatic-triple-negative-breast-cancer)

- 支持圖號 / Figure: P02。發布／申報 / Published or filed: **2026-05-22**。資料日期 / Data date: **2026-05-22**。
- 日期角色 / Date role: FDA announcement date, not a trial data cutoff.
- 支持 / Support: 非免疫治療候選TNBC之PFS、OS及適應症範圍。 / TROPION-Breast02 population, within-trial PFS and OS results.
- 位置 / Locator: FDA公告 Efficacy 段：按試驗名稱查找隨機分派人數、Median PFS、hazard ratio；C03另查Median OS；C06另查OS immature。.
- 取得範圍 / Access scope: existing R1/pilot record reused; not newly fetched for this appendix.

<a id="source-C06"></a>
### C06｜FDA: Trodelvy 第一線TNBC單藥及pembrolizumab併用核准

[公開原始來源 / Public source](https://www.fda.gov/drugs/resources-information-approved-drugs/fda-approves-sacituzumab-govitecan-hziy-monotherapy-and-combination-pembrolizumab-first-line)

- 支持圖號 / Figure: P02。發布／申報 / Published or filed: **2026-06-24**。資料日期 / Data date: **2026-06-24**。
- 日期角色 / Date role: FDA announcement date, not a trial data cutoff.
- 支持 / Support: ASCENT03／04之PFS與人群；OS仍未成熟。 / ASCENT-03/04 populations and within-trial PFS results; immature OS at the cited FDA analysis.
- 位置 / Locator: FDA公告 Efficacy 段：按試驗名稱查找隨機分派人數、Median PFS、hazard ratio；C03另查Median OS；C06另查OS immature。.
- 取得範圍 / Access scope: existing R1/pilot record reused; not newly fetched for this appendix.

<a id="source-C18"></a>
### C18｜ClinicalTrials.gov: A Study of Dato-DXd Versus Investigator's Choice Chemotherapy in Patients With Locally Recurrent Inoperable or Metastatic Triple-negative Breast Cancer, Who Are Not Candidates for PD-1/PD-L1 Inhibitor Therapy (TROPION-Breast02)

[公開原始來源 / Public source](https://clinicaltrials.gov/study/NCT05374512)

- 支持圖號 / Figure: P02。發布／申報 / Published or filed: **2022-05-16**。資料日期 / Data date: **2026-05-15**。
- 日期角色 / Date role: ClinicalTrials.gov last update stored in R1, not a trial data cutoff.
- 支持 / Support: 第一線Dato人群及既往TOP1治療排除條件。 / Exclusion of prior topoisomerase-I inhibitor treatment or ADCs carrying a topoisomerase inhibitor; supports the sequencing evidence boundary.
- 位置 / Locator: Participation Criteria / Exclusion Criteria；API路徑protocolSection.eligibilityModule.eligibilityCriteria。.
- 取得範圍 / Access scope: existing R1/pilot record reused; not newly fetched for this appendix.

<a id="source-C19"></a>
### C19｜ClinicalTrials.gov: Study of Sacituzumab Govitecan-hziy Versus Treatment of Physician's Choice in Patients With Previously Untreated Locally Advanced Inoperable or Metastatic Triple-Negative Breast Cancer

[公開原始來源 / Public source](https://clinicaltrials.gov/study/NCT05382299)

- 支持圖號 / Figure: P02。發布／申報 / Published or filed: **2022-05-19**。資料日期 / Data date: **2026-04-06**。
- 日期角色 / Date role: ClinicalTrials.gov last update stored in R1, not a trial data cutoff.
- 支持 / Support: 第一線SG人群及既往TOP1治療排除條件。 / Exclusion of prior topoisomerase-I inhibitor treatment or ADCs carrying a topoisomerase inhibitor; supports the sequencing evidence boundary.
- 位置 / Locator: Participation Criteria / Exclusion Criteria；API路徑protocolSection.eligibilityModule.eligibilityCriteria。.
- 取得範圍 / Access scope: existing R1/pilot record reused; not newly fetched for this appendix.

<a id="source-C20"></a>
### C20｜ClinicalTrials.gov: Study of Sacituzumab Govitecan-hziy and Pembrolizumab Versus Treatment of Physician's Choice and Pembrolizumab in Patients With Previously Untreated, Locally Advanced Inoperable or Metastatic Triple-Negative Breast Cancer

[公開原始來源 / Public source](https://clinicaltrials.gov/study/NCT05382286)

- 支持圖號 / Figure: P02。發布／申報 / Published or filed: **2022-05-19**。資料日期 / Data date: **2025-09-18**。
- 日期角色 / Date role: ClinicalTrials.gov last update stored in R1, not a trial data cutoff.
- 支持 / Support: SG合併免疫治療人群及既往TOP1治療排除條件。 / Exclusion of prior topoisomerase-I inhibitor treatment or ADCs carrying a topoisomerase inhibitor; supports the sequencing evidence boundary.
- 位置 / Locator: Participation Criteria / Exclusion Criteria；API路徑protocolSection.eligibilityModule.eligibilityCriteria。.
- 取得範圍 / Access scope: existing R1/pilot record reused; not newly fetched for this appendix.

<a id="source-R10"></a>
### R10｜Kang et al. — Engineering a HER2-specific antibody-drug conjugate to increase lysosomal delivery and therapeutic efficacy

[公開原始來源 / Public source](https://pmc.ncbi.nlm.nih.gov/articles/PMC6668989/)

- 支持圖號 / Figure: P01。發布／申報 / Published or filed: **2019-04-01**。資料日期 / Data date: **未載單一截點 / no single cutoff stated**。
- 日期角色 / Date role: online publication; journal issue May 2019.
- 支持 / Support: 抗體的pH依賴抗原解離，以及所研究anti-HER2 ADC的溶小體累積，是可直接研究的胞內遞送設計差異。 / pH-dependent antigen dissociation and lysosomal accumulation of the studied anti-HER2 ADCs are directly testable intracellular-delivery design differences.
- 位置 / Locator: Introduction第3段、累積試驗後主文及Figure 1／Supplementary Figure 8；PMC讀回137–149行。 / Introduction paragraph 3; accumulation-assay text; Figure 1 and cited Supplementary Figure 8.
- 取得範圍 / Access scope: new direct public primary-source support read in R2.

<a id="source-D35"></a>
### D35｜Gilead Sciences, Inc. 2025 Form 10-K — Trodelvy product sales and revenue recognition

[公開原始來源 / Public source](https://www.sec.gov/Archives/edgar/data/882095/000088209526000006/gild-20251231.htm)

- 支持圖號 / Figure: P03。發布／申報 / Published or filed: **2026-02-24**。資料日期 / Data date: **2023-12-31 / 2024-12-31 / 2025-12-31**。
- 日期角色 / Date role: complete years ended December 31; publication is the 2026-02-24 Form 10-K filing date.
- 支持 / Support: Trodelvy三年淨產品銷售、報表／幣種口徑與公司對2025變動的歸因。 / Three-year Trodelvy net product sales, reporting/currency basis and management attribution of the 2025 change.
- 位置 / Locator: Note 2 p65（Trodelvy三年Total欄；表頭1991–1993、數值2017行）；Note 1 p59（淨銷售）、p64（美元）；MD&A p40（公司增長歸因）。
- 取得範圍 / Access scope: new direct public primary source read in R2; all three raw values come from Note 2 in this one filing.

<a id="source-D01"></a>
### D01｜Daiichi Sankyo and Merck Announce Global Development and Commercialization Collaboration for Three Daiichi Sankyo DXd ADCs

[公開原始來源 / Public source](https://www.merck.com/news/daiichi-sankyo-and-merck-announce-global-development-and-commercialization-collaboration-for-three-daiichi-sankyo-dxd-adcs/)

- 支持圖號 / Figure: P04。發布／申報 / Published or filed: **2023-10-19**。資料日期 / Data date: **2023-10-19**。
- 日期角色 / Date role: original collaboration announcement date.
- 支持 / Support: 2023-10-19原始三資產合作：日本以外共同開發與潛在商業化，日本獨家權利由第一三共保留；第一三共負責製造與供應。 / Original three-asset agreement announced October 19, 2023: joint development and potential commercialization outside Japan, with Daiichi Sankyo retaining exclusive Japanese rights and responsibility for manufacturing and supply.
- 位置 / Locator: Opening agreement paragraphs, lines 97–100; Financial highlights, line 116; DXd portfolio, lines 122–125.
- 取得範圍 / Access scope: existing R1 source directly re-read for this limited R2 relationship map.

<a id="source-R07"></a>
### R07｜AstraZeneca／Daiichi Sankyo 與 Summit 合作評估 Datroway 加 ivonescimab

[公開原始來源 / Public source](https://www.astrazeneca.com/media-centre/press-releases/2026/az-ds-collaboration-with-summit-for-datroway.html)

- 支持圖號 / Figure: P04。發布／申報 / Published or filed: **2026-10-02**。資料日期 / Data date: **2026-10-02**。
- 日期角色 / Date role: 2026-10-02 announcement with retrospective March 2019 / July 2020 alliance dates.
- 支持 / Support: 公告中Daiichi Sankyo collaboration段回顧2019-03 Enhertu與2020-07 Datroway合作；第一三共保留日本獨家權利並負責製造供應。 / The Daiichi Sankyo collaboration paragraphs recount the March 2019 Enhertu and July 2020 Datroway alliances, Japanese exclusive rights retained by Daiichi Sankyo, and its manufacturing/supply responsibility.
- 位置 / Locator: Daiichi Sankyo collaboration, paragraphs beginning AstraZeneca and Daiichi Sankyo entered into a global collaboration; retrieved lines 205–206.
- 取得範圍 / Access scope: existing R1 source directly re-read for this limited R2 relationship map.

<a id="source-D16"></a>
### D16｜Gilead Sciences Completes Acquisition of Tubulis

[公開原始來源 / Public source](https://investors.gilead.com/news/news-details/2026/Gilead-Sciences-Completes-Acquisition-of-Tubulis-Further-Strengthening-Oncology-Portfolio/default.aspx)

- 支持圖號 / Figure: P04。發布／申報 / Published or filed: **2026-05-21**。資料日期 / Data date: **2026-05-21**。
- 日期角色 / Date role: acquisition-completion announcement date.
- 支持 / Support: 2026-05-21完成Tubulis收購；ADC資產、平台與團隊納入，團隊留在慕尼黑。 / Completion of the Tubulis acquisition on May 21, 2026, bringing ADC assets, platform and team into Gilead; the team remains in Munich.
- 位置 / Locator: Opening completion notice, line 32; named assets, line 34; ownership/team arrangements, line 36.
- 取得範圍 / Access scope: existing R1 source directly re-read for this limited R2 relationship map.

