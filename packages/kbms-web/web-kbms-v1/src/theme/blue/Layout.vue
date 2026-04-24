<template>
  <div>
    <el-container class="layout">
      <kindo-context-menu ref="context-menu" @click="currentTargetChange" :target="tabs.contextMenuTarget" :show="tabs.contextMenuVisible" @update:show="(show) => tabs.contextMenuVisible = show">
        <a @click="removeCurrentTab" :class="{ disabled: tabs.tabList.length <= 1 }">
          <i class="fa-times"></i>关闭标签页
        </a>
        <a @click="removeOtherTab" :class="{ disabled: tabs.tabList.length <= 1 }">
          <i class="fa-reply-all"></i>关闭其它标签页
        </a>
        <a @click="removeRightTab" :class="{ disabled: tabs.tabList.length <= 1 }">
          <i class="fa-arrow-right"></i>关闭右侧标签页
        </a>
      </kindo-context-menu>

      <header class="header">
        <img class="logo" src="./image/logo.png">
        <div class="collapse-btn" @click="isCollapse = !isCollapse"><i :class="{'fa-indent':isCollapse,'fa-outdent':!isCollapse}"></i></div>
        <div class="header-menu" v-if="kindo.config.HEADER_MENU_USE">
          <el-menu mode="horizontal" @select="menuClick">
            <el-menu-item v-for="item in menus" :key="item.id" :index="item.id" :router="item.id">
              <i :class="item.iconUrl" :title="item.name"></i>
              <span>{{ item.name }}</span>
            </el-menu-item>
          </el-menu>
        </div>
        <div class="header-right" :class="{'header-menu': !kindo.config.HEADER_MENU_USE}">
          <span class="info">{{kindo.cache.get(kindo.constant.USER_INFO).emplName || '管理员'}}</span>
          <!-- <i class="icon fa-user-o"></i> -->
          <!-- <i class="icon fa-comment-o"></i> -->
          <i class="icon fa-sign-out" @click="signOut" title="安全退出"></i>
        </div>
      </header>

      <div class="sidebar">
        <el-menu class="aside" @select="subMenuClick" :default-active="defaultActive" :collapse="isCollapse" background-color="#1C2B36" text-color="#7D8994" active-text-color="#FFF">
          <template v-for="item in subMenus">
            <!--只存在一级菜单-->
            <el-menu-item v-if="!item.children" :index="item.id" :router="item.id" :key="item.id" :path="item.routerPath">
              <i :class="item.iconUrl"></i>
              <span slot="title">{{ item.name || '' }} </span>
            </el-menu-item>

            <!--存在二级菜单 begin-->
            <el-submenu v-else :index="item.id" :router="item.id" :key="item.id">
              <template slot="title">
                <i :class="item.iconUrl"></i>
                <span>{{ item.name || '' }}</span>
              </template>

              <template v-for="itemi in item.children">

                <el-menu-item v-if="!itemi.children" :key="itemi.id" :index="itemi.id" :router="itemi.id" :path="itemi.routerPath">
                  <i :class="itemi.iconUrl"></i>
                  <span slot="title">{{ itemi.name || '' }} </span>
                </el-menu-item>

                <!--存在三级菜单 begin-->
                <el-submenu v-else :index="itemi.id" :router="itemi.id" :key="itemi.id">
                  <span slot="title">{{ itemi.name || '' }}</span>

                  <el-menu-item v-for="itemy in itemi.children" :key="itemy.id" :index="itemy.id" :router="itemy.id" :path="itemy.routerPath">
                    <i :class="itemy.iconUrl"></i>
                    <span slot="title">{{ itemy.name || '' }}</span>
                  </el-menu-item>
                </el-submenu>
                <!--存在三级菜单 end-->
              </template>

            </el-submenu>
            <!--存在二级菜单 end-->
          </template>
        </el-menu>
      </div>

      <div class="content-box" :class="{'content-collapse':isCollapse}">
        <div class="tabs">
          <el-tabs class="menus_tabs" ref="tab" id="maintabs" v-model="activeTab" type="card" @tab-remove="removeTab">
            <el-tab-pane v-for="tab in tabs.tabList" :closable="tabs.tabList.length > 1" :key="tab.id" :name="tab.id">
              <!-- <router-link :to="{name: item.name}"> -->
              <span slot="label">
                <i :class="tab.icon" style="margin-right: 8px;"></i>
                <span v-text="tab.name"></span>
              </span>
              <!-- </router-link> -->
            </el-tab-pane>
          </el-tabs>
        </div>
        <div class="content">
          <transition name="el-fade-in-linear" mode="out-in">
            <keep-alive :include="tabs.tabList.map(item => item.enName)">
              <router-view>
              </router-view>
            </keep-alive>
          </transition>
        </div>
      </div>
    </el-container>
  </div>
</template>

