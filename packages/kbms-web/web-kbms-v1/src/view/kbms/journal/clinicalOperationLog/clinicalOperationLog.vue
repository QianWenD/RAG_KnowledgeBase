/* @Author: caim
*菜单：知识库-临床操作日志-临床操作日志
 */
<template>
  <div>
    <kindo-box title="查询条件" icon="xx">
      <el-form :model="search" onsubmit="return false;" label-position="right" inline @keyup.enter.prevent.native="get('table')">
        <el-form-item label="模块名称">
          <el-input v-model.trim="search.module" placeholder="" clearable></el-input>
        </el-form-item>
        <el-form-item label="操作类型">
          <el-select v-model.trim="search.type" clearable>
            <el-option v-for="item in type" :key="item.value" :label="item.label" :value="item.value"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="操作人员">
          <el-input v-model.trim="search.name" placeholder="" clearable></el-input>
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
    <kindo-box title="临床操作日志">
      <div slot="control">
        <el-button icon="el-icon-k-sys-export" type="primary" @click="exportData">导出</el-button>
      </div>
      <kindo-table ref="table" :url="url" :extendOption="extend" :pageSize="10" :queryParam="search">
        <el-table-column label="姓名" prop="name" width="80" header-align="center" sortable="custom" show-overflow-tooltip></el-table-column>
        <el-table-column label="操作类型" prop="type" width="100" header-align="center" sortable="custom" show-overflow-tooltip></el-table-column>
        <el-table-column label="模块名称" prop="module" min-width="140" header-align="center" sortable="custom" show-overflow-tooltip></el-table-column>
        <el-table-column label="新数据" prop="newData" min-width="160" align="center" show-overflow-tooltip></el-table-column>
        <el-table-column label="旧数据" prop="oldData" min-width="160" header-align="center" sortable="custom" show-overflow-tooltip></el-table-column>
        <el-table-column label="导入文件" prop="fileName" width="160" header-align="center" sortable="custom" show-overflow-tooltip></el-table-column>
        <el-table-column label="操作时间" prop="operateTime" width="120" :formatter="
            (row) =>
              row.operateTime ? kindo.util.formatDate(row.operateTime) : ''
          " align="center" sortable="custom" show-overflow-tooltip></el-table-column>
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
        type: '',
        name: '',
        startTime: null,
        endTime: null
      },
      url: config.api.clinicalList
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

<style lang='scss' scoped>
.el-date-editor.el-input,
.el-date-editor.el-input__inner {
  width: 240px !important;
}
</style>