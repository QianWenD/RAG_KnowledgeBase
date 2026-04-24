export default {
  api: {
    table: kindo.api.kbms + 'kbmsChemicalRela/',
    // 药理分类查询
    ylQuery: kindo.api.kbms + 'kbmsChemicalPharmacologyL/tree',
    // 功能分类查询
    gnQuery: kindo.api.kbms + 'kbmsChemicalFunctionL/tree',
    // 药品远程查询
    drugQuery: kindo.api.kbms + 'base/drug/kbmsHealthCareDrug/'
  },
  mock: {}
}
