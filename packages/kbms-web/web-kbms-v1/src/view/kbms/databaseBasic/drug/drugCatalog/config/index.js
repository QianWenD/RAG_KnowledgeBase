export default {
  api: {
    // 菜单树的操作
    tree: kindo.api.kbms + 'base/drug/kbmsDrugCategory/tree/',
    // 新增/编辑树节点
    saveTree: kindo.api.kbms + 'base/drug/kbmsDrugCategory',
    deleteTree: kindo.api.kbms + 'base/drug/kbmsDrugCategory/deleteByDrugCategoryCode',
    // 表格的操作,
    table: kindo.api.kbms + 'base/drug/kbmsDrugCategoryRela/',
    // 模糊查询医保药品
    query: kindo.api.kbms + 'base/drug/kbmsHealthCareDrug/'
  },
  mock: {}
}
