/*
 * update by pengzhen on 2018/4/18
 * peng_zhen@outlookindo.com
 * -------------------------------------------------
 * 扩展input focus
 */

import Vue from 'vue'

Vue.directive('focus', {
  // 当被绑定的元素插入到 DOM 中时……
  inserted: function(el) {
    // 聚焦元素
    el.focus()
  }
})
