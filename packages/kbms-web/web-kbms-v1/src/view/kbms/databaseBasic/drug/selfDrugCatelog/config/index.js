export default {
  api: {
    // 表格查询
    table: kindo.api.kbms + 'base/drug/kbmsDrug/',
    // 单条编辑查询
    editQuery: kindo.api.kbms + 'base/drug/kbmsDrug/getById',
    // 模糊搜索小剂型
    blurQuery: kindo.api.kbms + 'datadict/kbmsDosageActualForm/listAll',
    // 查询所有单位的接口
    listForCombo: kindo.api.kbms + 'datadict/kbmsDrugUnit/listForCombo',
    // 导出
    export: kindo.api.kbms + 'v1/mi/data/basis/t009/export/',

    // 导入
    import: kindo.api.kbms + 'v1/mi/data/basis/t009/import/',
    // 推送
    push: kindo.api.kbms + 'base/drug/kbmsDrug/push'
  },
  mock: {}
}
