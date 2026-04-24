export default {
  api: {
    table: kindo.api.kbms + 'base/drug/kbmsHealthCareDrug/',
    // 小剂型的模糊查询
    smallDogsage: kindo.api.kbms + 'datadict/kbmsDosageActualForm/listAll',
    // 大剂型的模糊查询
    bigDogsage: kindo.api.kbms + 'datadict/kbmsDosageLabelForm/listAll',
    // 导出
    export: kindo.api.kbms + 'v1/mi/data/basis/t009/export/',

    // 导入
    import: kindo.api.kbms + 'v1/mi/data/basis/t009/import/'
  },
  mock: {}
}
