/* @Author: lilizhou
 * 菜单：自有医保药品目录
 */

<template>
  <div>
    <kindo-box title="查询条件" icon="xx">
      <el-form :model="search" label-position="right" onsubmit="return false;" inline @keyup.enter.prevent.native="get('table')">
        <el-form-item label="药品名称">
          <el-input v-model.trim="search.hcGenericName" clearable></el-input>
        </el-form-item>
        <el-form-item label="大剂型">
          <el-input v-model.trim="search.labelFormName" clearable></el-input>
        </el-form-item>
        <el-form-item label="小剂型">
          <el-input v-model.trim="search.actualFormName" clearable></el-input>
        </el-form-item>
      </el-form>
      <div slot="control">
        <el-button icon="el-icon-search" type="primary" @click="get('table')">查询</el-button>
      </div>
    </kindo-box>
    <kindo-box title="自有医保药品目录信息">
      <kindo-table ref="table" :url="url" :queryParam="search" @selection-change="(selection) => selectionChange(selection, 'selection')" @filter-change="(filters) => filterChange(filters, 'table', 'search')">
        <el-table-column type="selection" fixed="left" width="30"></el-table-column>
        <el-table-column label="药品编码" fixed="left" prop="hcDrugCode" width="140" header-align="center" sortable='custom' show-overflow-tooltip></el-table-column>
        <el-table-column label="药品名称" fixed="left" prop="hcGenericName" min-width="140" header-align="center" sortable='custom' show-overflow-tooltip></el-table-column>
        <el-table-column label="药品种类" prop="drugKind" width="120" header-align="center" align="center" :formatter="(row) => kindo.dictionary.getLabel(dict.DRUG_KIND, row.drugKind)" show-overflow-tooltip></el-table-column>
        <el-table-column label="大剂型" prop="labelFormName" min-width="140" header-align="center" show-overflow-tooltip></el-table-column>
        <el-table-column label="小剂型" prop="actualFormName" min-width="140" header-align="center" show-overflow-tooltip></el-table-column>
        <el-table-column label="备注" prop="remark" min-width="120" header-align="center" show-overflow-tooltip></el-table-column>
        <el-table-column label="审核状态" prop="status" width="100" align="center" columnKey='status' :filters="filtersDict.AUDIT_STATUS" :filter-method="filterHandler" :filter-multiple="false" filter-placement="bottom-end">
          <template slot-scope="scope">
            <el-tag :type="scope.row.status === '1'?'success':'info'" close-transition>{{kindo.dictionary.getLabel(dict.AUDIT_STATUS,scope.row.status)}}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" align="center" fixed="right">
          <template slot-scope="scope">
            <el-tooltip class="item" effect="dark" :open-delay="300" content="编辑" placement="top-start">
              <el-button type="text" icon="el-icon-edit" @click="edit(scope.row, 'form', 'table', 'visible')"></el-button>
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
    <el-dialog v-drag top="0" :visible.sync="visible" :title="(form.id?'编辑':'新增') +'自有医保药品'" width="380px" :modal-append-to-body="false" :close-on-click-modal="false">
      <el-form :model="form" :rules="formRules" class="box" onsubmit="return false;" label-width="90px" ref="form">
        <el-form-item label="药品名称" prop="hcGenericName">
          <el-input v-model.trim="form.hcGenericName" clearable></el-input>
        </el-form-item>
        <el-form-item label="药品种类" prop="drugKind">
          <el-select v-model.trim="form.drugKind" clearable filterable placeholder="请选择(可输入搜索)">
            <el-option v-for="(item,index) in dict.DRUG_KIND" :key="index" :label="item.label" :value="item.value"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="大剂型">
          <el-input v-model.trim="form.labelFormName" disabled clearable></el-input>
        </el-form-item>
        <el-form-item label="小剂型" prop="actualFormCode">
          <el-select v-model.trim="form.actualFormCode" placeholder="请输入名称" clearable filterable @blur="(ev)=>{blurSel(ev,form,'actualFormCode','samllDosageList')}" :loading="loading" remote :remote-method="(query)=>{remoteMethod(query,'samllDosageList')}">
            <li class="title">
              <span>代码值</span>
              <span>代码标题</span>
            </li>
            <li class="tip">
              <span>
                &lt;请选择&gt;
              </span>
            </li>
            <el-option v-for="item in list.samllDosageList" :key="item.value" :label="item.label" :value="item.value">
              <span>{{ item.value }}</span>
              <span>{{ item.label }}</span>
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
  name: 'selfMedInsuraceCatelog',
  mixins: [tableMixIn],
  data() {
    return {
      url: config.api.table,
      loading: false,
      // 查询实体
      search: {
        hcGenericName: '',
        actualFormName: '',
        labelFormName: '',
        status: ''
      },

      // 数据字典
      dict: {
        // 审核状态
        AUDIT_STATUS: [],
        DRUG_KIND: []
      },
      filtersDict: {
        // 审核状态
        AUDIT_STATUS: []
      },
      list: {
        samllDosageList: [],
        bigDosageList: []
      },
      // 已选中表格数据
      selection: [],

      // 编辑、新增弹窗显示
      visible: false,
      // 新增、编辑表单
      form: {
        id: '',
        hcGenericName: '',
        drugKind: '',
        labelFormCode: '',
        labelFormName: '',
        actualFormCode: ''
      },

      // 表单校验规则
      formRules: {
        hcDrugCode: [{ required: true, message: '请输入药品编码', trigger: 'blur' }, { min: 0, max: 30, message: '长度不能超过30', trigger: 'blur' }],
        hcGenericName: [{ required: true, message: '请输入药品名称', trigger: 'blur' }, { min: 0, max: 30, message: '长度不能超过30', trigger: 'blur' }],
        drugKind: [{ required: true, message: '请输入药品种类', trigger: 'blur' }],
        labelFormCode: [{ required: true, message: '请输入药品种类', trigger: 'blur' }],
        actualFormCode: [{ required: true, message: '请输入药品种类', trigger: 'blur' }]
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
    // 剂型远程搜索
    remoteMethod(query, list) {
      if (query !== '') {
        this.loading = true
        if (this.timeout) {
          clearTimeout(this.timeout)
        }
        this.timeout = setTimeout(() => {
          let params = {}
          let url = ''
          if (list !== 'bigDosageList') {
            url = config.api.smallDogsage
            params = { actualFormName: query }
          } else {
            url = config.api.bigDogsage
            params = { labelFormName: query }
          }
          this.$http.get(url, { params: params }).then(res => {
            this.loading = false
            if (res.data.length > 0) {
              this.list[list] = res.data.map(item => {
                return { label: item.actualFormName, value: item.actualFormCode, bigVal: item.labelFormCode, bigLabel: item.labelFormName }
              })
            } else {
              this.list[list] = []
            }
          })
        }, 200)
      } else {
        this.list[list] = []
      }
    },
    insert(visible, form) {
      kindo.util
        .promise(() => {
          this[visible] = true
        })
        .then(() => {
          this.$refs[form].resetFields()
        })
        .then(() => {
          this.list.samllDosageList = []
          this.list.bigDosageList = []
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
          this.list.samllDosageList = [
            { value: row.actualFormCode, label: row.actualFormName, bigVal: row.labelFormCode, bigLabel: row.labelFormName }
          ]
          this.list.bigDosageList = [{ value: row.labelFormCode, label: row.labelFormName }]
        })
    }
  },
  watch: {
    'form.actualFormCode': function (val, oldVal) {
      if (val === '') {
        this.form.labelFormName = ''
        this.form.labelFormCode = ''
      } else {
        this.list.samllDosageList.map(item => {
          if (item.value === val) {
            this.form.labelFormName = item.bigLabel
            this.form.labelFormCode = item.bigVal
          }
        })
      }
    }
  }
}
</script>
