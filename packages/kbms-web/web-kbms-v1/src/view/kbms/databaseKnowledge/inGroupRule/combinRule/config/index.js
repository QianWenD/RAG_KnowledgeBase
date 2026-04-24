export default {
  api: {
    parent: kindo.api.kbms + 'kbmsRuleGroupCompose',
    // 删除
    delete: kindo.api.kbms + 'kbmsRuleGroupCompose/deleteById',
    // 新增 查询诊断模块信息
    zdTable: kindo.api.kbms + 'kbmsRuleGroupDiagnosis',
    // 上表新增提交    
    push: kindo.api.kbms + 'kbmsRuleGroupDiagnosis/push',
    // 下表查询
    child: kindo.api.kbms + 'kbmsRuleGroupTreatExp/',
    // 诊疗项目查询
    zlQuery: kindo.api.kbms + 'kbmsRuleGroupTreat'
  },
  mock: {}
}
