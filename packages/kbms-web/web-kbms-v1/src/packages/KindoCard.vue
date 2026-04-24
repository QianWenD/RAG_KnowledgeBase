<template>
  <div class="kindo-card" :class="{ fullPage: internalFullPage }">
    <div class="header" v-if="$slots.header || $slots.extra">
      <div class="wrapper">
        <!-- 卡片标题 -->
        <div class="title">
          <slot name="header"></slot>
        </div>

        <!-- 卡片功能控制区域 -->
        <div class="extra">
          <slot name="control"></slot>
          <el-button v-if="$listeners.reload" icon="el-icon-refresh" circle @click="handleReload" title="重新加载"></el-button>
          <el-button v-if="internalFullPage" icon="el-icon-rank" circle @click="toggleFullPage" title="全屏展示"></el-button>
          <el-button v-if="internalCollapse" :icon="internalCollapse ? 'el-icon-arrow-down' : 'el-icon-arrow-up'" circle @click="toggleCollapse" title="收缩展开"></el-button>
        </div>
      </div>
    </div>

    <transition name="el-fade-in-linear">
      <div class="body" v-show="internalIsCollapse">
        <slot></slot>
      </div>
    </transition>

    <div class="footer" v-if="$slots.footer">
      <slot name="footer"></slot>
    </div>
  </div>
</template>

<script>
export default {
  name: 'KindoCard',

  props: {
    // 是否显示全屏操作按钮
    fullPage: {
      type: Boolean,
      default() {
        return false
      }
    },

    // 是否显示展开操作按钮
    collapse: {
      type: Boolean,
      default() {
        return false
      }
    }
  },

  data() {
    return {
      internalFullPage: this.fullPage,
      internalCollapse: this.collapse,

      // 是否展开状态
      internalIsCollapse: true
    }
  },

  created() {},

  methods: {
    toggleCollapse() {
      this.internalIsCollapse = !this.internalIsCollapse
    },

    toggleFullPage() {
      if (this.internalFullPage) {
        document.body.style.overflow = 'auto'
      } else {
        document.body.style.overflow = 'hidden'
      }

      this.internalFullPage = !this.internalFullPage
    },

    handleReload(e) {
      this.$emit('reload', e)
    }
  }
}
</script>

<style lang="scss" scoped>
.kindo-card {
  line-height: 1.5;
  color: rgba(0, 0, 0, 0.65);
  box-sizing: border-box;
  margin: 0 0 4px 0;
  padding: 0;
  list-style: none;
  background: #fff;
  border-radius: 2px;
  position: relative;
  box-shadow: 0 0 8px 0 rgba(232, 237, 250, 0.5), 0 2px 4px 0 rgba(232, 237, 250, 0.4);

  &:hover {
  }

  &.fullPage {
    position: fixed;
    left: 0;
    top: 0;
    z-index: 2 !important;
    width: 100%;
    height: 100%;
  }

  .header {
    background: #fff;
    border-bottom: 1px solid #e8e8e8;
    padding: 0 24px;
    border-radius: 2px 2px 0 0;
    zoom: 1;
    margin-bottom: -1px;

    .wrapper {
      min-height: 48px;
      display: flex;
      justify-content: center;
      align-items: center;

      .title {
        font-size: 16px;
        text-overflow: ellipsis;
        overflow: hidden;
        white-space: nowrap;
        color: rgba(0, 0, 0, 0.85);
        font-weight: 500;
        display: inline-block;
        flex: 1 1 0%;
      }

      .extra {
        .el-button.is-circle {
          margin-left: 10px;
          padding: 6px;
        }
      }
    }
  }

  .body {
    padding: 10px;
    zoom: 1;
  }

  .footer {
    padding: 10px;
    zoom: 1;
  }
}
</style>
