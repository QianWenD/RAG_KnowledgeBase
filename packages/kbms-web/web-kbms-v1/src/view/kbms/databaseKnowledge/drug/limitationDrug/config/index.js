export default {
  api: {
    // 主表
    parent: kindo.api.kbms + 'rule/drug/kbmsRuleHcLimitDrug',
    // 新增规则下拉
    listRemark: kindo.api.kbms + 'adapter/kbmsCusHcCatalogue/listRemark',
    // 新增规则表达式下拉
    listForCombo: kindo.api.kbms + 'rule/drug/kbmsRuleLimitCondition/listForCombo',
    // 规则相关药品查询
    listAll: kindo.api.kbms + 'adapter/kbmsCusHcCatalogue/listAll'
  },
  mock: {}
}
