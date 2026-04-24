/*
 * update by wuhuihiu on 2017/11/01
 * -------------------------------------------------
 * 扩展根据按钮权限是否显示按钮
 *    使用方式： <el-button v-disabled="'search'">查询</el-button>
 *    v-disabled绑定的值为数据字典中定义的按钮类型，例如： search、 edit、 add等。
 *    当此用户有当面页面的这类按钮权限时，才显示按钮，否则隐藏按钮。
 */
import Vue from 'vue'

Vue.directive('disabled', {
  bind: function(el, binding) {}
})
