/* @Author: litianye
 *菜单：知识库-诊疗-诊疗项目限人群规则
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
    <kindo-box title="诊疗项目限人群规则">
      <kindo-table ref="table" :url="table.url" :queryParam="search" :default-sort="tableSort" @selection-change="(selection) => selectionChange(selection, 'selection')" @filter-change="(filters)=>filterChange(filters,'table', 'search')">
        <el-table-column type="selection" fixed="left" width="30"></el-table-column>
        <el-table-column label="诊疗项目编码" prop="itemCode" width="140" header-align="center" sortable='custom' show-overflow-tooltip></el-table-column>
        <el-table-column label="诊疗项目名称" prop="itemName" width="140" header-align="center" sortable='custom' show-overflow-tooltip></el-table-column>
        <el-table-column label="描述" prop="remark" min-width="140" align="left" header-align="center" sortable='custom' show-overflow-tooltip></el-table-column>
        <el-table-column label="限制条件"  min-width="140" align="left" header-align="center" :formatter="(row, column)=>kindo.dictionary.getLabel(list.limmitCondition,row.kbmsAgeId)" show-overflow-tooltip></el-table-column>
        <el-table-column label="排除条件"  min-width="140" align="left" header-align="center" :formatter="(row, column)=>kindo.dictionary.getLabel(list.excludeCondition,row.kbmsDrugIndicationId)" show-overflow-tooltip></el-table-column>
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
        <el-button icon="el-icon-plus" type="text" @click="insert('visible', 'form','tableInsert')">新增</el-button>
        <el-button icon="el-icon-delete" type="text" @click="batch('selection', 'table', 'delete')">删除</el-button>
        <el-button icon="el-icon-view" type="text" @click="batch('selection', 'table', 'audit')">审核</el-button>
        <!-- <el-button icon="el-icon-k-sys-import" type="text" @click="exportData">导入</el-button> -->
        <!-- <el-button icon="el-icon-k-sys-export" type="text" @click="exportData">导出</el-button> -->
      </div>
    </kindo-box>
    <el-dialog v-drag top="0" :visible.sync="visible" :title="(form.id?'编辑':'新增') +'诊疗项目'" :modal-append-to-body="false" :close-on-click-modal="false">
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
        <el-form-item label="限制条件" prop="kbmsAgeId">
          <el-select v-model="form.kbmsAgeId" clearable filterable>
            <el-option v-for="(item,index) in list.limmitCondition" :key="index" :label="item.label" :value="item.value"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="排除条件" prop="kbmsDrugIndicationId">
          <el-select v-model.trim="form.kbmsDrugIndicationId" remote :remote-method="remoteTj" @blur="(ev)=>{blurSel(ev,form,'kbmsDrugIndicationId','excludeCondition')}" :loading="loading" placeholder="请输入选择" clearable filterable>
            <el-option v-for="item in list.excludeCondition" :key="item.value" :label="item.label" :value="item.value"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="描述" prop="remark">
          <el-input type="textarea" :rows="2" placeholder="请输入内容" v-model.trim="form.remark"></el-input>
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
  name: 'medicalTreatmentLimitchild',
  mixins: [mixin],
  data() {
    return {
      // 表格默认排序
      tableSort: {
        prop: 'itemCode',
        order: 'descending'
      },
      dict: { AUDIT_STATUS: [] },
      filtersDict: {
        // 表内筛选审核状态数组
        AUDIT_STATUS: []
      },
      list: {
        commonDrugList: [],
        limmitCondition: [],
        excludeCondition: []
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
      search: {
        itemName: '',
        sex: '1',
        status: ''
      },
      // 下拉列表项目
      form: {
        id: '',
        itemCode: '',
        remark: '',
        kbmsAgeId: '',
        kbmsDrugIndicationId: ''
      },
      formRules: {
        itemCode: [{ required: true, message: '请选择', trigger: 'blur' }],
        remark: [{ min: 0, max: 200, message: '长度不能超过200', trigger: 'blur' }]
      },
      visible: false
    }
  },

  created() {
    this._form = Object.assign({}, this.form)
    // 审核状态数据字典获取
    this.getDict(this.dict, this.filtersDict)

    this.$http.get(config.api.xzTj).then(res => {
      this.list.limmitCondition =
        res.data.map(item => {
          let temObj = {
            label: item.name,
            value: item.id
          }
          return temObj
        }) || []
    })
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
    edit(row) {
      kindo.util
        .promise(() => {
          this.visible = true
        })
        .then(() => {
          // 初始化，去除校验提示并清空实体
          this.$refs.form.resetFields()
        })
        .then(() => {
          for (var key in row) {
            if (this.form.hasOwnProperty(key) === true) {
              this.form[key] = row[key]
            }
          }
        })
        .then(() => {
          this.list.excludeCondition = [{ value: row.kbmsDrugIndicationId, label: row.kbmsDrugIndicationName }]
        })
    },

    // 排除条件查询
    remoteTj(query) {
      if (query !== '') {
        this.loading = true
        if (!kindo.validate.isEmpty(this.timeout_tj)) {
          clearTimeout(this.timeout_tj)
        }
        this.timeout_tj = setTimeout(() => {
          let params = {
            name: query,
            rows: 100
          }
          this.$http.get(config.api.escape, { params: params }).then(res => {
            this.loading = false
            if (res.data && res.data.rows && res.data.rows.length > 0) {
              this.list.excludeCondition = res.data.rows.map(item => {
                let tempObj = {
                  label: item.name,
                  value: item.id
                }
                return tempObj
              })
            } else {
              this.list.excludeCondition = []
            }
          })
        }, 200)
      } else {
        this.list.excludeCondition = []
      }
    },
    // 新增
    tableInsert() {
      this.list.commonDrugList = []
    },
    // 编辑
    tableEdit(row) {
      this.list.commonDrugList = [{ value: row.drugCode, label: row.itemName }]
    },
    // 导入
    importData() {},
    // 导出
    exportData() {
      window.open(kindo.util.exportUrl(config.api.export, this.search))
    }
  },
  watch: {
    'form.itemCode': function(val) {
      if (val === '') {
        this.list.commonDrugList = []
      }
    }
  }
}
</script>