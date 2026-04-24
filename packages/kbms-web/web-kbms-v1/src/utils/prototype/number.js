/*
 * updated by pengzhen on 2017/6/21
 * peng_zhen@outlook.com
 * -------------------------------------------------
 * 扩展原型类:
 * 扩展原型常用方法
 *
 */

/* eslint-disable no-extend-native */

/**
 * 毫秒数转日期
 * @formatStr: 格式化参数, 默认yyyy-MM-dd HH:mm
 * ex:         1483943989639.toDate()  =>  Mon Jan 09 2017 14:39:49 GMT+0800 (中国标准时间)
 */
Number.prototype.toDate = function() {
  return new Date(this)
}
