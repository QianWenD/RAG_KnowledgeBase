export default {
  api: {
    parent: kindo.api.kbms + 'kbmsRuleGroupDiagnosis',
    child: kindo.api.kbms + 'kbmsRuleGroupDiagnosisD',
    // 远程查询icd10
    id10Query: kindo.api.kbms + 'datadict/kbmsDisease',
    // 远程查询ccdt
    ccdtQuery: kindo.api.kbms + 'kbmsCcdt',
    // 推送
    push: kindo.api.kbms + 'kbmsRuleGroupDiagnosis/push',
    // 批量新增
    batchAdd: kindo.api.kbms + 'kbmsRuleGroupDiagnosisD/batchAdd',
    // 导出
    export: kindo.api.kbms + 'kbmsRuleGroupDiagnosis/exportExcel',
    // 导入
    importExcel: kindo.api.kbms + 'kbmsRuleGroupDiagnosis/importExcel',
    // 模板下载
    downloadTemplate: kindo.api.kbms + 'kbmsRuleGroupDiagnosis/downloadTemplate'
  },
  mock: {}
}
