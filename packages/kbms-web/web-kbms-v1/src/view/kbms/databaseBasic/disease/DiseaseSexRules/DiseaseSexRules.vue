/* @Author: litianye
 *菜单：知识库-疾病-疾病限性别规则
<template>
  <div>
    <kindo-box title="查询条件" icon="xx">
      <el-form :model="search" label-position="right" onsubmit="return false;" label-width="120px" inline @keyup.enter.prevent.native="get('table')">
        <el-form-item label="疾病名称">
          <el-input v-model.trim="search.diseaseKey" clearable placeholder="请输入关键字"></el-input>
        </el-form-item>
        <el-form-item label="性别">
          <el-select v-model.trim="search.sex" clearable placeholder="">
            <el-option value="1" label="男"></el-option>
            <el-option value="2" label="女"></el-option>
          </el-select>
        </el-form-item>
      </el-form>
      <div slot="control">
        <el-button icon="el-icon-search" type="primary" @click="get('table')">查询</el-button>
      </div>
    </kindo-box>
    <kindo-box title="疾病限性别规则信息">
      <kindo-table ref="table" :url="table.url" :default-sort="tableSort" :queryParam="search" @selection-change="(selection) => selectionChange(selection, 'selection')" @filter-change="(filters)=>filterChange(filters,'table', 'search')">
        <el-table-column type="selection" fixed="left" width="30"></el-table-column>
        <el-table-column label="疾病名称（关键字）" prop="diseaseKey" width="180" header-align="center" sortable='custom' show-overflow-tooltip></el-table-column>
        <el-table-column label="性别" prop="sex" width="90" align="center" header-align="center" sortable='custom' show-overflow-tooltip :formatter="(row,column)=>{return row[column.property]==='1'? '男' : '女' }"></el-table-column>
        <el-table-column label="描述" prop="remark" min-width="140" align="left" header-align="center" sortable='custom' show-overflow-tooltip></el-table-column>
        <el-table-column label="审核状态" prop="status" width="100" align="center" header-align="center" columnKey='status' :filters="filtersDict.AUDIT_STATUS" :filter-method="filterHandler" :filter-multiple="false" filter-placement="bottom-end" show-overflow-tooltip>
          <template slot-scope="scope">
            <el-tag v-if="scope.row.status" :type="scope.row.status === '1'?'success':'info'" close-transition>{{kindo.dictionary.getLabel(dict.AUDIT_STATUS,scope.row.status)}}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" align="center" fixed="right">
          <template slot-scope="scope">
            <el-tooltip class="item" effect="dark" :open-delay="300" content="编辑" placement="top-start">
              <el-button type="text" icon="el-icon-edit" @click="edit(scope.row,'form','table','visible')"></el-button>
            </el-tooltip>
            <el-tooltip class="item" effect="dark" :open-delay="300" content="删除" placement="top-start">
              <el-button type="text" icon="el-icon-delete" @click="deleteOne(scope.row.id, 'table')"></el-button>
            </el-tooltip>
          </template>
        </el-table-column>
      </kindo-table>
      <div slot="control">
        <el-button icon="el-icon-plus" type="text" @click="insert('visible', 'form','tableInsert')">新增</el-button>
        <el-button icon="el-icon-delete" type="text" @click="batch('selection', 'table', 'delete')">删除</el-button>
        <el-button icon="el-icon-view" type="text" @click="batch('selection', 'table', 'audit')">审核</el-button>
        <!-- <el-button icon="el-icon-k-sys-export" type="text" @click="exportData">导出</el-button> -->
        <!-- <el-button icon="el-icon-k-sys-import" type="text" @click="exportData">导入</el-button> -->
      </div>
    </kindo-box>
    <el-dialog v-drag top="0" :visible.sync="visible" :title="(form.id?'编辑':'新增') +'限性别疾病'" width="450px" :modal-append-to-body="false" :close-on-click-modal="false">
      <el-form :model="form" label-position="right" ref="form" label-width="90px" class="box" :rules="formRules">
        <el-form-item label="疾病名称" prop="diseaseKey">
          <el-input v-model.trim.trim="form.diseaseKey"></el-input>
        </el-form-item>
        <el-form-item label="性别" prop="sex">
          <el-radio-group v-model.trim="form.sex">
            <el-radio :label="'1'">男</el-radio>
            <el-radio :label="'2'">女</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="描述" prop="remark">
          <el-input type="textarea" :rows="2" placeholder="可输入200字" v-model.trim="form.remark"></el-input>
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button type="primary" icon="fa fa-floppy-o" @click="save('form','table','visible')">保 存</el-button>
        <el-button @click="visible = false" icon="el-icon-close" type="primary">取 消</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import config from './config/index.js'
import mixin from '@src/utils/helper/tableMixIn.js'

export default {
  name: 'DiseaseSexRules',
  mixins: [mixin],
  data() {
    return {
      // 表格默认排序
      tableSort: {
        prop: 'diseaseKey',
        order: 'descending'
      },
      dict: { AUDIT_STATUS: [] },
      filtersDict: {
        // 表内筛选审核状态数组
        AUDIT_STATUS: []
      },
      list: {
        commonDrugList: []
      },
      timeout: null,
      table: {
        url: config.api.table
      },
      selection: [],
      loading: false,
      search: {
        diseaseKey: '',
        sex: '',
        status: ''
      },
      // 下拉列表项目
      form: {
        id: '',
        diseaseKey: '',
        sex: '1',
        remark: ''
      },
      formRules: {
        diseaseKey: [{ required: true, message: '请选择输入疾病名称', trigger: 'blur' }, { min: 0, max: 30, message: '长度不能超过30' }],
        sex: [{ required: true, message: '请选择性别', trigger: 'blur' }],
        remark: [{ min: 0, max: 200, message: '长度不能超过200', trigger: 'blur' }]
      },
      visible: false
    }
  },

  created() {
    this._form = Object.assign({}, this.form)
    // 审核状态数据字典获取
    this.getDict(this.dict, this.filtersDict)
  },

  mounted() {
    this.$nextTick(() => {
      this.$refs.table.reloadData()
    })
  },

  methods: {
    // 新增
    tableInsert() {
      this.list.commonDrugList = []
    },
    // 导入
    importData() { },
    // 导出
    exportData() {
      window.open(kindo.util.exportUrl(config.api.export, this.search))
    }
  },
  watch: {}
}
</script>