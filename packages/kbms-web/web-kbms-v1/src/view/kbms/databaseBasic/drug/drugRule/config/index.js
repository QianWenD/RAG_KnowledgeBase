export default {
  api: {
    parent: kindo.api.kbms + 'base/drug/kbmsDrug/',
    editParent: kindo.api.kbms + 'base/drug/kbmsDrug/unitRelation',
    child: kindo.api.kbms + 'base/drug/kbmsDrugAndIndication',
    childList: kindo.api.kbms + 'base/drug/kbmsDrugAndIndication/listWithDetailPage',
    childAccurate: kindo.api.kbms + 'base/drug/kbmsDrugIndicationDetail',
    childExcess: kindo.api.kbms + 'base/drug/kbmsDrugExcess/',
    generic: kindo.api.kbms + 'adapter/kbmsDrugCatalogue/listByDrugIdPage',
    people: kindo.api.kbms + 'base/drug/drugBasicPopulations',
    // 禁忌人群
    population: kindo.api.kbms + 'base/drug/drugBasicPopulations/listForCombo',
    // 疾病
    disease: kindo.api.kbms + 'base/drug/drugBasicContra',
    icd10: kindo.api.kbms + 'base/drug/drugBasicContra/getDisease',
    // 成份
    ingredient: kindo.api.kbms + 'base/drug/drugBasicComposition',
    // 查询所有单位的接口
    listForCombo: kindo.api.kbms + 'datadict/kbmsDrugUnit/listForCombo',
    // 查询药品说明书的接口
    drugInstructions: kindo.api.kbms + 'base/drug/kbmsPackageInsert',
    // 适应症-新增-查询
    listForDrugPage: kindo.api.kbms + 'base/drug/kbmsDrugIndication/listForDrugPage',
    // 取消推送
    cancelPush: kindo.api.kbms + 'base/drug/kbmsDrug/unPush'
  },
  mock: {}
}
