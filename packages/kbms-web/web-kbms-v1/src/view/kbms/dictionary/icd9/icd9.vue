/*
 * @Author: zhengtian
 * @Date: 2018-04-08
 * @Desc: 手术操作编码
 */
<template>
  <div>
    <!-- 父表 -->
    <kindo-box title="手术操作编码" icon="xx">
      <el-form :model="parent.search" onsubmit="return false;" label-position="right" inline @keyup.enter.prevent.native="getTable('parent')">
        <el-form-item label="主要编码">
          <el-input v-model.trim="parent.search.surgeryCode" placeholder="" clearable></el-input>
        </el-form-item>
        <el-form-item label="附加编码">
          <el-input v-model.trim="parent.search.additionalCode" placeholder="" clearable></el-input>
        </el-form-item>
        <el-form-item label="手术名称">
          <el-input v-model.trim="parent.search.surgeryName" placeholder="" clearable></el-input>
        </el-form-item>
      </el-form>
      <div slot="control">
        <el-button icon="el-icon-search" type="primary" @click="getTable('parent')">查询</el-button>
      </div>
    </kindo-box>
    <kindo-box title="手术操作编码信息">
      <kindo-table ref="parent" :url="parent.url" :queryParam="parent.search" :extendOption="extend" @selection-change="(selection) => tableChange('parent', selection)">
        <el-table-column type="selection" fixed="left" width="30"></el-table-column>
        <el-table-column label="主要编码" fixed="left" prop="surgeryCode" width="140" header-align="center" sortable='custom' show-overflow-tooltip></el-table-column>
        <el-table-column label="附加编码" prop="additionalCode" width="160" header-align="center" sortable='custom' show-overflow-tooltip></el-table-column>
        <el-table-column label="手术名称" prop="surgeryName" min-width="160" header-align="center" sortable='custom' show-overflow-tooltip></el-table-column>
        <el-table-column label="备注" prop="remark" min-width="200" header-align="center" show-overflow-tooltip></el-table-column>
        <el-table-column label="操作" width="100" align="center" fixed="right">
          <template slot-scope="scope">
            <el-tooltip class="item" effect="dark" :open-delay="300" content="删除" placement="top-start">
              <el-button type="text" icon="el-icon-delete" @click="remove('parent', scope.row.id)"></el-button>
            </el-tooltip>
          </template>
        </el-table-column>
      </kindo-table>
      <div slot="control">
        <el-button icon="el-icon-delete" type="text" @click="remove('parent')">删除</el-button>
      </div>
    </kindo-box>
  </div>
</template>

<script>
import config from './config/index.js'
import tableOpra from '@src/utils/helper/tableOpra.js'
export default {
  name: 'icd9',
  mixins: [tableOpra],
  data() {
    return {
      // 主表默认选第一行数据
      extend: { selectedFirst: true },
      parent: {
        url: config.api.parent,
        selection: [],
        search: {
          surgeryName: '',
          additionalCode: '',
          surgeryCode: ''
        }
      }
    }
  },
  methods: {},

  created() { },

  mounted() {
    this.$nextTick(() => {
      this.getTable('parent')
    })
  }
}
</script>