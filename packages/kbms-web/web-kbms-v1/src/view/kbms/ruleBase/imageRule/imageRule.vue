/* @Author: wuhuihui
 * 菜单：影像超声收费限定规则
 */

<template>
  <div>
    <kindo-box title="查询条件" icon="xx">
      <el-form :model="search" label-position="right" onsubmit="return false;" inline
        @keyup.enter.prevent.native="get('table')">
        <el-form-item label="诊疗项目">
          <el-input v-model.trim="search.itemNameB" placeholder="请输入关键字" clearable></el-input>
        </el-form-item>
        <el-form-item label="公式">
          <el-select v-model.trim="search.formula" clearable>
            <el-option v-for="(item, index) in dict.DICT_FORMULA" :key="index" :value="item.value" :label="item.label">
            </el-option>
          </el-select>
        </el-form-item>
      </el-form>
      <div slot="control">
        <el-button icon="el-icon-search" type="primary" @click="get('table')">查询</el-button>
      </div>
    </kindo-box>
    <kindo-box title="影像超声收费限定规则">
      <kindo-table ref="table" :url="url" :queryParam="search"
        @selection-change="(selection) => selectionChange(selection, 'selection')"
        @filter-change="(filters) => filterChange(filters, 'table', 'search')">
        <el-table-column type="selection" fixed="left" width="30"></el-table-column>
        <el-table-column label="项目编码" prop="itemCodeB" width="130" header-align="center" sortable='custom'
          show-overflow-tooltip></el-table-column>
        <el-table-column label="项目名称" prop="itemNameB" min-width="150" header-align="center" sortable='custom'
          show-overflow-tooltip></el-table-column>
        <el-table-column label="单位" prop="itemUnitNameB" width="150" header-align="center" show-overflow-tooltip>
        </el-table-column>
        <el-table-column label="价格(县级)" prop="itemPriceA" width="120" :formatter="(r,c,v) => kindo.util.formatNum(v,2)"
          header-align="center" align="right" sortable='custom' show-overflow-tooltip></el-table-column>
        <el-table-column label="价格(非公立)" prop="itemPriceB" width="126" :formatter="(r,c,v) => kindo.util.formatNum(v,2)"
          header-align="center" align="right" sortable='custom' show-overflow-tooltip></el-table-column>
        <el-table-column label="限定公式" prop="formula" width="90"
          :formatter="(r,c,v) => kindo.dictionary.getLabel(dict.DICT_FORMULA, v)" align="center" show-overflow-tooltip>
        </el-table-column>
        <el-table-column label="审核状态" prop="status" width="100" align="center" columnKey='status'
          :filters="filtersDict.AUDIT_STATUS" :filter-method="filterHandler" :filter-multiple="false"
          filter-placement="bottom-end">
          <template slot-scope="scope">
            <el-tag :type="scope.row.status === '1'?'success':'info'" close-transition>
              {{kindo.dictionary.getLabel(dict.AUDIT_STATUS,scope.row.status)}}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" align="center" fixed="right">
          <template slot-scope="scope">
            <el-tooltip class="item" effect="dark" :open-delay="300" content="编辑" placement="top-start">
              <el-button type="text" icon="el-icon-edit" @click="edit(scope.row, 'form', 'table', 'visible')">
              </el-button>
            </el-tooltip>
            <el-tooltip class="item" effect="dark" :open-delay="300" content="删除" placement="top-start">
              <el-button type="text" icon="el-icon-delete" @click="deleteOne(scope.row.id, 'table')"></el-button>
            </el-tooltip>
          </template>
        </el-table-column>
      </kindo-table>
      <div slot="control">
        <el-button icon="el-icon-plus" type="text" @click="insert('visible', 'form')">新增</el-button>
        <el-button icon="el-icon-delete" type="text" @click="batch('selection', 'table', 'delete')">删除</el-button>
        <el-button icon="el-icon-view" type="text" @click="batch('selection', 'table', 'audit')">审核</el-button>
      </div>
    </kindo-box>
    <el-dialog v-drag top="0" :visible.sync="visible" :title="(form.id?'编辑':'新增') +'诊疗项目'" width="380px"
      :modal-append-to-body="false" :close-on-click-modal="false">
      <el-form :model="form" :rules="formRules" class="box" onsubmit="return false;" label-width="90px" ref="form">
        <el-form-item label="诊疗项目" prop="itemCodeB">
          <el-select v-model.trim="form.itemCodeB" :disabled="form.id !== ''" size="mini"
            @blur="(ev)=>{blurSel(ev,form,'itemCodeB','commonDrugListB')}" placeholder="请输入选择" clearable filterable
            :loading="loading" remote :remote-method="(query) => getDictRemote('commonDrugListB', 'itemName', query)">
            <li class="title">
              <span>代码值</span>
              <span>代码标题</span>
            </li>
            <li class="tip">
              <span>
                &lt;请选择&gt;
              </span>
            </li>
            <el-option v-for="item in list.commonDrugListB" :key="item.value" :label="item.label" :value="item.value">
              <span>{{ item.value }}</span>
              <span>{{ item.label }}</span>
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="价格(县级)" prop="itemPriceA">
          <el-input-number v-model="form.itemPriceA" :precision="2" :max="990000" :controls="false"></el-input-number>
        </el-form-item>
        <el-form-item label="价格(非公立)" prop="itemPriceB">
          <el-input-number v-model="form.itemPriceB" :precision="2" :max="990000" :controls="false"></el-input-number>
        </el-form-item>
        <el-form-item label="公式">
          <el-select v-model.trim="form.formula" clearable>
            <el-option v-for="(item, index) in dict.DICT_FORMULA" :key="index" :value="item.value" :label="item.label">
            </el-option>
          </el-select>
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button icon="el-icon-check" type="primary" @click="save('form','table','visible')">完 成</el-button>
        <el-button icon="el-icon-close" type="primary" @click="visible = false">取 消</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import config from './config'
