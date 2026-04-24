export default {
  api: {
    // 父表
    parent: kindo.api.kbms + 'base/drug/kbmsDrug/',
    // 查询所有单位的接口
    listForCombo: kindo.api.kbms + 'datadict/kbmsDrugUnit/listForCombo',
    // 子表名称
    child: kindo.api.kbms + 'base/drug/drugBasicComposition/',
    // 点击主表药品的查询
    generic: kindo.api.kbms + 'adapter/kbmsDrugCatalogue/listByDrugIdPage'
  },
  mock: {}
}
