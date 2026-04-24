/* @Author: caim
*菜单：知识库-临床操作日志-模块操作日志
 */
<template>
  <div>
    <kindo-box title="查询条件" icon="xx">
      <el-form :model="search" onsubmit="return false;" label-position="right" inline @keyup.enter.prevent.native="get('table')">
        <el-form-item label="模块名称">
          <el-input v-model.trim="search.module" placeholder="" clearable></el-input>
        </el-form-item>
        <el-form-item>
          <el-date-picker v-model="search.startTime" type="datetime" placeholder="选择起始日期" :picker-options="start_Date" format="yyyy-MM-dd" value-format="yyyy-MM-dd HH:mm:ss" @change="focusNext">
          </el-date-picker>
          <el-date-picker v-model="search.endTime" id="nextPicker" type="datetime" placeholder="选择结束日期" :picker-options="end_Date" format="yyyy-MM-dd" value-format="yyyy-MM-dd HH:mm:ss">
          </el-date-picker>
        </el-form-item>
      </el-form>
      <div slot="control">
        <el-button icon="el-icon-search" type="primary" @click="get('table')">查询</el-button>
      </div>
    </kindo-box>
    <kindo-box title="模块操作日志">
      <div slot="control">
        <el-button icon="el-icon-k-sys-export" type="primary" @click="exportData">导出</el-button>
      </div>
      <kindo-table ref="table" :url="url" :extendOption="extend" :pageSize="10" :queryParam="search">
        <el-table-column label="模块名称" prop="module" min-width="200" align="center" show-overflow-tooltip></el-table-column>
        <el-table-column label="新增数量" prop="addQty" min-width="100" header-align="center" sortable="custom" show-overflow-tooltip></el-table-column>
        <el-table-column label="修改数量" prop="updateQty" min-width="140" header-align="center" sortable="custom" show-overflow-tooltip></el-table-column>
        <el-table-column label="审核数量" prop="auditQty" min-width="160" header-align="center" show-overflow-tooltip></el-table-column>
        <el-table-column label="删除数量" prop="removeQty" min-width="160" header-align="center" sortable="custom" show-overflow-tooltip></el-table-column>
        <el-table-column label="导入数量" prop="importQty" min-width="160" header-align="center" sortable="custom" show-overflow-tooltip></el-table-column>
        <el-table-column label="总计" prop="total" width="120" header-align="center" sortable="custom" show-overflow-tooltip></el-table-column>
      </kindo-table>
    </kindo-box>
  </div>
</template>
<script>
import config from './config/index.js'
export default {
  name: 'clinical',
  data() {
    return {
      start_Date: {
        disabledDate: (time) => {
          if (this.search.endTime) {
            return time.getTime() > new Date(this.search.endTime).getTime()
          }
        }
      },
      end_Date: {
        disabledDate: (time) => {
          if (this.search.startTime) {
            return time.getTime() < new Date(this.search.startTime).getTime()
          }
        }
      },
      extend: { selectedFirst: true },
      type: [
        { label: '新增', value: '新增' },
        { label: '修改', value: '修改' },
        { label: '审核', value: '审核' },
        { label: '删除', value: '删除' },
        { label: '导入', value: '导入' },
        { label: '批量新增', value: '批量新增' },
        { label: '批量审核', value: '批量审核' }
      ],
      search: {
        module: '',
        startTime: null,
        endTime: null
      },
      url: config.api.modularList
    }
  },

  mounted() {
    this.$nextTick(() => {
      this.get('table')
    })
  },
  watch: {
    search: {
      handler(newName, oldName) {
        newName.startTime == null
          ? (this.search.startTime = '')
          : (this.search.startTime = this.search.startTime)
        newName.endTime == null
          ? (this.search.endTime = '')
          : (this.search.endTime = this.search.endTime)
      },
      deep: true,
      immediate: true
    }
  },
  methods: {
    get(table) {
      this.$refs[table].reloadData()
    },
    focusNext() {
      let nextPicker = document.getElementById('nextPicker')
      nextPicker.focus()
    },
    // 导出
    exportData() {
      window.open(kindo.util.exportUrl(config.api.export, this.search))
    }
  }
}
</script>

<style lang="scss" scoped>
.el-date-editor.el-input,
.el-date-editor.el-input__inner {
  width: 240px !important;
}
</style>