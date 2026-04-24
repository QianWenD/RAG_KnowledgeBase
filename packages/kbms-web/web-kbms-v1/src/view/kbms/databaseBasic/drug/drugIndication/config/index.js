export default {
  api: {
    parent: kindo.api.kbms + 'base/drug/kbmsDrugIndication',
    child: kindo.api.kbms + 'base/drug/kbmsDrugIndicationDetail',
    icd10: kindo.api.kbms + 'datadict/kbmsDisease/listForIndication'
  },
  mock: {}
}
