<template>
  <div class="app">
    <transition name="el-zoom-in-top" mode="out-in">
      <router-view></router-view>
    </transition>
  </div>
</template>

<script>
import Vue from 'vue'

// 加载底层依赖
import '@src/utils/index.js'

// 加载全局样式
import '@src/assets/css/global.css'

// 加载指令
import '@src/directive/index.js'

// 加载 ui
import elementUI from 'element-ui'
import elTreeGrid from 'element-tree-grid'
import './css/element.theme.scss'
import './css/element.fix.scss'
// import './css/element-variables.scss'

// 加载组件库
import KindoBox from '@src/packages/KindoBox.vue'
import KindoCard from '@src/packages/KindoCard.vue'
import KindoTable from '@src/packages/KindoTable.vue'
import KindoEchart from '@src/packages/KindoEchart.vue'

Vue.use(elementUI, { size: kindo.config.ELEMENT_SIZE })
Vue.component(elTreeGrid.name, elTreeGrid)
Vue.component('kindo-box', KindoBox)
Vue.component('kindo-card', KindoCard)
Vue.component('kindo-table', KindoTable)
Vue.component('kindo-echart', KindoEchart)

export default {
  name: 'App',

  data() {
    return {
      fullscreenLoading: false
    }
  },

  created() {
    // 修改系统标题
    document.title = kindo.config.SYSTEM_TITLE2

    // 初始化 app, 添加 global bus
    this.createGlobalBus()

    // 初始化 app, 配置权限路由
    this.createAuthRouter()
  },

  methods: {
    async createAuthRouter() {
      // 验证是否登录
      if (!kindo.cache.get(kindo.constant.USER_TOKEN)) {
        this.$router.push('/login')
      } else {
        // 获取权限信息
        const menus = await this.setAuthInfo()

        // 配置权限路由
        this.setAuthRouter(menus)

        // 跳转首页
        if (this.$route.fullPath === '/') {
          this.$router.push('/layout')
        }
      }
    },

    setAuthInfo() {
      return this.$http.get(kindo.api.upms + 'user/login/menus').then(res => res.data)
    },

    setAuthRouter(menus) {
      // 是否显示过滤 start
      let removeMenu = (pidd) => {
        for (let i = 0, len = menus.length; i < len; i++) {
          if (menus[i]) {
            if (menus[i].show === '0' || menus[i].pid === pidd) {
              let id = menus[i].id
              delete menus[i]
              removeMenu(id)
            }
          }
        }
      }
      removeMenu()
      menus = menus.filter(menu => menu.id !== '0' && menu !== 'undefined')
      // 是否显示过滤 end

      const menuList = menus.sort((a, b) => parseInt(a.sort) - parseInt(b.sort))
      kindo.cache.set(kindo.constant.USER_MENU, menuList, 'session')

      const menusTree = kindo.util.toTree(menuList, 'id', 'pid')
      kindo.cache.set(kindo.constant.USER_MENUTREE, menusTree, 'session')

      const router = []
      if (menusTree && menusTree.length > 0) {
        menusTree.forEach(menu => {
          router.push({
            meta: { path: menu.routerPath },
            name: menu.id,
            path: `/${menu.id}`,
            component: resolve => require([`@src/theme/${kindo.config.SYSTEM_THEME}/Layout.vue`], resolve),
            children: this.setAuthChildrenRouter(menu.children)
          })
        })
      }

      router.push({
        name: 'noAuthority',
        path: '/noAuthority',
        component: resolve => require([`@src/packages/NoAuthority.vue`], resolve)
      })

      router.push({
        name: 'notFound',
        path: '*',
        component: resolve => require([`@src/packages/NotFound.vue`], resolve)
      })

      this.$router.addRoutes(router)
    },

    setAuthChildrenRouter(menusTree, routerChildren = []) {
      if (menusTree && menusTree.length > 0) {
        menusTree.forEach(menu => {
          if (menu.children && menu.children.length > 0) {
            this.setAuthChildrenRouter(menu.children, routerChildren)
          } else {
            routerChildren.push({
              meta: { path: menu.routerPath },
              name: `${menu.id}`,
              path: `${menu.id}`,
              component: resolve =>
                require([`@src/${menu.routerPath}/${menu.enName}.vue`], resolve, reject => {
                  console.error(reject)

                  kindo.util.alert('组件加载出错, 请联系管理员', undefined, 'warning')
                  return require('@src/packages/NotFound.vue')
                })
            })
          }
        })
      }
      return routerChildren
    },

    createGlobalBus() {
      kindo.globalBus = kindo.globalBus || this

      this.createBusNotify()
      this.createBusMessage()
      this.createBusConfirm()
      this.createBusLoading()
    },

    createBusNotify() {
      this.$on('notify', (message = '提示', title = '提示', type = 'info') => {
        this.$notify({
          showClose: true,
          title: title,
          message: message,
          type: type
        })
      })
    },

    createBusMessage() {
      this.$on('message', (message = '提示', title = '提示', type = 'info') => {
        this.$message({
          showClose: true,
          title: title,
          message: message,
          type: type
        })
      })
    },

    createBusConfirm() {
      this.$on('confirm', (message = '提示', title = '提示', type = 'info', successCallBack, errorCallBack) => {
        this.$confirm(message, title, {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          confirmButtonClass: 'confirmButton',
          cancelButtonClass: 'cancelButton',
          type: type
        })
          .then(successCallBack)
          .catch(errorCallBack)
      })
    },

    createBusLoading() {
      let requestCount = 0
      this.$on('loading', (status, request) => {
        if (status) {
          requestCount += 1

          if (requestCount > 0) {
            this.fullscreenLoading = status
            // this.$refs.progress.start()
          }
        } else {
          requestCount -= 1

          if (requestCount <= 0) {
            requestCount = 0
            this.fullscreenLoading = status

            if (!request.status || (request.status && request.status !== 200)) {
              // this.$refs.progress.fail()
            } else {
              // this.$refs.progress.done()
            }
          }
        }
      })
    }
  }
}
</script>

<style scoped>
* {
  box-sizing: border-box;
}
.app {
  height: 100%;
}

.loading {
  position: fixed;
  top: 20px;
  right: 10px;
  z-index: 10;
  color: #409eff;
  font-size: 16px;
}
</style>
