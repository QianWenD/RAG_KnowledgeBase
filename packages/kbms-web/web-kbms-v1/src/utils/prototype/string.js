/*
 * updated by pengzhen on 2017/6/21
 * peng_zhen@outlook.com
 * -------------------------------------------------
 * 扩展原型类:
 * 扩展原型常用方法
 *
 */

/* eslint-disable no-extend-native */

/*
 * RESTful uri 格式化
 * ex:  '{msg} world'.restfulFormat({ msg: 'hello' }) => hello world
 */
String.prototype.restfulFormat = function(replacements) {
  var format = function(str, replacements) {
    replacements = typeof replacements === 'object' ? replacements : Array.prototype.slice.call(arguments, 1)
    return str.replace(/\{\{|\}\}|\{(\w+)\}/g, function(m, n) {
      if (m === '{{') {
        return '{'
      }
      if (m === '}}') {
        return '}'
      }
      return replacements[n]
    })
  }
  replacements = typeof replacements === 'object' ? replacements : Array.prototype.slice.call(arguments, 0)
  return format(this, replacements)
}

/*
 * 字符串格式化
 * ex:  '{0} world {1}'.format('hello','!!!!') => hello world !!!!
 */
String.prototype.format = function() {
  let str = this
  for (let i = 0; i < arguments.length; i++) {
    let exp = new RegExp('\\{' + i + '\\}', 'gm')

    str = str.replace(exp, arguments[i])
  }
  return str
}

/*
 * 获取字节长度
 * ex: '你好,world'.byteLength() => 10
 */
String.prototype.byteLength = function() {
  let byteLength = 0
  let l = this.length
  if (l) {
    for (let i = 0; i < l; i++) {
      if (this.charCodeAt(i) > 255) {
        byteLength += 2
      } else {
        byteLength++
      }
    }
    return byteLength
  } else {
    return 0
  }
}

/**
 * 字符串格式日期转 Date
 * ex: '2016-01-01 02:00'.toDate().formatDate() =>  "2016-01-01"
 */
String.prototype.toDate = function() {
  if (this instanceof Date) {
    return this
  }

  var date = this.toString()

  var a = date.split(' ')
  var b = a[0].split('-') || a[0].split('/')
  var c = a.length > 1 ? a[1].split(':') : ''

  return new Date(Date.UTC(b[0] || 0, (b[1] || 1) - 1, b[2] || 1, (c[0] || 8) - 8, c[1] || 0, c[2] || 0))
}

/**
 * 字符串格式转化为制定格式的数字
 * ex: '211'.toFixed(2)转化为211.00
 */
String.prototype.toFixed = function(parse) {
  if (parseFloat(this)) {
    return parseFloat(this).toFixed(parse)
  } else {
    let start = '0.'
    let qq = 0
    while (qq < parse) {
      start += '0'
      qq++
    }
    return start
  }
}

/**
 * 字符串格式转化为制定格式的数字
 * ex: '211'.toFixed(2)转化为211.00
 */
String.prototype.startWith = function(s) {
  if (s === null || s === '' || this.length === 0 || s.length > this.length) {
    return false
  }
  if (this.substr(0, s.length) === s) {
    return true
  } else {
    return false
  }
}
