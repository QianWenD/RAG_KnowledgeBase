/* @Author: wuhuihui
 *菜单：基础数据库库-诊疗-自有诊疗项库目录
<template>
  <div>
    <kindo-box title="查询条件" icon="xx">
      <el-form :model="search" label-position="right" onsubmit="return false;" inline @keyup.enter.prevent.native="get('table')">
        <el-form-item label="诊疗项目">
          <el-input v-model.trim="search.itemName" clearable placeholder="请输入名称或编码"></el-input>
        </el-form-item>
      </el-form>
      <div slot="control">
        <el-button icon="el-icon-search" type="primary" @click="get('table')">查询</el-button>
      </div>
    </kindo-box>
    <kindo-box title="自有诊疗项目库信息">
      <kindo-table ref="table" :url="table.url" :queryParam="search" :default-sort="tableSort">
        <el-table-column label="项目编码" prop="itemCode" width="120" header-align="center" sortable='custom' show-overflow-tooltip></el-table-column>
        <el-table-column label="项目名称" prop="itemName" width="160" header-align="center" sortable='custom' show-overflow-tooltip></el-table-column>
        <el-table-column label="项目内涵" prop="remark" min-width="160" header-align="center" sortable='custom' show-overflow-tooltip></el-table-column>
        <el-table-column label="单位" prop="unitName" width="120" header-align="center" sortable='custom' show-overflow-tooltip></el-table-column>
      </kindo-table>
    </kindo-box>
  </div>
</template>

<script>
import config from './config/index.js'
import mixin from '@src/utils/helper/tableMixIn.js'

export default {
  name: 'ownMedicalProLibrary',
  mixins: [mixin],
  data() {
    return {
      // 表格默认排序
      tableSort: {
        prop: 'itemCode',
        order: 'ascending'
      },
      table: {
        url: config.api.table
      },
      search: {
        itemName: ''
      }
    }
  },

  created() { },

  mounted() {
    this.$nextTick(() => {
      this.$refs.table.reloadData()
    })
  },

  methods: {
    aa(yy) {
      console.log(yy)
      return true
    }
  }
}
</script>