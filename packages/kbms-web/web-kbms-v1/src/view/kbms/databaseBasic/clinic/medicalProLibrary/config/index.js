export default {
  api: {
    // 查询
    table: kindo.api.kbms + 'adapter/kbmsItemCatalogue',
    // 查看详情
    detailTable: kindo.api.kbms + 'rule/drug/kbmsRuleCmedicineExcess/',
    // 导入
    import: kindo.api.kbms + 'v1/mi/data/point/t107/import',
    // 导出
    export: kindo.api.kbms + 'v1/mi/data/point/t107/export'
  },
  mock: {}
}