<script>
import KindoContextMenu from '@src/packages/KindoContextMenu.vue'
import { setTimeout } from 'timers'

// key值: 缓存已添加的标签页到 session
const LAYOUT_TABLIST = 'LAYOUT_TABLIST'

export default {
  name: '',

  components: {
    'kindo-context-menu': KindoContextMenu
  },

  data() {
    return {
      menuList: [],
      // 顶部菜单栏
      menus: [],
      // 侧边菜单栏
      subMenus: [],
      defaultActive: '',

      tabs: {
        contextMenuTarget: null,
        contextMenuVisible: false,
        currentTargetIndex: '',
        tabList: []
      },
      activeTab: 'home',
      isCollapse: false
    }
  },

  watch: {
    'activeTab'(val) {
      let getRootParentId = id => {
        let temp = this.menuList.find(item => item.id === id)
        if (temp.pid && temp.pid !== '0') {
          getRootParentId(temp.pid)
        } else {
          this.$router.push(`/${temp.id}/${val}`)
        }
      }
      getRootParentId(val)
    },

    'tabs.tabList'() {
      setTimeout(() => {
        // this.$nextTick(function () {
        this.tabs.contextMenuTarget = document.body.querySelectorAll('.tabs .el-tabs__item')
        // })
      }, 200)

      kindo.cache.set(LAYOUT_TABLIST, this.tabs.tabList, 'session')
    },

    $route(newValue, oldValue) {
      this.refreshApp(newValue)
    }
  },

  created() {
    this.tabs.tabList = kindo.cache.get(LAYOUT_TABLIST) || []
    this.menuList = kindo.cache.get(kindo.constant.USER_MENU)

    // 是否启用顶部菜单栏
    if (kindo.config.HEADER_MENU_USE) {
      this.menus = kindo.cache.get(kindo.constant.USER_MENUTREE)
    } else {
      this.subMenus = kindo.cache.get(kindo.constant.USER_MENUTREE)
    }

    kindo.globalBus.$on('closeCurrentTab', v => {
      this.removeCurrentTab(v)
    })
    this.$nextTick(function () {
      this.refreshApp()
    })
  },
  mounted() {
    if (document.body.clientWidth < 1500) {
      this.isCollapse = true
    }
  },

  methods: {
    /**
   * 还原路由
   * 1. 根据当前 route path, 模拟菜单点击事件
   */
    refreshApp() {
      const routeArray = this.$route.path.split('/')
      const subRoute = routeArray[2]
      let rootRoute
      if (routeArray[1] === 'layout') {
        rootRoute = kindo.config.HEADER_MENU_USE ? this.menus[0].id : this.subMenus[0].id
      } else {
        rootRoute = routeArray[1]
      }
      if (kindo.config.HEADER_MENU_USE) {
        // 若采用顶部菜单，默认选中顶部菜单后再选中左侧菜单
        if (document.body.querySelector(`[router='${rootRoute}']`)) {
          document.body.querySelector(`[router='${rootRoute}']`).click()
          this.$nextTick().then(() => {
            this.asideClick(subRoute)
          })
        }
      } else {
        this.asideClick(subRoute)
      }
    },

    // 侧边栏菜单选中
    asideClick(route) {
      if (route) {
        this.defaultActive = route
        if (document.body.querySelector(`[router='${route}']`)) {
          document.body.querySelector(`[router='${route}']`).click()
        }
      } else {
        if (document.body.querySelector('.aside .el-menu-item')) {
          document.body.querySelector('.aside .el-menu-item').click()
        }
      }
    },

    /**
     * 上级菜单点击
     * 1. 记录该菜单id (即 route path)
     * 2. 获取该菜单子集
     * 3. 根据当前 route path, 模拟菜单点击事件
     */
    menuClick(id) {
      this.subMenus = this.menus.filter(item => item.id === id)[0].children

      this.$nextTick(() => {
        const subRoute = this.$route.path.split('/')[2]

        this.$nextTick(() => {
          if (subRoute && document.body.querySelector(`[router='${subRoute}']`)) {
            document.body.querySelector(`[router='${subRoute}']`).click()
          } else {
            if (document.body.querySelector('.aside .el-menu-item')) {
              document.body.querySelector('.aside .el-menu-item').click()
            }
          }
        })
      })
    },

    // 侧边栏菜单项目点击
    subMenuClick(id) {
      let currentIndex = this.tabs.tabList.findIndex(tab => tab.id === id)
      if (currentIndex === -1) {
        let menuInfo = this.menuList.find(item => item.id === id)
        if (this.tabs.tabList.length >= 12) {
          kindo.util.alert('最多新增12个标签', '提示', 'warning')
        } else {
          this.tabs.tabList.push({
            id: menuInfo.id,
            name: menuInfo.name,
            enName: menuInfo.enName,
            icon: menuInfo.iconUrl
          })
          this.activeTab = id
        }
      } else {
        this.activeTab = id
      }
    },

    removeTab(target) {
      let currentIndex = this.tabs.tabList.findIndex(item => item.id === target)
      if (currentIndex !== -1) {
        this.tabs.tabList = this.tabs.tabList.filter(tab => tab.id !== target)

        if (this.activeTab === target) {
          if (currentIndex === 0) {
            currentIndex = 1
          }

          this.$el.querySelectorAll(`[router="${this.tabs.tabList[currentIndex - 1].id}"]`)[0] &&
            this.$el.querySelectorAll(`[router="${this.tabs.tabList[currentIndex - 1].id}"]`)[0].click()
        }
      }
    },

    currentTargetChange(e) {
      const node = e.currentTarget
      const id = node.id.replace('tab-', '')

      this.tabs.currentTargetIndex = this.tabs.tabList.findIndex(item => item.id === id)
    },

    removeCurrentTab(v) {
      const tab = kindo.validate.isEmpty(v.index) ? this.tabs.tabList[this.tabs.currentTargetIndex] : this.tabs.tabList[v.index]
      this.tabs.tabList = this.tabs.tabList.filter(item => item.id !== tab.id)
      if (v.goHome) {
        this.$router.push('/')
      } else {
        this.activeTab = this.tabs.tabList[this.tabs.tabList.length - 1].id
      }
      this.tabs.contextMenuVisible = false
    },

    removeOtherTab() {
      this.tabs.tabList = this.tabs.tabList.filter(item => item.id === this.$router.history.current.name)
      this.activeTab = this.$router.history.current.name
      this.tabs.contextMenuVisible = false
    },

    removeRightTab() {
      const currentTagIndex = this.tabs.tabList.findIndex(item => item.id === this.$router.history.current.name)
      this.tabs.tabList = this.tabs.tabList.slice(0, currentTagIndex + 1)
      this.activeTab = this.$router.history.current.name

      this.tabs.contextMenuVisible = false
    },

    signOut() {
      kindo.cache.remove(kindo.constant.USER_TOKEN)
      kindo.cache.remove(kindo.constant.USER_INFO)
      kindo.cache.remove(kindo.constant.USER_MENU)
      kindo.cache.remove(kindo.constant.USER_MENUTREE)
      kindo.cache.remove(LAYOUT_TABLIST, this.tabs.tabList, 'session')
      kindo.cache.remove(LAYOUT_TABLIST)
      window.location.hash = ''
      window.location.reload()
    }
  }
}
</script>

