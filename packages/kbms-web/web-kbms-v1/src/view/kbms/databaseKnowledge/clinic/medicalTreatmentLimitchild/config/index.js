export default {
  api: {
    // 新增
    table: kindo.api.kbms + 'rule/item/kbmsRuleItemChild/',
    // 导入
    import: kindo.api.kbms + 'v1/mi/data/point/t107/import',
    // 导出
    export: kindo.api.kbms + 'v1/mi/data/point/t107/export',
    // 获取排除条件
    escape: kindo.api.kbms + 'base/drug/kbmsDrugIndication',
    // 获取限制条件
    xzTj: kindo.api.kbms + 'datadict/kbmsAge/listAll'
  },
  mock: {}
}
