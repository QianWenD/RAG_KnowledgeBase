<template>
  <div class="kindo-table">
    <el-table ref="table" v-bind="$attrs" v-on="$listeners" v-loading="loading" element-loading-background="rgba(255, 255, 255, 0.5)" :height="internalHeight" :data="internalData" :border="internalBorder" :highlight-current-row="internalHighlightCurrentRow" :stripe="internalStripe" @sort-change="internalSortChange">
      <!-- 行号 -->
      <el-table-column v-if="pageIndex" :fixed="pageIndexFixed" label=" " type="index" align="center" width="50px" class-name="rowNumber">
        <template slot-scope="scope">
          <span v-text="(internalCurrentPage - 1) * internalPageSize + scope.$index + 1"></span>
        </template>
      </el-table-column>

      <slot></slot>
    </el-table>
    <el-pagination v-if="pagination" v-bind="$attrs" v-on="$listeners" :layout="internalLayout" :total="internalTotal" :current-page.sync="internalCurrentPage" :page-sizes="internalPageSizes" :page-size="internalPageSize" @size-change="_internalSizeChange" @current-change="_internalCurrentChange"></el-pagination>
  </div>
</template>

<script>
/* eslint-disable no-return-await */
/* eslint-disable no-unexpected-multiline */

import debounce from 'lodash/debounce'
import { getElementTop } from '@src/utils/helper/dom.js'

