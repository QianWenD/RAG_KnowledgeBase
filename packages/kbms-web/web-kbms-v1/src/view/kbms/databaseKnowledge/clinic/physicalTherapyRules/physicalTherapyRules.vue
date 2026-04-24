/* @Author: wuhuihui
 *菜单：知识库-药品-物理治疗规则
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
    <kindo-box title="物理治疗规则">
      <kindo-table ref="table" :url="table.url" :queryParam="search" @selection-change="(selection) => selectionChange(selection, 'selection')" @filter-change="(filters)=>filterChange(filters,'table', 'search')" :default-sort="tableSort">
        <el-table-column type="selection" fixed="left" width="30"></el-table-column>
        <el-table-column label="诊疗项目编码" prop="itemCode" width="140" header-align="center" sortable='custom' show-overflow-tooltip></el-table-column>
        <el-table-column label="诊疗项目名称" prop="itemName" width="160" header-align="center" sortable='custom' show-overflow-tooltip></el-table-column>
        <el-table-column label="政策限定用量(次)" prop="itemNum" width="150" align="right" header-align="center" sortable='custom' show-overflow-tooltip></el-table-column>
        <el-table-column label="项目内涵" prop="itemIntension" min-width="200" header-align="center" sortable='custom' show-overflow-tooltip></el-table-column>
        <el-table-column label="审核状态" prop="status" width="100" align="center" columnKey='status' :filters="filtersDict.AUDIT_STATUS" :filter-method="filterHandler" :filter-multiple="false" filter-placement="bottom-end" show-overflow-tooltip>
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
        <el-button icon="el-icon-plus" type="text" @click="insert('visible', 'form','tableInsert')">新增</el-button>
        <el-button icon="el-icon-delete" type="text" @click="batch('selection', 'table', 'delete')">删除</el-button>
        <el-button icon="el-icon-view" type="text" @click="batch('selection', 'table', 'audit')">审核</el-button>
        <!-- <el-button icon="el-icon-k-sys-export" type="text" @click="exportData">导出</el-button> -->
        <!-- <el-button icon="el-icon-k-sys-import" type="text" @click="exportData">导入</el-button> -->
      </div>
    </kindo-box>
    <el-dialog v-drag top="0" :visible.sync="visible" :title="(form.id?'编辑':'新增') +'物理治疗规则'" :modal-append-to-body="false" :close-on-click-modal="false">
      <el-form :model="form" label-position="right" ref="form" class="box" label-width="130px" :rules="formRules">
        <el-form-item label="诊疗项目" style="display:block;" prop="itemCode">
          <el-select v-model.trim="form.itemCode" size="mini" :disabled="!kindo.validate.isEmpty(form.id)" @blur="(ev)=>{blurSel(ev,form,'itemCode','commonDrugList')}" placeholder="请输入名称或编码" clearable filterable :loading="loading" remote :remote-method="(str) => getDictRemote('commonDrugList', 'itemName', str)">
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
        <el-form-item label="政策限定用量(次)" prop="itemNum">
          <el-input-number v-model.trim="form.itemNum" size="mini" :controls="false" :min="0" :max="99"></el-input-number>
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
  name: 'physicalTherapyRules',
  mixins: [mixin],
  data() {
    var validateNum = (rule, value, callback) => {
      if (!kindo.validate.pInterger(value)) {
        return callback(new Error('数值为正整数'))
      } else {
        callback()
      }
    }
    return {
      // 表格默认排序
      tableSort: {
        prop: 'itemCode',
        order: 'ascending'
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
      extendParams: {
        drugKind: '2'
      },
      loading: false,
      // itemRuleType标识不同页面:1:项目频次超小时收费，2：检验合理次数，3：项目超计价单位收费，4：中医疗法，5：物理治疗，6：康复治疗
      search: {
        itemName: '',
        status: '',
        itemRuleType: '5'
      },
      // 下拉列表项目
      // itemRuleType标识不同页面:1:项目频次超小时收费，2：检验合理次数，3：项目超计价单位收费，4：中医疗法，5：物理治疗，6：康复治疗
      form: {
        id: '',
        itemCode: '',
        itemNum: 20,
        itemRuleType: '5'
      },
      formRules: {
        itemCode: [{ required: true, message: '请选择', trigger: 'blur' }],
        itemNum: [
          { required: true, message: '不能为空', trigger: 'blur' },
          {
            validator: validateNum,
            trigger: 'blur'
          }
        ]
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

    // 新增
    tableInsert() {
      this.list.commonDrugList = []
    },
    // 编辑
    tableEdit(row) {
      this.list.commonDrugList = [{ value: row.itemCode, label: row.itemName }]
    },
    // 导入
    importData() { },
    // 导出
    exportData() {
      window.open(kindo.util.exportUrl(config.api.export, this.search))
    }
  },
  watch: {
    'form.itemCode': function (val) {
      if (val === '') {
        this.list.commonDrugList = []
      }
    }
  }
}
</script>