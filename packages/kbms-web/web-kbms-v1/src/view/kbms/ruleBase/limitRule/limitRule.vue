/* @Author: wuhuihui
 * 菜单：限价规则
 */

<template>
  <div>
    <kindo-box title="查询条件" icon="xx">
      <el-form :model="search" label-position="right" onsubmit="return false;" inline @keyup.enter.prevent.native="get('table')">
        <el-form-item label="诊疗项目">
          <el-input v-model.trim="search.itemName" placeholder="请输入关键字" clearable></el-input>
        </el-form-item>
      </el-form>
      <div slot="control">
        <el-button icon="el-icon-search" type="primary" @click="get('table')">查询</el-button>
      </div>
    </kindo-box>
    <kindo-box title="限价规则">
      <kindo-table ref="table" :url="url" :queryParam="search" @selection-change="(selection) => selectionChange(selection, 'selection')" @filter-change="(filters) => filterChange(filters, 'table', 'search')">
        <el-table-column type="selection" fixed="left" width="50" align="center"></el-table-column>
        <el-table-column label="诊疗项目编码" fixed="left" prop="itemCode" min-width="150" header-align="center" sortable='custom' show-overflow-tooltip></el-table-column>
        <el-table-column label="诊疗项目名称" fixed="left" prop="itemName" min-width="200" header-align="center" sortable='custom' show-overflow-tooltip></el-table-column>
        <el-table-column label="单位" min-width="100" align="center" show-overflow-tooltip>
          <template slot-scope="scope">
            <span>{{ kindo.dictionary.getLabel(dict.LIMIT_PRICE_UNIT,scope.row.itemUnit) }}</span>
          </template>
        </el-table-column>
        <!-- <el-table-column label="版本" header-align="center" min-width="100" show-overflow-tooltip>
          <template slot-scope="scope">
            <span>{{ kindo.dictionary.getLabel(dict.EDITION,scope.row.edition) }}</span>
          </template>
        </el-table-column> -->

        <el-table-column :label="item.label" v-for="(item,index) in dict.PRICE_GRADE" :key="index" header-align="center" min-width="100" show-overflow-tooltip>
          <template slot-scope="scope">
            <span>{{ returnPriceGrade(item.value, scope.row.priceGrade) }}</span>
          </template>
        </el-table-column>

        <el-table-column label="限价条件" min-width="100" align="center" show-overflow-tooltip>
          <template slot-scope="scope">
            <span>{{ kindo.dictionary.getLabel(dict.LIMIT_PRICE_CONDITION,scope.row.limitCondition) }}</span>
          </template>
        </el-table-column>

        <!-- <el-table-column label="风险等级" min-width="100" align="center" show-overflow-tooltip>
          <template slot-scope="scope">
            <span>{{ kindo.dictionary.getLabel(dict.RISK_LEVEL,scope.row.riskLevel) }}</span>
          </template>
        </el-table-column>

        <el-table-column label="规则依据" prop="regularBasis" header-align="center" min-width="200" show-overflow-tooltip>
        </el-table-column> -->

        <el-table-column label="审核状态" prop="status" min-width="100" align="center" columnKey='status' :filters="filtersDict.AUDIT_STATUS" :filter-method="filterHandler" :filter-multiple="false" filter-placement="bottom-end">
          <template slot-scope="scope">
            <el-tag :type="scope.row.status === '1'?'success':'info'" close-transition>
              {{kindo.dictionary.getLabel(dict.AUDIT_STATUS,scope.row.status)}}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" min-width="150" align="center" fixed="right">
          <template slot-scope="scope">
            <el-tooltip class="item" effect="dark" :open-delay="300" content="编辑" placement="top-start">
              <el-button type="text" icon="el-icon-edit" @click="openDialog('edit',scope.row)">
              </el-button>
            </el-tooltip>
            <el-tooltip class="item" effect="dark" :open-delay="300" content="删除" placement="top-start">
              <el-button type="text" icon="el-icon-delete" @click="deleteOne(scope.row.id, 'table')"></el-button>
            </el-tooltip>
          </template>
        </el-table-column>
      </kindo-table>
      <div slot="control">
        <el-button icon="el-icon-plus" type="text" @click="openDialog('add')">新增</el-button>
        <el-button icon="el-icon-delete" type="text" @click="batch('selection', 'table', 'delete')">删除</el-button>
        <el-button icon="el-icon-view" type="text" @click="batch('selection', 'table', 'audit')">审核</el-button>
      </div>
    </kindo-box>
    <el-dialog v-drag top="0" :visible.sync="dialog.visible" :title="dialog.title+'限价规则'" width="380px" :modal-append-to-body="false" :close-on-click-modal="false">
      <el-form :model="dialog.form" :rules="formRules" class="box" onsubmit="return false;" label-width="100px" ref="form">
        <el-form-item label="诊疗项目" prop="itemCode">
          <el-select v-model.trim="dialog.form.itemCode" :disabled="dialog.form.id ? true : false" size="mini" @blur="(ev)=>{blurSel(ev,dialog.form,'itemCode','commonDrugList')}" placeholder="请输入选择" clearable filterable :loading="loading" remote :remote-method="(query) => getDictRemote('commonDrugList', 'itemName', query)">
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

        <el-form-item label="单位" prop="itemUnit">
          <el-select v-model.trim="dialog.form.itemUnit" clearable filterable>
            <el-option v-for="(item,index) in dict.LIMIT_PRICE_UNIT" :key="index" :label="item.label" :value="item.value"></el-option>
          </el-select>
        </el-form-item>

        <el-form-item label="版本" prop="edition">
          <el-select v-model.trim="dialog.form.edition" clearable filterable>
            <el-option v-for="item in dict.EDITION" :key="item.value" :label="item.label" :value="item.value">
            </el-option>
          </el-select>
        </el-form-item>

        <el-form-item :label="kindo.dictionary.getLabel(dict.PRICE_GRADE,item.colLabel)" v-for="(item,index) in priceGrade" :key="index">
          <el-input-number v-model.trim="item.colValue" :min="0" :controls="false" placeholder="请输入"></el-input-number>
        </el-form-item>

        <el-form-item label="限价条件" prop="limitCondition">
          <el-select v-model.trim="dialog.form.limitCondition" clearable filterable>
            <el-option v-for="(item,index) in dict.LIMIT_PRICE_CONDITION" :key="index" :label="item.label" :value="item.value"></el-option>
          </el-select>
        </el-form-item>

        <!-- <el-form-item label="风险等级" prop="riskLevel">
          <el-select v-model.trim="dialog.form.riskLevel" size="mini" placeholder="请选择" clearable filterable>
            <el-option v-for="item in dict.RISK_LEVEL" :key="item.value" :label="item.label" :value="item.value">
            </el-option>
          </el-select>
        </el-form-item>

        <el-form-item label="规则依据" prop="regularBasis">
          <el-input type="textarea" :rows="2" placeholder="请输入内容" v-model.trim="dialog.form.regularBasis"></el-input>
        </el-form-item> -->

      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button icon="el-icon-check" type="primary" @click="saveData">保 存</el-button>
        <el-button icon="el-icon-close" type="primary" @click="dialog.visible = false">取 消</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import config from './config'
