export default {
  api: {
    // 获取列表
    operation: kindo.api.kbms + 'kbmsRuleLowAdmission',
    // 获取药品项目列表
    getItemCodeList1: kindo.api.kbms + 'base/drug/kbmsHealthCareDrug',
    // 获取诊疗项目列表
    getItemCodeList2: kindo.api.kbms + 'base/item/kbmsItem',
    // 小剂型列表
    getLittle: kindo.api.kbms + 'datadict/kbmsDosageActualForm',
    // 大剂型列表
    getBig: kindo.api.kbms + 'datadict/kbmsDosageLabelForm',
    // 审核
    batchAudit: kindo.api.kbms + 'kbmsRuleLowAdmission/batchAudit'
  }
}