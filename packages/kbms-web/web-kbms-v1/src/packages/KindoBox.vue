<template>
  <div class="kindo-box">
    <!-- title 区域 -->
    <div v-if="title" class="title">
      <div class="label">
        <i v-if="icon" :class="icon"></i>
        <span v-html="title"></span>
      </div>
      <!-- 更多区域-控制 -->
      <div v-if="!expand" class="more-control">
        <el-button plain @click="toggleExpaned" v-show="isMore" type="text">
          <i :class="isExpanded ? 'el-icon-caret-top' : 'el-icon-caret-bottom'"></i>
          <span v-text="isExpanded ? '收起筛选' : '高级筛选'"></span>
        </el-button>
      </div>

      <!-- 主要区域-控制 -->
      <div class="mian-control">
        <slot name="control"> </slot>
      </div>
    </div>

    <!-- 主要区域 -->
    <el-collapse-transition>
      <div class="main" id="searchMain">
        <slot></slot>
      </div>
    </el-collapse-transition>

  </div>
</template>

<script>
import debounce from 'lodash/debounce'

export default {
  name: 'kindo-box',
  props: {
    title: {
      type: String
    },

    expand: {
      type: Boolean,
      default() {
        return false
      }
    },

    icon: {
      type: String,
      default() {
        return 'fa-bar-chart'
      }
    },

    filter: {
      type: Boolean,
      default() {
        return true
      }
    }
  },

  data() {
    return {
      isMore: false,
      isExpanded: false,
      height: null,
      minFormHeight: 50,
      maxFormHeight: 76
    }
  },

  created() { },

  mounted() {
    this.$nextTick(function () {
      if (!this.expand) {
        window.addEventListener('resize', debounce(this.resizeExpaned, 300))

        this.resizeExpaned({ init: true })
      }
    })
  },
  methods: {
    /**
     * 伸缩高级筛选
     */
    toggleExpaned() {
      if (this.isExpanded) {
        this.$el.querySelector('.main').style.height = this.minFormHeight + 'px'
      } else {
        this.$el.querySelector('.main').style.height = this.height + 'px'
      }
      this.isExpanded = !this.isExpanded
    },

    /**
     * 初始化 form 高度
     */
    resizeExpaned({ init = false }) {
      // slots 第一个组件是 el-form, 才进行高级筛选的控制
      if (
        this.$slots &&
        this.$slots.default &&
        this.$slots.default[0].componentOptions &&
        this.$slots.default[0].componentOptions.tag === 'el-form' &&
        this.filter
      ) {
        if (init) {
          this.$el.querySelector('.main').style.transition = 'null'
          this.height = this.$el.querySelector('.main').clientHeight
          this.isMore = this.height > this.maxFormHeight
          this.$nextTick(() => {
            this.$el.querySelector('.main').style.height = this.minFormHeight + 'px'
            this.isExpanded = false
          })
        } else {
          this.$el.querySelector('.main').style.transition = 'null'
          this.$el.querySelector('.main').style.height = '100%'
          this.$nextTick(() => {
            this.height = this.$el.querySelector('.main').clientHeight
            this.isMore = this.height > this.maxFormHeight

            if (this.isExpanded) {
              this.$el.querySelector('.main').style.height = this.height + 'px'
            } else {
              this.$el.querySelector('.main').style.height = this.minFormHeight + 'px'
            }
          })
        }
      }

      // 避免添加css动画之后, 影响表格的自适应, 在下一个堆栈中, 添加动画
      setTimeout(() => {
        this.$el.querySelector('.main').style.transition = 'all 0.3s'
      }, 0)
    }
  }
}
</script>

<style lang="scss" scoped>
#searchMain /deep/ .el-form .el-form-item--mini.el-form-item {
  margin-bottom: 14px;
}
</style>