export default {
  name: 'kindo-talbe',

  mixins: [
    {
      watch: {
        internalData(val) {
          if (val.length === 0) {
            this.internalTotal = 0
          }
        }
      },
      methods: {
        trigger(method, ...args) {
          const { $refs: { table } } = this
          if (table && table[method]) {
            table[method](...args)
          }
        },

        toggleRowSelection(...args) {
          this.trigger('toggleRowSelection', ...args)
        },

        toggleRowExpansion(...args) {
          this.trigger('toggleRowExpansion', ...args)
        },

        setCurrentRow(...args) {
          this.trigger('setCurrentRow', ...args)
        },

        clearSort() {
          this.trigger('clearSort')
        },

        clearFilter() {
          this.trigger('clearFilter')
        },

        clearSelection(...args) {
          this.trigger('clearSelection', ...args)
        },

        setCurrentRowIndex(rowIndex) {
          this.setCurrentRow(this.internalData[rowIndex])
        },

        // 清空表格的数据
        clearTable() {
          this.internalData = []
        },
        // 对 Table 进行重新布局
        doLayout(table) {
          if (this.$refs[table] !== undefined) {
            this.$refs[table].doLayout()
          }
        }
      }
    }
  ],

  props: {
    // 属性扩展,
    extendOption: {
      type: Object,
      default: () => {
        return {
          serialNumber: false, // serialNumber主要是为了控制序号列是否是fixed的状态
          selectedFirst: false, // selectedFirst主要是为了在翻页的时候表格一直可以选中第一行
          autoLoading: false // 在设置默认排序的字段，以后控制表格不要自动加载，等到手工加载表格完毕以后，在加载
        }
      }
    },
    // 属性扩展, 是否分页
    pagination: { type: Boolean, default: true },
    // 属性扩展, 是否启用行号
    pageIndex: { type: Boolean, default: true },
    // 属性扩展, 行号情况下, 确定fixed模式
    pageIndexFixed: { type: String, default: 'left' },
    // 属性扩展, 从远程站点请求数据的 URL
    url: String,
    // 属性扩展, 当请求远程数据时，发送的额外参数
    queryParam: Object,
    // 属性扩展, 定义表格距离底部位置,
    bottom: { type: [String, Number], default: 30 },
    // step 1, 属性扩展, 当获取远程数据后, 返回要显示的过滤数据
    loadFilter: Function,
    // step 2, 属性扩展, 当获取远程数据后, 并且进行了 step 1, 定义如何加载数据
    loader: Function,
    // step 3, 属性扩展, 当获取远程数据后, 并且进行了 step 2, 定义加载完毕后如何操作
    loaded: Function
  },

  data() {
    return {
      // el-table 的 loading 展示
      loading: false,
      // 分页组件的高度
      paganationHeight: 35,
      // 横向进度条的高度
      barHeight: kindo.validate.isEmpty(this.$attrs.barHeight) ? 18 : this.$attrs.barHeight,
      // 每行的高度
      lineHieght: 30,
      // 表头的高度
      headerHeight: kindo.validate.isEmpty(this.$attrs.headerHeight) ? 32 : this.$attrs.headerHeight,
      // 重载 el-table的 props : data
      internalData: this.$attrs.data || [],
      // 重载 el-table的 props : border
      internalBorder: this.$attrs.border || true,
      // 重载 el-table的 props : highLightCurrentRow
      internalHighlightCurrentRow: this.$attrs.highLightCurrentRow || true,
      // 重载 el-table的 props : stripe
      internalStripe: this.$attrs.stripe || true,
      // 重载 el-table的 props : height
      internalHeight: this.$attrs.height,
      // 重载 el-table的 event : sortChange
      internalSortChange: this._internalSortChange || this.$listeners.sortChange,

      // 重载 el-pagination props : total, 组件内部或外部可能会使用
      internalTotal: this.$attrs.total || 0,
      // 重载 el-pagination props : currentPage, 组件内部或外部可能会使用
      internalCurrentPage: this.$attrs.currentPage || 1,
      // 重载 el-pagination props : pageSizes, 组件内部或外部可能会使用
      internalPageSizes: this.$attrs.pageSizes || [5, 10, 15, 20, 30, 50, 100],
      // 重载 el-pagination props : pageSize, 组件内部或外部可能会使用
      internalPageSize: this.$attrs.pageSize || 10,
      // 重载 el-pagination props : pageSize, 组件内部或外部可能会使用
      internalLayout: this.$attrs.layout || 'prev, pager, next, jumper, sizes, ->, total',

      // 自定义表格数据筛选方法
      internalLoadFilter: this.loadFilter || this._loadFilterFunc,
      // 高级用法, 自定义表格数据加载及展示方法(非特殊要求, 不做更改)
      internalLoader: this.loader || this._loaderFunc,
      // 高级用法, 定义加载完毕后如何操作(非特殊要求, 不做更改)
      internalLoaded: this.loaded || this._loadedFunc
    }
  },

  watch: {
    '$attrs.data'(val) {
      this.internalData = this.$attrs.data || []
    },
    '$attrs.height'(val) {
      this.internalHeight = this.$attrs.height
    }
  },

  mounted() {
    this.$nextTick(function () {
      window.addEventListener('resize', debounce(this.dynamicHeight, 300))
      if (!this.$attrs.height) {
        this.initTableHeight()
      }
    })
  },

  methods: {
    initTableHeight() {
      const offsetTop = getElementTop(this.$el)
      let windowHeight = window.innerHeight
      this.internalHeight = windowHeight - offsetTop - this.bottom - this.paganationHeight
      if (this.pagination) {
        if (!this.$attrs.pageSize && this.internalHeight >= 432) {
          // 432=12*30
          // 没有设置高度和pageSize
          if (windowHeight <= 768) {
            // 小于等于768
            this.internalPageSize = 10
          } else if (windowHeight > 768 && windowHeight < 947) {
            // 768-1050之间
            this.internalPageSize = 10
          } else {
            // 1050以上
            this.internalPageSize = 20
          }
        } else {
          if (!this.$attrs.pageSize) {
            this.internalPageSize = 10
          } else {
            this.internalHeight = this.$attrs.pageSize * this.lineHieght + this.headerHeight + this.barHeight - this.bottom
          }
        }
      } else {
        // 表格不分页时的高度计算
        if (this.$attrs.pageSizes) {
          // 如果设置有每页大小
          this.internalHeight = this.$attrs.pageSize * this.lineHieght + this.headerHeight + this.barHeight - this.bottom
        } else {
          // 没有设置页面大小时，当剩余高度不足以显示5条数据时，采用最小显示5条数据的表格高度，剩余高度足够则采用铺满剩余区域的高度。
          // 剩余页面计算高度
          let lastHeight = windowHeight - offsetTop - this.barHeight - this.bottom
          // 单页显示为5条时的表格高度
          let minHeight = 5 * this.lineHieght + this.headerHeight + this.barHeight
          this.internalHeight = lastHeight < minHeight ? minHeight : lastHeight
        }
      }
    },
    // 重新调整表格的高度，表格内部出现滚动条
    dynamicHeight(rows) {
      let tableRows = 0
      const offsetTop = getElementTop(this.$el)
      let windowHeight = window.innerHeight
      if (typeof rows === 'object') {
        tableRows = this.internalData.length === 0 ? 2 : this.internalData.length
      } else {
        tableRows = rows
      }
      if (!this.$attrs.height) {
        let tempHieght = tableRows * this.lineHieght + this.headerHeight + this.barHeight
        if (this.pagination) {
          // 如果有分页
          if (this.internalPageSize - tableRows > 1) {
            // 如果计算出来的高度
            this.internalHeight = tempHieght
          } else {
            this.internalHeight = this.internalPageSize * this.lineHieght + this.headerHeight + this.barHeight
          }
        } else {
          // 如果没有分页
          if (this.$attrs.pageSize) {
            // 如果设置有每页大小
            this.internalHeight = this.$attrs.pageSize * this.lineHieght + this.headerHeight + this.barHeight - this.bottom
          } else {
            // if (this.internalHeight > 76) {
            // this.internalHeight = 350
            // } else {
            // 没有设置页面大小时，当剩余高度不足以显示5条数据时，采用最小显示5条数据的表格高度，剩余高度足够则采用铺满剩余区域的高度。
            // 剩余页面计算高度
            let lastHeight = windowHeight - offsetTop - this.barHeight - this.bottom
            // 单页显示为5条时的表格高度
            let minHeight = 5 * this.lineHieght + this.headerHeight + this.barHeight
            this.internalHeight = lastHeight < minHeight ? minHeight : lastHeight
            // }
            // this.internalHeight = this.internalPageSize * this.lineHieght + this.headerHeight + this.barHeight - this.bottom
          }
        }
      }
    },

    _loadFilterFunc(res) {
      return res
    },

    _loaderFunc(res) {
      if (res.data) {
        this.internalData = res.data.rows || res.data
        this.internalTotal = res.data.total || 0
      }

      return res
    },

    _loadedFunc(res) {
      this.loading = false

      return res
    },

    _internalSizeChange(pageSize) {
      this.internalPageSize = pageSize
      this.loadData()
    },

    _internalCurrentChange(currentPage) {
      this.internalCurrentPage = currentPage
      this.loadData()
    },

    _internalSortChange(obj) {
      this.sort = obj.prop || undefined
      this.order = obj.order === 'ascending' ? 'asc' : obj.order === 'descending' ? 'desc' : undefined
      if (this.extendOption.autoLoading) {
        this.loadData()
      }
      if (this.sortChange) {
        this.sortChange.apply(this, arguments)
      }
    },

    /**
     * 向远程服务器请求数据
     */
    async load(url, queryParam, type) {
      if (!url) {
        throw new Error('尚未配置url, 无法获取远程服务器数据')
      }

      // 启动加载中提示
      this.loading = true

      // 组织请求参数
      const param = type === 'post' ? queryParam : { params: queryParam }

      // 返回请求结果
      return await this.$http[type](url, param).then(res => {
        if ((res.data && res.data.length > 0) || (res.data.rows && res.data.rows.length > 0)) {
          this.extendOption.autoLoading = true
          this.dynamicHeight(res.data.length || res.data.rows.length)
        } else {
          this.dynamicHeight(2)
        }
        return res
      }).then(this.internalLoadFilter)
        .then(this.internalLoader)
        .then(this.internalExtend)
        .then(this.internalLoaded)
        .catch(() => {
          this.internalData = []
          this.internalTotal = 0
          this.internalCurrentPage = 0
          this.loading = false
        })
    },

    internalExtend(res) {
      if (this.extendOption.selectedFirst) {
        this.setCurrentRow(this.internalData[0])
      }
      return res
    },

    /**
     * 重新加载数据, 保持在当前页
     */
    async loadData(config = {}) {
      const type = (this.type || 'get').toLocaleLowerCase()
      const url = config.url || this.url
      const queryParam = Object.assign(
        {},
        {
          sort: this.sort,
          order: this.order,
          page: this.pagination && this.internalCurrentPage,
          rows: this.pagination && this.internalPageSize
        },
        config.queryParam || this.queryParam
      )
      if (!this.pagination) {
        queryParam.page = 1
        queryParam.rows = undefined
      }
      return await this.load(url, queryParam, type)
    },

    /**
     * 重新加载数据, 保持在第一页
     */
    async reloadData(config = {}) {
      this.internalCurrentPage = 1
      return await this.loadData(config)
    }
  }
}
</script>

<style lang="scss">
#body {
  .kindo-table {
    .el-pagination {
      margin: 0;
      padding: 4px 8px 2px;
      border: 1px solid #f4f4f4;
      border-top: none;
    }

    .el-table--border {
      .rowNumber {
        .cell {
          padding: 0 2px;
        }
      }
    }
  }
}
</style>
