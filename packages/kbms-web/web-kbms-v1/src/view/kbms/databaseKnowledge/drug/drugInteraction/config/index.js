export default {
  api: {
    parent: kindo.api.kbms + 'kbmsRuleDrugInteractions',
    child: kindo.api.kbms + 'kbmsRuleDrugInteractionsG',
    detail: kindo.api.kbms + 'kbmsRuleDrugInteractionsD',
    // 药品远程查询
    drugQuery: kindo.api.kbms + 'base/drug/kbmsHealthCareDrug/'
  }
}