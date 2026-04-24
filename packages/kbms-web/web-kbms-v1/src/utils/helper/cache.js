/*
 * update by pengzhen on 2016/12/7
 * peng_zhen@outlookindo.com
 * -------------------------------------------------
 * 缓存类:
 * 扩展 sessionStorage, localStorage
 * -------------------------------------------------
 * 使用方法:
 * 赋值 : kindo.cache.set(key, value, type)
 * 取值 : kindo.cache.get(key, type)
 *
 */

import { decode, encode } from './base64.js'

if (!window.btoa) {
  window.btoa = encode
}
if (!window.atob) {
  window.atob = decode
}

let cache = {
  /**
   * 缓存赋值方法
   * @key   string  :  唯一键
   * @value any     :  对应 key 的 value
   * @type  string  :  session | local | internal
   * ex: kindo.cache.set('key', { 'key': 'testKey' }, 'session')
   */
  set: (key, value, type) => {
    switch (type) {
      case 'session':
      case 'local':
        if (value !== null && value !== undefined) {
          value = window.btoa(window.unescape(window.encodeURIComponent(JSON.stringify(value))))
        }
        window[type + 'Storage'].setItem(window.btoa(key), value)
        break
      default:
        kindo.cache[window.btoa(key)] = value
        break
    }

    return true
  },

  /**
   * 缓存取值方法
   * @key   string  :  唯一键
   * @type  string  :  session | local | internal
   * @return value
   * ex: kindo.cache.get('key', 'session')  =>  { 'key': 'testKey' }
   */
  get: (key, type) => {
    switch (type) {
      case 'session':
        return (
          window.sessionStorage.getItem(window.btoa(key)) &&
          JSON.parse(window.decodeURIComponent(window.escape(window.atob(window.sessionStorage.getItem(window.btoa(key))))))
        )
      case 'local':
        return (
          window.localStorage.getItem(window.btoa(key)) &&
          JSON.parse(window.decodeURIComponent(window.escape(window.atob(window.localStorage.getItem(window.btoa(key))))))
        )
      default:
        if (kindo.cache.hasOwnProperty(window.btoa(key))) {
          return kindo.cache[window.btoa(key)]
        } else if (window.sessionStorage.getItem(window.btoa(key)) !== null) {
          return JSON.parse(window.decodeURIComponent(window.escape(window.atob(window.sessionStorage.getItem(window.btoa(key))))))
        } else if (window.localStorage.getItem(window.btoa(key)) !== null) {
          return JSON.parse(window.decodeURIComponent(window.escape(window.atob(window.localStorage.getItem(window.btoa(key))))))
        }
        break
    }

    return null
  },

  /**
   * 删除缓存key
   * @key   string  :  唯一键
   * @type  string  :  session | local | internal
   * @return value
   * ex: kindo.cache.remove('key', 'session') =>  true
   */
  remove: (key, type) => {
    switch (type) {
      case 'session':
        window.sessionStorage.removeItem(window.btoa(key))
        break
      case 'local':
        window.localStorage.removeItem(window.btoa(key))
        break
      default:
        if (kindo.cache.hasOwnProperty(window.btoa(key))) {
          delete kindo.cache[window.btoa(key)]
        } else if (window.sessionStorage.getItem(window.btoa(key)) !== null) {
          window.sessionStorage.removeItem(window.btoa(key))
        } else if (window.localStorage.getItem(window.btoa(key)) !== null) {
          window.localStorage.removeItem(window.btoa(key))
        }
        break
    }
    return true
  }
}

export default cache
