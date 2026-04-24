/*
 * added by pengzhen on 2017/1/9
 * peng_zhen@outlook.com
 * 常用正则验证
 * -------------------------------------------------
 * updated by pengzhen on 2017/19
 * 挂载 element ui form validate
 */

// 声明可用 pattern
let pattern = {
  // url 验证
  url: /^((https|http|ftp|rtsp|mms)?:\/\/)[^\s]+/,

  // number 验证, 包括正负整数
  number: /^[-+]?[0-9]*$/,

  // numerical 验证, 包括整数、浮点数、正、负数
  numerical: /^[-+]?[0-9]+(\.[0-9]+)?$/,

  // numerical 验证, 包括整数、浮点数、正、负数
  pNumerical: /^[0-9]+(\.[0-9]+)?$/,

  // integer 验证, 验证整数
  integer: /^[0-9]*$/,

  // pInteger 验证, 验证正整数
  pInteger: /^\d+$/,

  // nInterger 验证, 验证负整数及0
  nInterger: /^((-\d+)|(0+))$/,

  // mobile 验证, 验证手机号码
  mobile: /^1[34578]\d{9}$/,

  // telephone 验证,验证电话号码
  telephone: /^(\(\d{3,4}\)|\d{3,4}-|\s)?\d{7,14}$/,

  // idCard 验证,验证身份证号
  idCard: /^[1-9]\d{5}(18|19|([23]\d))\d{2}((0[1-9])|(10|11|12))(([0-2][1-9])|10|20|30|31)\d{3}[0-9Xx]$/,

  // email 验证,验证邮箱
  email: /\w[-\w.+]*@([A-Za-z0-9][-A-Za-z0-9]+\.)+[A-Za-z]{2,14}$/,

  // 百分数验证，数字在1-99之间，保留一位小数
  percente: /^(((\d|[1-9]\d)(\.\d{1,2})?)|100|100.0|100.00)$/
}

// 声明可用验证方法
let validate = {
  // 包含常用 pattern
  pattern,

  /*
   * 非空验证 正则验证
   * @param   paraming  : 验证非空
   * ex             : kindo.validate.isEmpty('http://192.168.0.254/1.json') => false
   */
  isEmpty: param => {
    return param === null || param === undefined || param === ''
  },

  /*
   * 长度 正则验证
   * @param   paraming  : 验证长度
   * ex             : kindo.validate.length('http://192.168.0.254/1.json', 30) => true
   */
  length: (param, length) => {
    return param.toString().length() <= length
  },

  /*
   * 长度 正则验证（1个双字节=3个单字节）
   * @param   paraming  : 验证长度
   * ex             : kindo.validate.lengthForByte('你好1',4) => false
   */
  lengthForByte: (param, length) => {
    // 1个中文字符占3个字节，其他字符占1个字节
    let len = param.toString().replace(/[^\x00-\xff]/g, 'aaa').length

    if (len > length) {
      return false
    } else {
      return true
    }
  },

  /*
   * 区间 正则验证
   * @param   paraming  : 验证长度
   * @iMin   paraming  : 最小值
   * @iMax   paraming  : 最大值
   * ex             : kindo.validate.range('36.5', 1, 100) => false
   */
  range: (param, iMin, iMax) => {
    let re = /(\d+)/g

    while (re.exec(param)) {
      let int = parseInt(RegExp.$1)
      if (int < iMin || int > iMax) {
        return false
      }

      return true
    }
  },

  /*
   * url 正则验证
   * @param   paraming  : 验证字符串
   * ex             : kindo.validate.url('http://192.168.0.254/1.json') => true
   */
  url: param => {
    return pattern.url.test(param)
  },

  /*
   * 数字 正则验证（正负整数）
   * @param   paraming  : 验证数字
   * ex             : kindo.validate.number(123) => true
   */
  number: param => {
    return pattern.number.test(param)
  },

  /*
   * 数值 正则验证（包括整数、浮点数、正、负数）
   * @param   paraming  : 验证数字
   * ex             : kindo.validate.number(123) => true
   */
  numerical: param => {
    return pattern.numerical.test(param)
  },

  /*
   * 数值 正则验证（包括整数、浮点数、正数）
   * @param   paraming  : 验证数字
   * ex             : kindo.validate.number(123) => true
   */
  pNumerical: param => {
    return pattern.pNumerical.test(param)
  },

  /*
   * 整数 正则验证
   * @param   paraming  : 验证整数
   * ex             : kindo.validate.integer(-123) => true
   */
  integer: param => {
    return pattern.integer.test(param)
  },

  /*
   * 正整数及0 正则验证
   * @param   paraming  : 验证正整数
   * ex             : kindo.validate.pInterger(123) => true
   */
  pInterger: param => {
    return pattern.pInteger.test(param)
  },

  /*
   * 负整数及0 正则验证
   * @param   paraming  : 验证负整数及0
   * ex             : kindo.validate.nInterger(-123) => true
   */
  nInterger: param => {
    return pattern.nInterger.test(param)
  },

  /*
   * 手机号码 正则验证
   * @param   paraming  : 验证手机号码
   * ex             : kindo.validate.mobile('13011111111') => true
   */
  mobile: param => {
    return pattern.mobile.test(param)
  },

  /*
   * 电话号码 正则验证
   * @param   paraming  : 验证电话号码
   * ex             : kindo.validate.telephone('13011111111') => true
   */
  telephone: param => {
    return pattern.telephone.test(param)
  },

  /*
   * 身份证 正则验证
   * @param   paraming  : 验证身份证
   * ex             : kindo.validate.idCard('400210188801011010') => true
   */
  idCard: param => {
    return pattern.idCard.test(param)
  },

  /*
   * 邮箱 正则验证
   * @param   paraming  : 验证邮箱
   * ex             : kindo.validate.email('aa@qq.com') => true
   */
  email: param => {
    return pattern.email.test(param)
  }
}

export default validate
