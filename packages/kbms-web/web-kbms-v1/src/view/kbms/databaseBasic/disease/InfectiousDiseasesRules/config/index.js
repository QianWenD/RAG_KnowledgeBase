export default {
  api: {
    parent: kindo.api.kbms + 'rule/disease/kbmsRuleDiseaseScreening',
    // 低端项目主表查询
    LowProject: kindo.api.kbms + 'rule/disease/kbmsRuleDiseaseScreeningDetail/',
    // 疾病
    disease: kindo.api.kbms + 'rule/disease/kbmsItemAndIndication/listWithDetailPage/',
    // 点击疾病名称弹窗
    childAccurate: kindo.api.kbms + 'base/drug/kbmsDrugIndicationDetail',
    // 疾病新增查询列表
    listForDrugPage: kindo.api.kbms + 'base/drug/kbmsDrugIndication/listForDiseasePage',
    // 疾病批量新增
    child: kindo.api.kbms + 'rule/disease/kbmsItemAndIndication/'
  },
  mock: {}
}
