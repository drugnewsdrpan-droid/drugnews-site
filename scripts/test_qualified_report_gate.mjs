import assert from 'node:assert/strict';
import {validateQualifiedReportGate} from './integrate_qualified_report.mjs';

// Synthetic input-validation counterexamples; never content or publication QA.
const good={status:'COMPLETED_INDEPENDENT_QA',verdict:'PASS_FULL_ZH_EN_REPORT_CONTENT_GATE',whole_report_PASS_not_only_local_cell:true,P0:0,P1:0,overall_quality_score_per_language:97.5,article_and_image_AI_feel_max:{all_within20:true},reviewer:{author_or_integrator:false}};
assert.doesNotThrow(()=>validateQualifiedReportGate(good,'2026-10-08'));
assert.doesNotThrow(()=>validateQualifiedReportGate(good,'2028-02-29'));
for (const score of [undefined,null,NaN,Infinity,'97.5',94.99,100.01]) assert.throws(()=>validateQualifiedReportGate({...good,overall_quality_score_per_language:score},'2026-10-08'));
for (const value of [undefined,null,1,'true']) {
  assert.throws(()=>validateQualifiedReportGate({...good,whole_report_PASS_not_only_local_cell:value},'2026-10-08'));
  assert.throws(()=>validateQualifiedReportGate({...good,article_and_image_AI_feel_max:{all_within20:value}},'2026-10-08'));
}
for (const date of ['2026-02-30','2026-02-29','2026-13-01','2026-00-01','2026-10-08T00:00:00Z']) assert.throws(()=>validateQualifiedReportGate(good,date));
console.log('Qualified report gate: nonnumeric/missing scores, nonboolean whole-scope gates and invalid Taipei calendar days rejected PASS (synthetic inputs only).');
