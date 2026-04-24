/*@Author: lilizhou
 * 菜单：适配器-医院药品目录
 */

<template>
  <div>
    <kindo-box title="医院药品目录" icon="xx">
      <el-form :model="search" label-position="right" onsubmit="return false;" inline @keyup.enter.prevent.native="get('table')">
        <el-form-item label="医疗机构">
          <el-input v-model.trim="search.hospitalCode" clearable></el-input>
        </el-form-item>
        <el-form-item label="药品名称">
          <el-input v-model.trim="search.catalogueName" clearable></el-input>
        </el-form-item>
        <el-form-item label="剂型">
          <el-input v-model.trim="search.dosageForm" clearable></el-input>
        </el-form-item>
        <el-form-item label="规格">
          <el-input v-model.trim="search.spec" clearable></el-input>
        </el-form-item>
        <el-form-item label="生产厂家">
          <el-input v-model.trim="search.manufacturer" clearable></el-input>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model.trim="search.remark" clearable></el-input>
        </el-form-item>
      </el-form>
      <div slot="control">
        <el-button icon="el-icon-search" type="primary" @click="get('table')">查询</el-button>
      </div>
    </kindo-box>
    <kindo-box title="医院药品目录信息">
      <kindo-table ref="table" :url="url" :queryParam="search" @selection-change="(selection) => selectionChange(selection, 'selection')" @filter-change="(filters) => filterChange(filters, 'table', 'search')">
        <el-table-column type="selection" fixed="left" width="30"></el-table-column>
        <el-table-column label="医疗机构编码" fixed="left" prop="hospitalCode" min-width="130" header-align="center" sortable='custom' show-overflow-tooltip></el-table-column>
        <el-table-column label="医疗机构名称" prop="hospitalName" min-width="140" header-align="center" sortable='custom' show-overflow-tooltip></el-table-column>
        <el-table-column label="药品编码" prop="catalogueCode" min-width="120" header-align="center" sortable='custom' show-overflow-tooltip></el-table-column>
        <el-table-column label="药品名称" prop="catalogueName" min-width="140" header-align="center" sortable='custom' show-overflow-tooltip></el-table-column>
        <el-table-column label="规格" prop="spec" min-width="100" header-align="center" sortable='custom' show-overflow-tooltip></el-table-column>
        <el-table-column label="剂型" prop="dosageForm" min-width="120" header-align="center" sortable='custom' show-overflow-tooltip></el-table-column>
        <!-- <el-table-column label="收费项目等级" prop="chargeLevel" width="140" header-align="center" sortable='custom' align="center" :formatter="(row) => kindo.dictionary.getLabel(dict.CHARGE_LEVEL, row.chargeLevel)" show-overflow-tooltip></el-table-column> -->
        <el-table-column label="生产厂家" prop="manufacturer" min-width="120" header-align="center" show-overflow-tooltip></el-table-column>
        <el-table-column label="备注" prop="remark" min-width="120" header-align="center" show-overflow-tooltip></el-table-column>
        <el-table-column label="医保药品编码" prop="hcCatalogueCode" min-width="140" header-align="center" sortable='custom' show-overflow-tooltip></el-table-column>
        <el-table-column label="医保通用名称" prop="hcCatalogueName" min-width="140" header-align="center" sortable='custom' show-overflow-tooltip></el-table-column>
        <el-table-column label="医保药品剂型" prop="actualFormName" min-width="130" header-align="center" sortable='custom' show-overflow-tooltip></el-table-column>
        <el-table-column label="操作" width="100" align="center" fixed="right">
          <template slot-scope="scope">
            <el-tooltip class="item" effect="dark" :open-delay="300" content="删除" placement="top-start">
              <el-button type="text" icon="el-icon-delete" @click="deleteOne(scope.row.id, 'table')"></el-button>
            </el-tooltip>
          </template>
        </el-table-column>
      </kindo-table>
      <div slot="control">
        <el-button icon="el-icon-delete" type="text" @click="batch('selection', 'table', 'delete')">删除</el-button>
      </div>
    </kindo-box>
  </div>
</template>

<script>
import config from './config'
// 依赖于 table - 表格处理
import tableMixIn from '@src/utils/helper/tableMixIn.js'

export default {
  name: 'clientDrugCatelog',
  mixins: [tableMixIn],
  data() {
    return {
      num8: undefined,
      url: config.api.table,

      // 查询实体
      search: {
        catalogueName: ''
      },

      // 数据字典
      dict: {
        // 审核状态
        AUDIT_STATUS: [],
        // 疾病种类
        CHARGE_LEVEL: []
      },
      filtersDict: {
        // 审核状态
        AUDIT_STATUS: [],
        // 是否
        YES_NO: []
      },

      // 已选中表格数据
      selection: [],

      // 编辑、新增弹窗显示
      visible: false,
      // 新增、编辑表单
      form: {
        id: '',
        catalogueName: '',
        diseaseName: '',
        diseaseClass: '',
        specialDiseases: '0',
        applyFlag: '0',
        validFlag: '0',
        startTime: '',
        endTime: '',
        limit: '',
        limitFlag: '',
        remark: ''
      },

      // 表单校验规则
      formRules: {
        catalogueName: [{ required: true, message: '请输入主要编码', trigger: 'blur' }, { min: 0, max: 30, message: '长度不能超过30', trigger: 'blur' }],
        diseaseName: [{ required: true, message: '请输入疾病名称', trigger: 'blur' }, { min: 0, max: 30, message: '长度不能超过30', trigger: 'blur' }],
        diseaseClass: [{ required: true, message: '请输入疾病种类', trigger: 'blur' }, { min: 0, max: 30, message: '长度不能超过30', trigger: 'blur' }],
        limitFlag: [{ min: 0, max: 100, message: '长度不能超过100', trigger: 'blur' }],
        remark: [{ min: 0, max: 100, message: '长度不能超过100', trigger: 'blur' }]
      }
    }
  },

  created() {
    this._form = Object.assign({}, this.form)
    // 获取数据字典
    this.getDict(this.dict, this.filtersDict)
  },

  mounted() {
    this.$nextTick(() => {
      this.get('table')
    })
  },

  methods: {
    // 保存
    save() {
      this.$refs.form.validate(valid => {
        if (valid) {
          let params = {}
          params = Object.assign({}, this.form)
          params.startTime = kindo.util.formatDate(params.startTime)
          params.endTime = kindo.util.formatDate(params.endTime)
          let requestType = 'post'
          if (this.form.id) {
            requestType = 'put'
          }
          // 新增保存
          this.$http[requestType](config.api.table + this.form.id, params).then(res => {
            kindo.util.alert(res.message, '提示', 'success')
            this.visible = false
            this.get('table')
          })
        }
      })
    }
  }
}
</script>
