/*
 * updated by pengzhen on 2018/03/30
 * peng_zhen@outlook.com
 * -------------------------------------------------
 * 1.使用异步组件, 优先加载 app.setting 配置文件
 * 2.挂载配置到全局 kindo
 * 3.挂载App组件
 */

// The Vue build version to load with the `import` command
// (runtime-only or standalone) has been set in webpack.base.conf with an alias.
import Vue from 'vue'
import router from './router'
import axios from 'axios'
import VuePreview from 'vue-preview'
Vue.use(VuePreview, {
  mainClass: 'pswp--minimal--dark',
  barsSize: { top: 0, bottom: 0 },
  captionEl: false,
  fullscreenEl: false,
  shareEl: false,
  bgOpacity: 0.85,
  tapToClose: true,
  tapToToggleControls: false
})

// 获取程序配置信息
const getAppSetting = () => {
  return axios.get('./static/config/app.setting.json').then(response => {
    global.kindo = global.kindo || response.data
    Vue.prototype.kindo = global.kindo || {}
  })
}

// 挂载App组件
const initApp = () => {
  /* eslint-disable no-new */
  new Vue({
    el: '#app',
    router,
    components: { App: resolve => require([`@src/theme/${kindo.config.SYSTEM_THEME}/App.vue`], resolve) },
    template: '<App/>'
  })
}

Vue.config.productionTip = false

getAppSetting().then(initApp())
