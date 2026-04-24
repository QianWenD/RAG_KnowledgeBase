/*
 * updated by pengzhen on 2017/10/19
 * peng_zhen@outlook.com
 * -------------------------------------------------
 * 工具类:
 * 提供 string 处理, date 处理, 常用方法处理
 * -------------------------------------------------
 * queryUrlParam : 获取 url 参数
 * notify        : 系统 notify 提示
 * alert         : 系统 alert 提示
 * confirm       : 系统 confirm 提示
 * promise       : 系统 promise 简单封装
 * setUri        : 统一 uri
 * exportUrl     : 拼接导出的url
 * toTree        : 数组对象转化 tree 结构
 * formatNum     : 格式化数字
 * formatDate    : 格式化日期
 * formatTime    : 格式化时间
 * toPercent     : 将数字转化指定单位的字符串
 * md5           : md5 加密
 */

/*
 * 工具类常用方法实现
 */
let util = {
  /**
   * 用户系统主题路径
   * ex: kindo.util.getSysTheme('name')
   */
  getSysTheme() {
    return `@src/theme/${kindo.config.SYSTEM_THEME || 'default'}`
  },

  /**
   * 获取 url 参数
   * ex: kindo.util.queryUrlParam('name')
   */
  queryUrlParam(name, url) {
    if (!url) url = window.location.href
    name = name.replace(/[[\]]/g, '\\$&')
    let regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)')
    let results = regex.exec(url)
    if (!results) return null
    if (!results[2]) return ''
    return decodeURIComponent(results[2].replace(/\+/g, ' '))
  },

  /*
   * 下载文件, 使用 window.open 形式下载。
   * @url   string  : 原始资源地址
   * @param object  : url 参数
   * ex             : kindo.util.downloadFile('api', '{ size: 10000 }')
   */
  downloadFile(url, param) {
    const qs = require('qs')
    window.open(
      url +
        '?' +
        qs.stringify(param, {
          arrayFormat: 'repeat'
        })
    )
  },

  /**
   * ex: kindo.util.notify('提示', '提示', 'error')
   */
  notify: (msg = '提示', title = '提示', type = 'success') => {
    kindo.globalBus.$emit('notify', msg, title, type)
  },

  /**
   * ex: kindo.util.alert('提示', '提示', 'error')
   */
  alert: (msg = '提示', title = '提示', type = 'success') => {
    kindo.globalBus.$emit('message', msg, title, type)
  },

  /**
   * ex: kindo.util.confirm('提示', '提示', 'error', ()=>{}, ()=>{})
   */
  confirm: (msg = '提示', title = '提示', type = 'info', successCallBack = () => {}, errorCallBack = () => {}) => {
    kindo.globalBus.$emit('confirm', msg, title, type, successCallBack, errorCallBack)
  },

  /**
   * promise 对象简单实现
   * ex: kindo.util.promise().then().then() ...
   */
  promise: (fn = () => {}, timeout = 200) => {
    fn()
    return new Promise(function(resolve, reject) {
      setTimeout(function() {
        resolve()
      }, timeout)
    })
  },

  /*
   * 统一请求资源
   * xxxxSYS/xx/get
   * 给请求资源加上配置的动态资源, 默认以 xxxxSYS 为匹配资源地址
   * 当 uri 为 url 或者 .json后缀时, 则忽略
   * @strUri   string  : 原始资源地址
   * @type     string  : 匹配资源地址
   * ex                : kindo.util.setUri('api', 'webUrl') => kindo.const.URI.webUrl + 'api'
   */
  setUri: (strUri, type) => {
    if (kindo.validate.url(strUri) || strUri.substr(strUri.indexOf('.')) === '.json') {
      return strUri
    }

    let uriType = type || strUri.split('/')[0]
    let uriPath = kindo.config[uriType] || ''
    return uriPath + strUri
  },
  /*
   * 获取最顶部的菜单
   * 根据某个菜单获取顶部的菜单
   * @nodes        string  : 组成树结构的节点组成的对象数组，该数组不是树结构
   * @idKey        string  : 数组的id，唯一建
   * @pIdKey       string  : 数组的pid，关联的pid
   * @obj          object  : 某个菜单的某个属性和属性值，如{routerPath：'view/operationLevelManage/deptDimensionAnalysis'}
   * ex            :kindo.util.getTopMenu({routerPAth:'view/operationLevelManage/deptDimensionAnalysis'})=>返回顶层菜单的对象
   */
  getTopMenu: (nodes, obj, idKey = 'id', pIdKey = 'pid') => {
    let returnMenu = {}
    let getFatherMenu = menuItem => {
      if (!kindo.validate.isEmpty(menuItem[pIdKey]) && menuItem[pIdKey] !== '-1' && menuItem[pIdKey] !== '0' && menuItem[pIdKey] !== 0) {
        // pid为'' '-1' '0' 0
        let menuParams = {}
        for (let pp = 0; pp < nodes.length; pp++) {
          if (menuItem[pIdKey] === nodes[pp][idKey]) {
            menuParams = nodes[pp]
            break
          }
        }
        getFatherMenu(menuParams)
      } else {
        returnMenu = menuItem
      }
    }
    let menu = nodes.filter(item => {
      for (let key in obj) {
        if (item[key] === obj[key]) {
          return item
        }
      }
    })
    if (menu.length === 1) {
      getFatherMenu(menu[0])
    } else {
      // console.error('查询到多条或0条', undefined, 'waning')
    }
    return returnMenu
  },

  /**
   * 拼接导出的url
   * @baseUrl   string    :   需要拼接的 url
   * @paramsObj {}        :   url 参数
   * @token     bool      :   是否传递 token
   * ex: kindo.util.exportUrl(baseUrl, paramsObj, false)
   * ex: kindo.util.exportUrl(baseUrl, paramsObj, true)
   */
  exportUrl: (baseUrl, paramsObj, token = false) => {
    let temp = Object.assign({}, paramsObj)
    let paras = ''
    let idx = 0
    for (let o in temp) {
      paras += (idx === 0 ? '?' : '&') + o + '=' + (temp[o] || '')
      if (idx === 0) {
        idx = 1
      }
    }
    if (token) {
      return kindo.util.setUri(baseUrl) + paras + '&token=' + kindo.cache.get(kindo.constant.USER_TOKEN, 'session')
    } else {
      return kindo.util.setUri(baseUrl) + paras
    }
  },

  /*
   * 数组对象转化 tree 结构
   * @nodes   [{}]          :   数据对象
   * @idKey   string        :   唯一键
   * @pIdKey  string        :   父项唯一键
   * @childrenKey  string   :   children key
   * ex                     :   kindo.util.toTree([]) => []
   */
  toTree: (nodes, idKey = 'id', pIdKey = 'pId', childrenKey = 'children') => {
    let map = {}
    let node
    let roots = []

    nodes.forEach((item, index) => {
      map[item[idKey]] = index
    })
    for (let i = 0; i < nodes.length; i += 1) {
      node = nodes[i]
      if (node[pIdKey] !== '-1' && node[pIdKey] !== '' && nodes[map[node[pIdKey]]]) {
        if (!nodes[map[node[pIdKey]]][childrenKey]) {
          nodes[map[node[pIdKey]]][childrenKey] = []
          nodes[map[node[pIdKey]]][childrenKey].push(node)
        } else {
          nodes[map[node[pIdKey]]][childrenKey].push(node)
        }
      } else {
        roots.push(node)
      }
    }

    return roots
  },

  /**
   * 数字格式化
   * @num : 数字字符串
   * @precision : 精确小数位数
   * @separator : 分隔符
   * return : 格式化后的数字字符串
   * ex: kindo.util.formatNum(10000) => "10, 000"
   *     kindo.util.formatNum(10000, 2) => "10, 000.00"
   *     kindo.util.formatNum(.123456, 2, ' ') => "0.12"
   *     kindo.util.formatNum(56., 0, ' ') => "56"
   *     kindo.util.formatNum('56.a') => 56.a
   */
  formatNum: function(num, precision = 2, separator) {
    if (!isNaN(parseFloat(num)) && isFinite(num)) {
      let parts
      num = Number(num)
      num = (typeof precision !== 'undefined' ? num.toFixed(precision) : num).toString()
      parts = num.split('.')
      parts[0] = parts[0].toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1' + (separator || ', '))
      return parts.join('.')
    }
    if (num === null) {
      return ''
    } else if (num === 'undefined') {
      return ''
    }
  },

  /**
   * 格式化日期对象
   * @date  any : 可转换为 Date 类型的任意参数
   * @format  string  : 格式化字符串
   * return string  : 格式化后的日期字符串
   * ex : kindo.util.formatDate(new Date()) =>  '2016-01-10'
   */
  formatDate: function(date, format) {
    // 兼容 element-table 的 formatter
    if (arguments.length === 4 && arguments[0][arguments[1].property] === arguments[2]) {
      date = arguments[2]
    }
    if (kindo.validate.isEmpty(date)) return '--'
    if (typeof format !== 'string') format = 'yyyy-MM-dd'

    if (date instanceof Date) {
      return date.formatDate(format)
    } else {
      return date.toDate().formatDate(format)
    }
  },

  /**
   * 格式化时间对象
   * @date  any : 可转换为 Date 类型的任意参数
   * @format  string  : 格式化字符串
   * return string  : 格式化后的时间字符串
   * ex : kindo.util.formatTime(new Date()) =>  '2016-01-10 21:01:01'
   */
  formatTime: function(date, format = 'yyyy-MM-dd HH:mm:ss') {
    // 兼容 element-table 的 formatter
    if (arguments.length === 4 && arguments[0][arguments[1].property] === arguments[2]) {
      date = arguments[2]
    }
    if (kindo.validate.isEmpty(date)) return '--'
    if (typeof format !== 'string') format = 'yyyy-MM-dd HH:mm:ss'

    if (date instanceof Date) {
      return date.formatDate(format)
    } else {
      return date.toDate().formatDate(format)
    }
  },

  /**
   * 数字格式化
   * @num     any           :   可转换 float 的字符串或小数
   * @fixed   number        :   保留的小数位数
   * @symbol  string        :   单位
   * ex: kindo.util.toPercent(2.3333) => 2.33
   * ex: kindo.util.toPercent(0.3333, 2, '%') => 33.33%
   */
  toPercent: function(num, fixed = 2, symbol = null) {
    // 兼容 element-table 的 formatter
    if (arguments.length === 4 && arguments[0] && arguments[0][arguments[1].property] === arguments[2]) {
      num = arguments[2]
      fixed = 2
      symbol = null
    }

    let parseNum = parseFloat(num)
    let returnStr = ''
    if (parseNum.toString() === '0') {
      returnStr = parseNum.toFixed(fixed)
    } else if (parseNum) {
      returnStr = parseNum.toFixed(fixed)
    } else {
      returnStr = '--'
    }
    if (returnStr === '--') {
      return '--'
    } else {
      if (symbol) {
        return returnStr + symbol.toString()
      } else {
        return returnStr
      }
    }
  },

  /**
   * 深度复制
   * @data : 对象/数组
   * return : parent的复制对象/数组
   * ex: kindo.util.extendDeep([{label:'a', value: '1'},{label:'b', value: '2'}],[]) => [{label:'a', value: '1'},{label:'b', value: '2'}]
   */
  extendDeep(parent, child) {
    let i
    let proxy
    proxy = JSON.stringify(parent)
    proxy = JSON.parse(proxy)
    child = child || {}
    for (i in proxy) {
      if (proxy.hasOwnProperty(i)) {
        child[i] = proxy[i]
      }
    }
    proxy = null
    return child
  },

  /**
   * md5加密
   * @data : 字符串
   * return : 返回字符串MD5的十六进制表示。
   * ex: kindo.util.md5("160-bit hash") => "90d925d853c3d35cd54070bb75280fefad9de9e7"
   */
  md5: string => {
    function RotateLeft(lValue, iShiftBits) {
      return (lValue << iShiftBits) | (lValue >>> (32 - iShiftBits))
    }

    function AddUnsigned(lX, lY) {
      let lX4, lY4, lX8, lY8, lResult
      lX8 = lX & 0x80000000
      lY8 = lY & 0x80000000
      lX4 = lX & 0x40000000
      lY4 = lY & 0x40000000
      lResult = (lX & 0x3fffffff) + (lY & 0x3fffffff)
      if (lX4 & lY4) {
        return lResult ^ 0x80000000 ^ lX8 ^ lY8
      }
      if (lX4 | lY4) {
        if (lResult & 0x40000000) {
          return lResult ^ 0xc0000000 ^ lX8 ^ lY8
        } else {
          return lResult ^ 0x40000000 ^ lX8 ^ lY8
        }
      } else {
        return lResult ^ lX8 ^ lY8
      }
    }

    function F(x, y, z) {
      return (x & y) | (~x & z)
    }

    function G(x, y, z) {
      return (x & z) | (y & ~z)
    }

    function H(x, y, z) {
      return x ^ y ^ z
    }

    function I(x, y, z) {
      return y ^ (x | ~z)
    }

    function FF(a, b, c, d, x, s, ac) {
      a = AddUnsigned(a, AddUnsigned(AddUnsigned(F(b, c, d), x), ac))
      return AddUnsigned(RotateLeft(a, s), b)
    }

    function GG(a, b, c, d, x, s, ac) {
      a = AddUnsigned(a, AddUnsigned(AddUnsigned(G(b, c, d), x), ac))
      return AddUnsigned(RotateLeft(a, s), b)
    }

    function HH(a, b, c, d, x, s, ac) {
      a = AddUnsigned(a, AddUnsigned(AddUnsigned(H(b, c, d), x), ac))
      return AddUnsigned(RotateLeft(a, s), b)
    }

    function II(a, b, c, d, x, s, ac) {
      a = AddUnsigned(a, AddUnsigned(AddUnsigned(I(b, c, d), x), ac))
      return AddUnsigned(RotateLeft(a, s), b)
    }

    function ConvertToWordArray(string) {
      let lWordCount
      let lMessageLength = string.length
      let lNumberOfWordsTemp1 = lMessageLength + 8
      let lNumberOfWordsTemp2 = (lNumberOfWordsTemp1 - lNumberOfWordsTemp1 % 64) / 64
      let lNumberOfWords = (lNumberOfWordsTemp2 + 1) * 16
      let lWordArray = Array(lNumberOfWords - 1)
      let lBytePosition = 0
      let lByteCount = 0
      while (lByteCount < lMessageLength) {
        lWordCount = (lByteCount - lByteCount % 4) / 4
        lBytePosition = (lByteCount % 4) * 8
        lWordArray[lWordCount] = lWordArray[lWordCount] | (string.charCodeAt(lByteCount) << lBytePosition)
        lByteCount++
      }
      lWordCount = (lByteCount - lByteCount % 4) / 4
      lBytePosition = (lByteCount % 4) * 8
      lWordArray[lWordCount] = lWordArray[lWordCount] | (0x80 << lBytePosition)
      lWordArray[lNumberOfWords - 2] = lMessageLength << 3
      lWordArray[lNumberOfWords - 1] = lMessageLength >>> 29
      return lWordArray
    }

    function WordToHex(lValue) {
      let WordToHexValue = ''
      let WordToHexValueTemp = ''
      let lByte
      let lCount
      for (lCount = 0; lCount <= 3; lCount++) {
        lByte = (lValue >>> (lCount * 8)) & 255
        WordToHexValueTemp = '0' + lByte.toString(16)
        WordToHexValue = WordToHexValue + WordToHexValueTemp.substr(WordToHexValueTemp.length - 2, 2)
      }
      return WordToHexValue
    }

    function Utf8Encode(string) {
      string = string.replace(/\r\n/g, '\n')
      let utftext = ''

      for (let n = 0; n < string.length; n++) {
        let c = string.charCodeAt(n)

        if (c < 128) {
          utftext += String.fromCharCode(c)
        } else if (c > 127 && c < 2048) {
          utftext += String.fromCharCode((c >> 6) | 192)
          utftext += String.fromCharCode((c & 63) | 128)
        } else {
          utftext += String.fromCharCode((c >> 12) | 224)
          utftext += String.fromCharCode(((c >> 6) & 63) | 128)
          utftext += String.fromCharCode((c & 63) | 128)
        }
      }

      return utftext
    }

    let x = []
    let k, AA, BB, CC, DD, a, b, c, d
    let S11 = 7
    let S12 = 12
    let S13 = 17
    let S14 = 22
    let S21 = 5
    let S22 = 9
    let S23 = 14
    let S24 = 20
    let S31 = 4
    let S32 = 11
    let S33 = 16
    let S34 = 23
    let S41 = 6
    let S42 = 10
    let S43 = 15
    let S44 = 21

    string = Utf8Encode(string)

    x = ConvertToWordArray(string)

    a = 0x67452301
    b = 0xefcdab89
    c = 0x98badcfe
    d = 0x10325476

    for (k = 0; k < x.length; k += 16) {
      AA = a
      BB = b
      CC = c
      DD = d
      a = FF(a, b, c, d, x[k + 0], S11, 0xd76aa478)
      d = FF(d, a, b, c, x[k + 1], S12, 0xe8c7b756)
      c = FF(c, d, a, b, x[k + 2], S13, 0x242070db)
      b = FF(b, c, d, a, x[k + 3], S14, 0xc1bdceee)
      a = FF(a, b, c, d, x[k + 4], S11, 0xf57c0faf)
      d = FF(d, a, b, c, x[k + 5], S12, 0x4787c62a)
      c = FF(c, d, a, b, x[k + 6], S13, 0xa8304613)
      b = FF(b, c, d, a, x[k + 7], S14, 0xfd469501)
      a = FF(a, b, c, d, x[k + 8], S11, 0x698098d8)
      d = FF(d, a, b, c, x[k + 9], S12, 0x8b44f7af)
      c = FF(c, d, a, b, x[k + 10], S13, 0xffff5bb1)
      b = FF(b, c, d, a, x[k + 11], S14, 0x895cd7be)
      a = FF(a, b, c, d, x[k + 12], S11, 0x6b901122)
      d = FF(d, a, b, c, x[k + 13], S12, 0xfd987193)
      c = FF(c, d, a, b, x[k + 14], S13, 0xa679438e)
      b = FF(b, c, d, a, x[k + 15], S14, 0x49b40821)
      a = GG(a, b, c, d, x[k + 1], S21, 0xf61e2562)
      d = GG(d, a, b, c, x[k + 6], S22, 0xc040b340)
      c = GG(c, d, a, b, x[k + 11], S23, 0x265e5a51)
      b = GG(b, c, d, a, x[k + 0], S24, 0xe9b6c7aa)
      a = GG(a, b, c, d, x[k + 5], S21, 0xd62f105d)
      d = GG(d, a, b, c, x[k + 10], S22, 0x2441453)
      c = GG(c, d, a, b, x[k + 15], S23, 0xd8a1e681)
      b = GG(b, c, d, a, x[k + 4], S24, 0xe7d3fbc8)
      a = GG(a, b, c, d, x[k + 9], S21, 0x21e1cde6)
      d = GG(d, a, b, c, x[k + 14], S22, 0xc33707d6)
      c = GG(c, d, a, b, x[k + 3], S23, 0xf4d50d87)
      b = GG(b, c, d, a, x[k + 8], S24, 0x455a14ed)
      a = GG(a, b, c, d, x[k + 13], S21, 0xa9e3e905)
      d = GG(d, a, b, c, x[k + 2], S22, 0xfcefa3f8)
      c = GG(c, d, a, b, x[k + 7], S23, 0x676f02d9)
      b = GG(b, c, d, a, x[k + 12], S24, 0x8d2a4c8a)
      a = HH(a, b, c, d, x[k + 5], S31, 0xfffa3942)
      d = HH(d, a, b, c, x[k + 8], S32, 0x8771f681)
      c = HH(c, d, a, b, x[k + 11], S33, 0x6d9d6122)
      b = HH(b, c, d, a, x[k + 14], S34, 0xfde5380c)
      a = HH(a, b, c, d, x[k + 1], S31, 0xa4beea44)
      d = HH(d, a, b, c, x[k + 4], S32, 0x4bdecfa9)
      c = HH(c, d, a, b, x[k + 7], S33, 0xf6bb4b60)
      b = HH(b, c, d, a, x[k + 10], S34, 0xbebfbc70)
      a = HH(a, b, c, d, x[k + 13], S31, 0x289b7ec6)
      d = HH(d, a, b, c, x[k + 0], S32, 0xeaa127fa)
      c = HH(c, d, a, b, x[k + 3], S33, 0xd4ef3085)
      b = HH(b, c, d, a, x[k + 6], S34, 0x4881d05)
      a = HH(a, b, c, d, x[k + 9], S31, 0xd9d4d039)
      d = HH(d, a, b, c, x[k + 12], S32, 0xe6db99e5)
      c = HH(c, d, a, b, x[k + 15], S33, 0x1fa27cf8)
      b = HH(b, c, d, a, x[k + 2], S34, 0xc4ac5665)
      a = II(a, b, c, d, x[k + 0], S41, 0xf4292244)
      d = II(d, a, b, c, x[k + 7], S42, 0x432aff97)
      c = II(c, d, a, b, x[k + 14], S43, 0xab9423a7)
      b = II(b, c, d, a, x[k + 5], S44, 0xfc93a039)
      a = II(a, b, c, d, x[k + 12], S41, 0x655b59c3)
      d = II(d, a, b, c, x[k + 3], S42, 0x8f0ccc92)
      c = II(c, d, a, b, x[k + 10], S43, 0xffeff47d)
      b = II(b, c, d, a, x[k + 1], S44, 0x85845dd1)
      a = II(a, b, c, d, x[k + 8], S41, 0x6fa87e4f)
      d = II(d, a, b, c, x[k + 15], S42, 0xfe2ce6e0)
      c = II(c, d, a, b, x[k + 6], S43, 0xa3014314)
      b = II(b, c, d, a, x[k + 13], S44, 0x4e0811a1)
      a = II(a, b, c, d, x[k + 4], S41, 0xf7537e82)
      d = II(d, a, b, c, x[k + 11], S42, 0xbd3af235)
      c = II(c, d, a, b, x[k + 2], S43, 0x2ad7d2bb)
      b = II(b, c, d, a, x[k + 9], S44, 0xeb86d391)
      a = AddUnsigned(a, AA)
      b = AddUnsigned(b, BB)
      c = AddUnsigned(c, CC)
      d = AddUnsigned(d, DD)
    }

    let temp = WordToHex(a) + WordToHex(b) + WordToHex(c) + WordToHex(d)

    return temp.toLowerCase()
  }
}

export default util