// 依赖于 table - 表格处理
import tableMixIn from '@src/utils/helper/tableMixIn.js'

export default {
  name: 'imageRule',
  mixins: [tableMixIn],
  data() {
    return {
      url: config.api.table,
      loading: false,
      // 查询实体
      search: {
        itemNameB: '',
        formula: ''
      },

      // 数据字典
      dict: {
        // 审核状态
        AUDIT_STATUS: [],
        // 公式
        DICT_FORMULA: []
      },
      filtersDict: {
        // 审核状态
        AUDIT_STATUS: []
      },
      list: {
        commonDrugListB: []
      },
      // 已选中表格数据
      selection: [],

      // 编辑、新增弹窗显示
      visible: false,
      // 新增、编辑表单
      form: {
        id: '',
        itemCodeB: '',
        itemPriceA: undefined,
        itemPriceB: undefined,
        formula: ''
      },

      // 表单校验规则
      formRules: {
        itemCodeB: [{ required: true, message: '请输入名称', trigger: 'blur' }],
        formula: [{ required: true, message: '请选择', trigger: 'blur' }]
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
    insert(visible, form) {
      kindo.util
        .promise(() => {
          this[visible] = true
        })
        .then(() => {
          this.$refs[form].resetFields()
          this.form.id = ''
        })
        .then(() => {
          this.list.commonDrugListB = []
          this[form] = Object.assign(this[form], this['_' + form])
        })
    },
    /*
       * 表格编辑方法
       * row       ->   当前行的数据
       * form      ->   编辑操作的表单实体对象,form要和ref值一致
       * table     ->   进行编辑操作的表格refs属性值
       * visible   ->   编辑弹框是否显示变量
       */
    edit(row, form, table, visible) {
      kindo.util
        .promise(() => {
          this[visible] = true
        })
        .then(() => {
          // 初始化，去除校验提示并清空实体
          this.$refs[form].resetFields()
        })
        .then(() => {
          for (var key in row) {
            if (this[form].hasOwnProperty(key) === true) {
              this[form][key] = row[key]
            }
          }
          this.list.commonDrugListB = [{ value: row.itemCodeB, label: row.itemNameB }]
        })
    }
  }
}
</script>
