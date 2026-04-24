export default {
  api: {
    table: kindo.api.kbms + 'rule/drug/kbmsRuleMedicineAge/listWithHcPage/',
    // 操作表的
    operateTable: kindo.api.kbms + 'rule/drug/kbmsRuleMedicineAge/',
    // 获取排除条件
    escape: kindo.api.kbms + 'base/drug/kbmsDrugIndication',
    // 获取药品
    drug: kindo.api.kbms + 'base/drug/kbmsHealthCareDrug',
    // 获取限制条件
    xzTj: kindo.api.kbms + 'datadict/kbmsAge/listAll'
  },
  mock: {}
}
