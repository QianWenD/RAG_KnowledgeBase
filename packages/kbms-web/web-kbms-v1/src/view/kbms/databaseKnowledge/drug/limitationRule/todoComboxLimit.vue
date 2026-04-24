2/* @Author: zhengtian
 * @Date: 2018-04-12
 * @Desc: 限定条件规则 -> 组合条件
 */
<template>
  <div :formLimitDefine="formLimitDefine" :searchLimitDefine="searchLimitDefine">
    <kindo-box title="查询条件">
      <el-form v-model.trim="table.search" onsubmit="return false;" label-position="right" inline @keyup.enter.prevent.native="getTable('table')">
        <el-form-item label="限定名称">
          <el-input v-model.trim="table.search.limitName" placeholder="" clearable></el-input>
        </el-form-item>
        <el-form-item label="条件类型">
          <el-radio v-for="item in dict.LIMIT_TYPE" v-model.trim="table.search.limitDefine" :key="item.value" :label="item.value">{{item.label}}</el-radio>
        </el-form-item>
      </el-form>
      <div slot="control">
        <el-button icon="el-icon-search" type="primary" @click="getTable('table')">查询</el-button>
      </div>
    </kindo-box>
    <kindo-box title="组合条件信息">
      <kindo-table ref="table" :url="table.url" :default-sort="tableSort" :queryParam="table.search" @selection-change="(selection) => tableChange('table', selection)">
        <el-table-column type="selection" fixed="left" width="30"></el-table-column>
        <el-table-column label="限定代码" prop="limitCode" min-width="120" header-align="center" sortable="custom" show-overflow-tooltip></el-table-column>
        <el-table-column label="限定名称" prop="limitName" min-width="120" header-align="center" sortable="custom" show-overflow-tooltip>
          <template slot-scope="scope">
            <el-tag type="'primary'" close-transition>{{scope.row.limitName}}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="组合条件" prop="expression" min-width="140" header-align="center" sortable="custom" show-overflow-tooltip></el-table-column>
        <el-table-column label="审核状态" prop="status" width="100" align="center" columnKey='status' :filters="columnFilters(dict.AUDIT_STATUS)" :filter-method="filterHandler" :filter-multiple="false" filter-placement="bottom-end">
          <template slot-scope="scope">
            <el-tag :type="scope.row.status === '1'?'success':'info'" close-transition>{{kindo.dictionary.getLabel(dict.AUDIT_STATUS,scope.row.status)}}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="条件类型" prop="limitDefine" min-width="140" header-align="center" :formatter="(row, column) => kindo.dictionary.getLabel(dict.LIMIT_TYPE,row[column.property])"></el-table-column>
        <el-table-column label="操作" width="100" align="center" fixed="right">
          <template slot-scope="scope">
            <el-tooltip class="item" effect="dark" :open-delay="300" content="编辑" placement="top-start">
              <el-button type="text" icon="el-icon-edit" @click="update('table', scope.row.id)"></el-button>
            </el-tooltip>
            <el-tooltip class="item" effect="dark" :open-delay="300" content="删除" placement="top-start">
              <el-button type="text" icon="el-icon-delete" @click="remove('table', scope.row.id)"></el-button>
            </el-tooltip>
          </template>
        </el-table-column>
      </kindo-table>
      <div slot="control">
        <el-button icon="el-icon-plus" type="text" @click="add('table', 'tableForm')">新增</el-button>
        <el-button icon="el-icon-delete" type="text" @click="remove('table')">删除</el-button>
        <el-button icon="el-icon-view" type="text" @click="audit('table')">审核</el-button>
      </div>
    </kindo-box>

    <el-dialog v-drag top="0" :visible.sync="table.dialog.visible" :title="table.dialog.title" :modal-append-to-body="false" :close-on-click-modal="false">
      <el-form :model="table.form" :rules="table.rules" onsubmit="return false;" label-width="90px" ref="tableForm">
        <el-form-item label="条件类型" prop="limitDefine">
          <el-tag size="medium"> {{kindo.dictionary.getLabel(dict.LIMIT_TYPE,this.table.form.limitDefine)}}</el-tag>
        </el-form-item>
        <el-form-item label="限定名称" prop="limitName">
          <el-input v-model.trim="table.form.limitName"></el-input>
        </el-form-item>
        <el-form-item label="组合条件" prop="expression">
          <el-input v-model.trim="table.form.expression"></el-input>
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button type="primary" icon="fa fa-floppy-o" @click="save('table')">保 存</el-button>
        <el-button @click="table.dialog.visible = false" icon="el-icon-close" type="primary">取 消</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import config from './config/index.js'
import tableOpra from '@src/utils/helper/tableOpra.js'
export default {
  mixins: [tableOpra],
  props: {
    formLimitDefine: String,
    searchLimitDefine: String
  },
  data() {
    return {
      tableSort: {
        prop: 'limitCode',
        sort: 'ascending'
      },
      dict: {
        // 审核状态
        AUDIT_STATUS: [],
        // 限定条件类型
        LIMIT_TYPE: [],
        // 限定条件
        LIMIT_RESTRICT_TYPE: []
      },
      tableOld: {
        form: {}
      },
      table: {
        url: config.api.parent,
        selection: [],
        dialog: {
          visible: false,
          title: '新增'
        },
        form: {
          id: '',
          limitType: '2', // '2' 默认组合条件
          limitDefine: '2',
          limitName: '',
          expression: ''
        },
        rules: {
          limitName: [{ required: true, message: '请输入限定名称', trigger: 'blur' }, { min: 0, max: 30, message: '长度不能超过30' }],
          expression: [{ required: true, message: '请输入组合条件', trigger: 'blur' }, { min: 0, max: 30, message: '长度不能超过30' }]
        },
        search: {
          limitCode: '',
          limitName: '',
          limitDefine: '2',
          limitType: '2' // '2' 默认组合条件
        }
      }
    }
  },
  methods: {
    add(table, refForm) {
      kindo.util
        .promise(() => {
          if (this[table].dialog.hasOwnProperty('title')) {
            this[table].dialog.title = '新增'
          }
          this[table].dialog.visible = true
        })
        .then(() => {
          this.tableOld.form = Object.assign({}, this.table.form)
        })
        .then(() => {
          if (refForm) {
            this.$refs[refForm].resetFields()
          } else {
            return true
          }
        })
        .then(() => {
          let row = this.tableOld.form
          this.table.form.limitDefine = row.limitDefine
          this.table.form.limitType = row.limitType
        })
    }
  },
  created() {
    this.getDictionary()
  },
  mounted() {
    this.$nextTick(() => {
      this.getTable('table')
    })
  },
  watch: {
    formLimitDefine(val) {
      this.table.form.limitDefine = val
      this.$refs.table.doLayout('table')
    },
    searchLimitDefine(val) {
      this.table.search.limitDefine = val
    },
    'table.search.limitDefine': function (v) {
      if (v === '1') {
        this.table.form.limitDefine = '1'
      } else {
        this.table.form.limitDefine = '2'
      }
      this.getTable('table')
    }
  }
}
</script>