<style lang="scss" scoped>
$headerHeight: 55px;

.layout {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  width: 100%;
  height: 100%;

  .header {
    position: relative;
    display: flex;
    align-items: center;
    width: 100%;
    height: $headerHeight;
    background: #373d41;
    padding: 0 20px;
    color: #fff;
    font-size: 17px;

    .logo {
      float: left;
      line-height: $headerHeight;
    }

    .collapse-btn {
      float: left;
      padding: 0 20px;
      font-size: 26px;
      line-height: $headerHeight;
      cursor: pointer;
    }

    .header-menu {
      flex: 1;
    }

    .header-right {
      text-align: right;
      height: $headerHeight;
      line-height: $headerHeight;

      .icon,
      .info {
        padding: 4px;
        margin-right: 8px;
        cursor: pointer;
      }
    }
  }

  .sidebar {
    position: absolute;
    left: 0;
    top: $headerHeight;
    bottom: 0;
    overflow: auto;
    .aside {
      height: 100%;
      /deep/ .el-submenu .el-submenu__title i {
        color: #7d8994;
        font-size: 15px;
      }
    }
    .aside:not(.el-menu--collapse) {
      width: 250px;
    }
  }

  .content-box {
    position: absolute;
    left: 250px;
    right: 0;
    top: $headerHeight;
    bottom: 0;
    transition: left 0.3s ease-in-out;
    background-color: #e6edf5;
    .tabs {
      position: relative;
      height: 50px;
      overflow: hidden;
      background: #fff;
      /deep/ .el-tabs {
        box-sizing: border-box;
        margin: 0;
        padding: 8px;
        width: 100%;
        height: 100%;
        .el-tabs__header {
          margin: 0;
          border: none;
          .el-tabs__nav {
            border: none;
          }
          .el-tabs__item {
            background-color: #deeeff;
            height: 34px;
            line-height: 34px;
            border: none;
            &:hover {
              background-color: #3d9bf7;
              color: #fff;
            }
            &.is-active {
              background-color: #4a9df3;
              color: #fff;
            }
            .el-icon-close {
              font-size: 16px;
              color: #fff;
            }
          }
        }
      }
    }
    .content {
      width: auto;
      box-sizing: border-box;
      height: calc(100% - 50px);
      overflow: auto;
      padding: 0;
    }
  }
  .content-collapse {
    left: 65px;
  }
}
</style>
