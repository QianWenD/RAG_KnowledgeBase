export default {
  api: {
    // 查询
    table1: kindo.api.kbms + 'datadict/kbmsPopulationCategory',
    // 查询
    table2: kindo.api.kbms + 'datadict/kbmsPopulationCategoryItem',
    // 项目编码远程查询 （药品）
    getItemCode1: kindo.api.kbms + 'base/drug/kbmsHealthCareDrug',
    // 项目编码远程查询 （项目）
    getItemCode2: kindo.api.kbms + 'kbmsRuleGroupTreat',
    // 项目编码远程查询 （诊断）
    getItemCode3: kindo.api.kbms + 'kbmsRuleGroupDiagnosis',
    // 项目编码远程查询 （险种）
    getItemCode4: kindo.api.kbms + 'rule/drug/kbmsRuleLimitCondition'
  }
}
