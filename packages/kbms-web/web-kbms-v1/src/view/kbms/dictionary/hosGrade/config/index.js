export default {
  api: {
    // 获取列表
    operation: kindo.api.kbms + 'kbmsHospitalLevel',
    // 获取药品项目列表
    getItemCodeList1: kindo.api.kbms + 'base/drug/kbmsHealthCareDrug',
    // 获取诊疗项目列表
    getItemCodeList2: kindo.api.kbms + 'base/item/kbmsItem',
    // 审核
    batchAudit: kindo.api.kbms + 'kbmsHospitalLevel/batchAudit'
  }
}