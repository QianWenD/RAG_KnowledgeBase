/*
 * updated by pengzhen on 2017/6/21
 * peng_zhen@outlook.com
 * -------------------------------------------------
 * 工具类:
 * 字典类, 存储键值对
 */

let dictionary = {
  getDictionary: catalog => {
    let api = {
      kbmsDrugUnit: 'datadict/kbmsDrugUnit/listAll'
    }

    if (!catalog) {
      console.error('catalog 为空, 无法获取字典值', '提示', 'warning')
    }

    let url = ''
    if (api.hasOwnProperty(catalog)) {
      url = kindo.api.kbms + api[catalog]
    } else {
      url = kindo.api.upms + 'system/dict/get'
    }

    return kindo.globalBus.$http.get(url, { params: { catalog } }).then(res => res.data)
  },

  getLabel: (source, value) => {
    const item = source.filter(item => item.value === value)
    if (item.length > 0) {
      return item[0].label
    }

    return ''
  },

  getValue: (source, label) => {
    const item = source.filter(item => item.label === label)
    if (item.length > 0) {
      return item[0].value
    }

    return ''
  }
}

export default dictionary
