export default {
  api: {
    default: {
      // 检查组、检验组、治疗、手术、耗材
      group: kindo.api.kbms + 'kbmsRuleGroupTreatItem',
      // 化学药
      hx_group: kindo.api.kbms + 'kbmsRuleGroupTreatDrug/chemical',
      table_hx: kindo.api.kbms + 'kbmsChemicalRela/filterForTreatDrug/',
      ylTree: kindo.api.kbms + 'kbmsChemicalPharmacologyL/tree/',
      glTree: kindo.api.kbms + 'kbmsChemicalFunctionL/tree/',
      // 中成药
      zcy_group: kindo.api.kbms + 'kbmsRuleGroupTreatDrug/cMedicine',
      table_zcy: kindo.api.kbms + 'kbmsChineseMedicineRela/filterForTreatDrug/',
      zcyTree: kindo.api.kbms + 'kbmsChineseMedicineL/tree/',
      // 化学药/中成药 审核
      audit: kindo.api.kbms + 'kbmsRuleGroupTreatDrug/batchAudit',
      // 化学药 新增删除
      add_hx: kindo.api.kbms + 'kbmsRuleGroupTreatDrug/chemical/batchAdd',
      add_item_hx: kindo.api.kbms + 'kbmsRuleGroupTreatDrug/chemical/batchAdd2',
      delete_hx: kindo.api.kbms + 'kbmsRuleGroupTreatDrug/chemical',
      // 中成药  新增删除
      add_zcy: kindo.api.kbms + 'kbmsRuleGroupTreatDrug/cMedicine/batchAdd',
      add_item_zcy: kindo.api.kbms + 'kbmsRuleGroupTreatDrug/cMedicine/batchAdd2',
      delete_zcy: kindo.api.kbms + 'kbmsRuleGroupTreatDrug/cMedicine'
    },
    rule: {
      // 检查组、检验组、治疗、手术、耗材
      group: kindo.api.kbms + 'kbmsRuleGroupTreatExpD1',
      // 化学药
      hx_group: kindo.api.kbms + 'kbmsRuleGroupTreatExpD2',
      table_hx: kindo.api.kbms + 'kbmsChemicalRela/filterForTreatExpDrug/',
      ylTree: kindo.api.kbms + 'kbmsChemicalPharmacologyL/tree/',
      glTree: kindo.api.kbms + 'kbmsChemicalFunctionL/tree/',
      // 中成药
      zcy_group: kindo.api.kbms + 'kbmsRuleGroupTreatExpD3',
      table_zcy: kindo.api.kbms + 'kbmsChineseMedicineRela/filterForTreatExpDrug/',
      zcyTree: kindo.api.kbms + 'kbmsChineseMedicineL/tree/',
      // 化学药 新增删除
      add_hx: kindo.api.kbms + 'kbmsRuleGroupTreatExpD2/batchAdd',
      add_item_hx: kindo.api.kbms + 'kbmsRuleGroupTreatExpD2/batchAdd2',
      delete_hx: kindo.api.kbms + 'kbmsRuleGroupTreatExpD2',
      // 中成药  新增删除
      add_zcy: kindo.api.kbms + 'kbmsRuleGroupTreatExpD3/batchAdd',
      add_item_zcy: kindo.api.kbms + 'kbmsRuleGroupTreatExpD3/batchAdd2',
      delete_zcy: kindo.api.kbms + 'kbmsRuleGroupTreatExpD3'

    },
    // 批量新增
    batchAdd: kindo.api.kbms + 'kbmsRuleGroupTreatItem/batchAdd'
  },
  mock: {}
}
