/*  @Author: litianye
 * @Date: 2018-05-11
 * @Desc: 传染病筛查规则-低端项目
 */
<template>
  <div :parentRow="parentRow" :isOpen="isOpen">
    <kindo-box title="查询条件" icon="xx">
      <el-form :model="search" label-position="right" onsubmit="return false;" inline @keyup.enter.prevent.native="get('table')">
        <el-form-item label="诊疗项目">
          <el-input v-model.trim="search.itemName" clearable></el-input>
        </el-form-item>
      </el-form>
      <div slot="control">
        <el-button icon="el-icon-search" type="primary" @click="get('table')">查询</el-button>
      </div>
    </kindo-box>
    <kindo-box title="诊疗项目信息">
      <kindo-table ref="table" :url="url" :queryParam="search" :default-sort="sortTable" @selection-change="(selection) => selectionChange(selection, 'selection')" @filter-change="(filters)=>filterChange(filters,'table', 'search')">
        <el-table-column type="selection" fixed="left" width="30"></el-table-column>
        <el-table-column label="诊疗项目编码" prop="itemCode" width="140" header-align="center" sortable='custom' show-overflow-tooltip></el-table-column>
        <el-table-column label="诊疗项目名称" prop="itemName" width="140" header-align="center" sortable='custom' show-overflow-tooltip></el-table-column>
        <el-table-column label="项目内涵" prop="itemIntension" min-width="140" align="left" header-align="center" sortable='custom' show-overflow-tooltip></el-table-column>
        <el-table-column label="描述" prop="remark" min-width="140" header-align="center" sortable='custom' show-overflow-tooltip></el-table-column>
        <el-table-column label="审核状态" prop="status" width="100" align="center" header-align="center" columnKey='status' :filters="filtersDict.AUDIT_STATUS" :filter-method="filterHandler" :filter-multiple="false" filter-placement="bottom-end" show-overflow-tooltip>
          <template slot-scope="scope">
            <el-tag v-if="scope.row.status" :type="scope.row.status === '1'?'success':'info'" close-transition>{{kindo.dictionary.getLabel(dict.AUDIT_STATUS,scope.row.status)}}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" align="center" fixed="right">
          <template slot-scope="scope">
            <el-tooltip class="item" effect="dark" :open-delay="300" content="编辑" placement="top-start">
              <el-button type="text" icon="el-icon-edit" @click="edit(scope.row,'form','table','visible','tableEdit')"></el-button>
            </el-tooltip>
            <el-tooltip class="item" effect="dark" :open-delay="300" content="删除" placement="top-start">
              <el-button type="text" icon="el-icon-delete" @click="deleteOne(scope.row.id, 'table')"></el-button>
            </el-tooltip>
          </template>
        </el-table-column>
      </kindo-table>
      <div slot="control">
        <el-button icon="el-icon-plus" type="text" @click="insert">新增</el-button>
        <el-button icon="el-icon-delete" type="text" @click="batch('selection', 'table', 'delete')">删除</el-button>
        <el-button icon="el-icon-view" type="text" @click="batch('selection', 'table', 'audit')">审核</el-button>
      </div>
    </kindo-box>
    <el-dialog v-drag top="0" :visible.sync="visible" :title="(form.id?'编辑':'新增') +'低端项目'" :modal-append-to-body="false" :close-on-click-modal="false" width="450">
      <el-form :model="form" label-position="right" ref="form" class="box" label-width="90px" :rules="formRules">
        <el-form-item label="诊疗项目" style="display:block;" prop="itemCode">
          <el-select v-model.trim="form.itemCode" size="mini" :disabled="!kindo.validate.isEmpty(form.id)" @blur="(ev)=>{blurSel(ev,form,'itemCode','commonDrugList')}" placeholder="请输入选择" clearable filterable :loading="loading" remote :remote-method="(query) => getDictRemote('commonDrugList', 'itemName', query)">
            <li class="title">
              <span>代码值</span>
              <span>代码标题</span>
            </li>
            <li class="tip">
              <span>
                &lt;请选择&gt;
              </span>
            </li>
            <el-option v-for="item in list.commonDrugList" :key="item.value" :label="item.label" :value="item.value">
              <span>{{ item.value }}</span>
              <span>{{ item.label }}</span>
            </el-option>
          </el-select>
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
  mixins: [mixin],
  name: 'todo-lowproject',
  props: {
    parentRow: Object,
    isOpen: Boolean
  },
  data() {
    return {
      dict: { AUDIT_STATUS: [] },
      filtersDict: {
        // 表内筛选审核状态数组
        AUDIT_STATUS: []
      },
      sortTable: {
        prop: 'itemCode',
        sort: 'ascending'
      },
      url: config.api.LowProject,
      selection: [],
      list: {
        commonDrugList: []
      },
      loading: false,
      search: {
        itemName: '',
        status: '',
        diseaseScreeningId: ''
      },

      form: {
        id: '',
        itemCode: '',
        diseaseScreeningId: ''
      },
      formRules: {
        itemCode: [{ required: true, message: '请输入名称', trigger: 'blur' }],
        remark: [{ min: 0, max: 200, message: '长度不能超过200' }]
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
      this.get('table')
    })
  },

  methods: {
    init() {
      if (this.parentRow.id) {
        this.search.diseaseScreeningId = this.parentRow.id
        this.form.diseaseScreeningId = this.parentRow.id
        this.get('table')
      } else {
        this.$refs.table.clearTable()
      }
    },
    // 诊疗项目远程查询
    getDictRemote(dict, searchName, searchVal) {
      let param = { rows: 200, [searchName]: searchVal }
      this.$http.get(this.api.medicalTreatment, { params: param }).then(res => {
        this.list[dict] =
          res.data.rows.map(item => {
            return { label: item.itemName, value: item.itemCode }
          }) || []
      })
    },
    insert() {
      kindo.util
        .promise(() => {
          this.visible = true
          this.form.id = ''
          this.form.itemCode = ''
          this.form.remark = ''
          this.list.commonDrugList = []
        })
        .then(() => {
          this.get('table')
        })
    },
    get(table) {
      this.$refs[table].reloadData()
    },
    // row 表的当前数据，类型-对象
    tableEdit(row) {
      this.list.commonDrugList = [{ value: row.itemCode, label: row.itemName }]
    },
    // 导入
    importData() { },
    // 导出
    exportData() { }
  },
  watch: {
    isOpen(val) {
      if (!kindo.validate.isEmpty(this.$refs.table)) {
        this.$refs.table.doLayout('table')
      }
    },
    parentRow(val) {
      this.init()
    }
  }
}
</script>