// 依赖于 table - 表格处理
import tableMixIn from '@src/utils/helper/tableMixIn.js'

export default {
  name: 'limitRule',
  mixins: [tableMixIn],
  data() {
    return {
      url: config.api.table,
      loading: false,

      search: {
        itemName: ''
      },

      // 数据字典
      dict: {
        AUDIT_STATUS: [], // 审核状态
        LIMIT_PRICE_UNIT: [], // 单位
        EDITION: [], // 版本
        PRICE_GRADE: [], // 等级划分
        STANDARD_PRICE: [], // 价格标准
        LIMIT_PRICE_CONDITION: [], // 限价条件
        RISK_LEVEL: [] // 风险等级
      },
      filtersDict: {
        // 审核状态
        AUDIT_STATUS: []
      },
      list: {
        commonDrugList: []
      },
      // 已选中表格数据
      selection: [],

      // 新增、编辑表单
      dialog: {
        visible: false,
        title: '新增',
        form: {
          itemCode: '',
          itemUnit: '',
          edition: '',
          priceGrade: [],
          limitCondition: '',
          riskLevel: '',
          regularBasis: ''
        }
      },
      priceGrade: [],
      // 表单校验规则
      formRules: {
        itemCode: [{ required: true, message: '请输入', trigger: 'blur' }],
        edition: [{ required: true, message: '请选择', trigger: 'blur' }],
        limitCondition: [{ required: true, message: '请选择', trigger: 'blur' }]
      }
    }
  },

  created() {
    // 获取数据字典
    this.getDict(this.dict, this.filtersDict)
  },

  mounted() {
    this.$nextTick(() => {
      this.get('table')
    })
  },

  watch: {
    'dict.PRICE_GRADE': {
      handler(val) {
        this.initPriceGrade(val)
      },
      immediate: true,
      deep: true
    }
  },

  methods: {

    returnPriceGrade(code, list) {
      if (list && list.length) {
        for (let i = 0; i < list.length; i++) {
          if (code === list[i].colLabel) {
            return list[i].colValue
          }
        }
      } else {
        return undefined
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

    // 新增/编辑
    openDialog(name, row) {
      this.dialog.visible = true
      this.initPriceGrade(this.dict.PRICE_GRADE)
      this.$nextTick(() => {
        this.$refs.form.resetFields()
        if (name === 'add') {
          this.dialog.title = '新增'
          this.dialog.form = this.$options.data.call(this).dialog.form
        } else if (name === 'edit') {
          this.dialog.title = '编辑'
          this.dialog.form = Object.assign({}, row)
          if (row.priceGrade && row.priceGrade.length) {
            this.setPriceGrade(this.priceGrade, row.priceGrade)
          }
        }
      })
    },

    // 初始化等级划分数据
    initPriceGrade(data) {
      this.priceGrade = data.map(item => {
        return {
          colLabel: item.value,
          colValue: undefined
        }
      })
    },

    // 遍历存储等级划分已填数据
    setPriceGrade(arr1, arr2) {
      for (let i = 0; i < arr1.length; i++) {
        for (let j = 0; j < arr2.length; j++) {
          if (arr1[i].colLabel === arr2[j].colLabel) {
            arr1[i].colValue = arr2[j].colValue ? arr2[j].colValue : undefined
          }
        }
      }
    },

    // 保存
    saveData() {
      this.$refs.form.validate(valid => {
        if (valid) {
          let requestType = 'post'
          if (this.dialog.form.id) {
            requestType = 'put'
          }
          this.$http[requestType](this.url, Object.assign({}, this.dialog.form, { priceGrade: this.priceGrade })).then(res => {
            kindo.util.alert(res.message, '提示', 'success')
            this.dialog.visible = false
            this.get('table')
          })
        }
      })
    }
  }
}
</script>
