<template>
  <div class="context-menu" :style="style" v-show="show" @mousedown.stop @contextmenu.prevent>
    <slot></slot>
  </div>
</template>

<script>
export default {
  name: 'context-menu',
  data() {
    return {
      triggerShowFn: () => {},
      triggerHideFn: () => {},
      x: null,
      y: null,
      style: {}
    }
  },
  props: {
    target: null,
    show: Boolean
  },
  mounted() {
    this.bindEvents()
  },
  watch: {
    show(show) {
      if (show) {
        this.bindHideEvents()
      } else {
        this.unbindHideEvents()
      }
    },
    target(target) {
      this.bindEvents()
    }
  },
  methods: {
    // 初始化事件
    bindEvents() {
      this.$nextTick(() => {
        if (!this.target || this.target.length === 0) return

        this.triggerShowFn = this.contextMenuHandler.bind(this)

        if (this.target.length > 0) {
          for (var i = 0; i < this.target.length; i++) {
            this.target[i].addEventListener('contextmenu', this.triggerShowFn)
            this.target[i].binded = true
          }
        } else {
          this.target.addEventListener('contextmenu', this.triggerShowFn)
          this.binded = true
        }
      })
    },
    // 取消绑定事件
    unbindEvents() {
      if (!this.target) return
      this.target.removeEventListener('contextmenu', this.triggerShowFn)
    },
    // 绑定隐藏菜单事件
    bindHideEvents() {
      this.triggerHideFn = this.clickDocumentHandler.bind(this)
      document.addEventListener('mousedown', this.triggerHideFn)
      document.addEventListener('mousewheel', this.triggerHideFn)
    },
    // 取消绑定隐藏菜单事件
    unbindHideEvents() {
      document.removeEventListener('mousedown', this.triggerHideFn)
      document.removeEventListener('mousewheel', this.triggerHideFn)
    },
    // 鼠标按压事件处理器
    clickDocumentHandler(e) {
      this.$emit('update:show', false)
    },
    // 右键事件事件处理
    contextMenuHandler(e) {
      this.$emit('update:show', true)
      this.$emit('click', e)
      e.preventDefault()

      this.$nextTick(function() {
        this.x = e.clientX + this.$el.clientWidth > document.body.clientWidth ? e.clientX - this.$el.clientWidth : e.clientX
        this.y = e.clientY + this.$el.clientHeight > document.body.clientHeight ? e.clientY - this.$el.clientHeight : e.clientY
        this.layout()
      })
    },
    // 布局
    layout() {
      this.style = {
        left: this.x + 'px',
        top: this.y + 'px'
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.context-menu {
  position: fixed;
  background: #fff;
  border: 1px solid #eee;
  border-radius: 1px;
  box-shadow: 0 0.5em 1em 0 rgba(0, 0, 0, 0.1);
  z-index: 999;
  padding: 4px 0;
  min-width: 180px;

  a {
    text-decoration: none;
    height: 40px;
    line-height: 40px;
    padding: 2px 16px;
    cursor: pointer;
    text-align: left;
    display: block;
    color: #1a1a1a;
    transition: background 0.3s;

    &:hover {
      background: #cccccc;
      color: #1a1a1a;
    }

    &.disabled {
      pointer-events: none;
      color: #ccc;
    }

    i {
      min-width: 20px;
      text-align: center;
      margin-right: 4px;
    }
  }
}
</style>
