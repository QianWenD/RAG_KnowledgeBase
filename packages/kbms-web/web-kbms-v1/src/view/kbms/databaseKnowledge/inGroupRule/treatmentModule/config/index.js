export default {
  api: {
    parent: kindo.api.kbms + 'kbmsRuleGroupTreat',
    // 导出
    export: kindo.api.kbms + 'kbmsRuleGroupTreat/exportExcel',
    // 导入
    importExcel: kindo.api.kbms + 'kbmsRuleGroupTreat/importExcel',
    // 模板下载
    downloadTemplate: kindo.api.kbms + 'kbmsRuleGroupTreat/downloadTemplate'
  },
  mock: {}
}
