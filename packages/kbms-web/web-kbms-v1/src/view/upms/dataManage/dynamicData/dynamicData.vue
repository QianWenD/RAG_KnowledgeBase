<template>
  <div>
    <el-row>
      <el-col :span="12">
        <kindo-box title="条件筛选" icon="el-icon-search">
          <el-form :model="dataSearch" onsubmit="return false;" label-position="right" inline @keyup.enter.prevent.native="getCate">
            <el-form-item label="字典类型">
              <el-input v-model.trim="cateSearch.catalog" placeholder="请输入字典类型"></el-input>
            </el-form-item>
          </el-form>

          <div slot="control">
            <el-button type="primary" icon="el-icon-search" @click="getCate">查询</el-button>
          </div>
        </kindo-box>

        <kindo-box title="基础字典" icon="fa-bar-chart">
          <kindo-table ref="table" :url="url" :queryParam="cateSearch" @row-click="tableClick">
            <el-table-column label="字典类型" prop="catalog" min-width="140" header-align="center" sortable='custom' show-overflow-tooltip></el-table-column>
            <el-table-column label="备注" prop="catalogDesc" min-width="240" header-align="center" show-overflow-tooltip></el-table-column>
            <el-table-column label="操作" width="60" align="center">
              <template slot-scope="scope">
                <el-tooltip class="item" effect="dark" :open-delay="300" content="重新加载" placement="top-start">
                  <el-button type="text" icon="el-icon-refresh" @click="reset(scope.$index, scope.row)"></el-button>
                </el-tooltip>
              </template>
            </el-table-column>
          </kindo-table>
        </kindo-box>
      </el-col>
      <el-col :span="12">

        <kindo-box title="字典明细" icon="fa-bar-chart">
          <kindo-table ref="dataTable" :url="url2" :queryParam="dataSearch" :pagination="false">
            <el-table-column label="字典键" prop="label" min-width="140" header-align="center" sortable show-overflow-tooltip></el-table-column>
            <el-table-column label="字典值" prop="value" min-width="240" header-align="center" sortable show-overflow-tooltip></el-table-column>
          </kindo-table>
        </kindo-box>
      </el-col>
    </el-row>

  </div>
</template>

<script>
import config from './config'

export default {
  name: 'dynamicData',
  data() {
    return {
      url: config.api.getCate,
      url2: config.api.getData,

      // 字典类型查询实体
      cateSearch: {
        catalog: ''
      },

      // 字典数据查询实体
      dataSearch: {
        catalog: ''
      }
    }
  },

  mounted() {
    this.$nextTick(() => {
      this.getCate()
    })
  },

  methods: {
    // 查询动态数据字典类型
    getCate() {
      this.$refs.table.reloadData().then(res => {
        this.$refs.table.setCurrentRowIndex(0)
        this.tableClick(res.data.rows[0])
      })
    },

    // 当点击选中动态数据字典类型某一行时
    tableClick(row) {
      this.dataSearch.catalog = row.catalog
      this.getData()
    },

    // 查询动态数据字典
    getData() {
      this.$refs.dataTable.reloadData()
    },

    // 重新加载

    // 重新加载某字典类型数据字典缓存
    reset(index, row) {
      this.$http.get(config.api.reset, { params: { catalog: row.catalog } }).then(res => {
        kindo.util.alert('重新加载(' + row.catalog + ')动态字典缓存成功', '提示', 'success')
      })
    }
  }
}
</script>