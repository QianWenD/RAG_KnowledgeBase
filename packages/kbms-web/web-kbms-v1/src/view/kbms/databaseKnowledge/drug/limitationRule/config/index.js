export default {
  api: {
    parent: kindo.api.kbms + 'rule/drug/kbmsRuleLimitCondition',
    copy: kindo.api.kbms + 'rule/drug/kbmsRuleLimitCondition/copy',
    accuracy: kindo.api.kbms + 'rule/drug/kbmsRuleLimitElement',
    fuzzy: kindo.api.kbms + 'rule/drug/kbmsRuleLimitElementVague',
    // 项目类型
    itemType: kindo.api.kbms + 'base/drug/kbmsDrugLimitType/listAll',
    // 诊疗项目
    medicalTreatment: kindo.api.kbms + 'base/item/kbmsItem',
    // 适应症
    Indication: kindo.api.kbms + 'base/drug/kbmsDrugIndication',
    // 人群
    kbmsAge: kindo.api.kbms + 'datadict/kbmsAge',
    // 药品
    kbmsHealthCareDrug: kindo.api.kbms + 'base/drug/kbmsHealthCareDrug'
  },
  mock: {}
}
