/* @Author: litianye
 *菜单：知识库-诊疗-项目频次超小时收费规则
<template>
  <div>
    <kindo-box title="查询条件" icon="xx">
      <el-form :model="search" label-position="right" onsubmit="return false;" inline @keyup.enter.prevent.native="get('table')">
        <el-form-item label="诊疗项目">
          <el-input v-model.trim="search.genericName" clearable placeholder="请输入名称或编码"></el-input>
        </el-form-item>
      </el-form>
      <div slot="control">
        <el-button icon="el-icon-plus" type="primary" @click="insert('visible', 'form','tableInsert')">新增</el-button>
      </div>
    </kindo-box>
    <kindo-box title="项目频次超小时收费规则信息">
      <kindo-table ref="table" :url="table.url" :queryParam="search" @selection-change="(selection) => selectionChange(selection, 'selection')" @filter-change="(filters)=>filterChange(filters,'table', 'search')">
        <el-table-column type="selection" fixed="left" width="30"></el-table-column>
        <el-table-column label="诊疗项目编码" prop="drugCode" width="140" header-align="center" sortable='custom' show-overflow-tooltip></el-table-column>
        <el-table-column label="诊疗项目名称" prop="genericName" width="140" header-align="center" sortable='custom' show-overflow-tooltip></el-table-column>
        <el-table-column label="单位" prop="remark" width="90" align="center" header-align="center" sortable='custom' show-overflow-tooltip></el-table-column>
        <el-table-column label="项目内涵" prop="remark" min-width="140" align="left" header-align="center" sortable='custom' show-overflow-tooltip></el-table-column>
        <el-table-column label="描述" prop="remark" min-width="140" align="left" header-align="center" sortable='custom' show-overflow-tooltip></el-table-column>
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
        <el-button icon="el-icon-search" type="text" @click="get('table')">查询</el-button>
        <el-button icon="el-icon-view" type="text" @click="batch('selection', 'table', 'audit')">审核</el-button>
        <el-button icon="el-icon-delete" type="text" @click="batch('selection', 'table', 'delete')">删除</el-button>
        <!-- <el-button icon="el-icon-k-sys-export" type="text" @click="exportData">导出</el-button> -->
        <!-- <el-button icon="el-icon-k-sys-import" type="text" @click="exportData">导入</el-button> -->
      </div>
    </kindo-box>
    <el-dialog v-drag top="0" :visible.sync="visible" :title="(form.id?'编辑':'新增') +'诊疗项目'" :modal-append-to-body="false" :close-on-click-modal="false">
      <el-form :model="form" label-position="right" ref="form" class="box" label-width="110px" :rules="formRules">
        <el-form-item label="诊疗项目" style="display:block;" prop="drugCode">
          <el-select v-model.trim="form.drugCode" size="mini" :disabled="!kindo.validate.isEmpty(form.id)" @blur="(ev)=>{blurSel(ev,form,'drugCode','commonDrugList')}" placeholder="请输入选择" clearable filterable :loading="loading" remote :remote-method="(query) => remoteMethod(query, 'loading', 'commonDrugList',extendParams)">
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
        <el-form-item label="每日上限次数" prop="mrsxcs">
          <el-input-number v-model.trim="form.mrsxcs"></el-input-number>
        </el-form-item>
        <el-form-item label="单位" prop="unit">
          <el-input v-model.trim="form.unit"></el-input>
        </el-form-item>
        <el-form-item label="项目内涵" prop="remark">
          <el-input type="textarea" :rows="2" placeholder="请输入内容" v-model.trim="form.remark"></el-input>
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
  mixins: [mixin],
  data() {
    return {
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
      search: {
        genericName: '',
        sex: '',
        status: ''
      },
      // 下拉列表项目
      form: {
        id: '',
        drugCode: '',
        mrsxcs: '',
        unit: '',
        sex: '',
        remark: ''
      },
      formRules: {
        drugCode: [{ required: true, message: '请选择', trigger: 'blur' }],
        mrsxcs: [{ required: true, message: '请选择输入次数', trigger: 'blur' }],
        remark: [{ min: 0, max: 30, message: '长度不能超过30', trigger: 'blur' }]
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
    // 编辑
    tableEdit(row) {
      this.list.commonDrugList = [{ value: row.drugCode, label: row.genericName }]
    },
    // 导入
    importData() { },
    // 导出
    exportData() {
      window.open(kindo.util.exportUrl(config.api.export, this.search))
    }
  },
  watch: {
    'form.genericName': function (val) {
      if (val === '') {
        this.list.commonDrugList = []
      }
    }
  }
}
</script>