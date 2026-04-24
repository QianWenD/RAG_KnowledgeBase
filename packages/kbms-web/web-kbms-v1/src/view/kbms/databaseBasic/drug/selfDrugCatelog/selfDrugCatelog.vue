/*@Author: lilizhou
 * 菜单：药品目录
 */

<template>
  <div>
    <kindo-box title="查询条件" icon="xx">
      <el-form :model="search" label-position="right" onsubmit="return false;" inline @keyup.enter.prevent.native="get('table')">
        <el-form-item label="药品名称">
          <el-input v-model.trim="search.genericName" clearable></el-input>
        </el-form-item>
        <el-form-item label="剂型">
          <el-input v-model.trim="search.dosageName" clearable></el-input>
        </el-form-item>
      </el-form>
      <div slot="control">
        <el-button icon="el-icon-search" type="primary" @click="get('table')">查询</el-button>
      </div>
    </kindo-box>
    <kindo-box title="药品目录信息">
      <kindo-table ref="table" :url="url" :queryParam="search" @selection-change="(selection) => selectionChange(selection, 'selection')" @filter-change="(filters) => filterChange(filters, 'table', 'search')">
        <el-table-column type="selection" fixed="left" width="30"></el-table-column>
        <el-table-column label="药品编码" fixed="left" prop="drugCode" width="140" header-align="center" sortable='custom' show-overflow-tooltip></el-table-column>
        <el-table-column label="药品名称" fixed="left" prop="genericName" min-width="160" header-align="center" sortable='custom' show-overflow-tooltip></el-table-column>
        <el-table-column label="剂型" prop="dosageName" min-width="100" header-align="center" show-overflow-tooltip></el-table-column>
        <el-table-column label="单位(重量)" prop="weightValue" min-width="120" header-align="center" show-overflow-tooltip>
          <template slot-scope="scope">
            <span v-show="!kindo.validate.isEmpty(scope.row.weightValue) && scope.row.weightValue !== 0">
              {{scope.row.weightValue + kindo.dictionary.getLabel(list.weightUnit, scope.row.weightUnit)}}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="单位(剂量)" prop="dosageFormValue" min-width="120" header-align="center" show-overflow-tooltip>
          <template slot-scope="scope">
            <span v-show="!kindo.validate.isEmpty(scope.row.dosageFormValue) && scope.row.dosageFormValue !== 0">
              {{scope.row.dosageFormValue + kindo.dictionary.getLabel(list.otherUnit, scope.row.dosageFormUnit)}}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="最小封装单位" prop="minPackagingValue" min-width="120" header-align="center" show-overflow-tooltip>
          <template slot-scope="scope">
            <span v-show="!kindo.validate.isEmpty(scope.row.minPackagingValue) && scope.row.minPackagingValue !== 0">
              {{scope.row.minPackagingValue + kindo.dictionary.getLabel(list.minUnit, scope.row.minPackagingUnit)}}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="最大封装单位" prop="maxPackagingValue" min-width="120" header-align="center" show-overflow-tooltip>
          <template slot-scope="scope">
            <span v-show="!kindo.validate.isEmpty(scope.row.maxPackagingValue) && scope.row.maxPackagingValue !== 0">
              {{scope.row.maxPackagingValue + kindo.dictionary.getLabel(list.maxUnit, scope.row.maxPackagingUnit)}}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="审核状态" prop="status" width="100" align="center" columnKey='status' :filters="filtersDict.AUDIT_STATUS" :filter-method="filterHandler" :filter-multiple="false" filter-placement="bottom-end">
          <template slot-scope="scope">
            <el-tag :type="scope.row.status === '1'?'success':'info'" close-transition>{{kindo.dictionary.getLabel(dict.AUDIT_STATUS,scope.row.status)}}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="推送状态" prop="pushStatus" width="100" align="center" sortable>
          <template slot-scope="scope">
            <el-tag :type="scope.row.pushStatus === '1'?'success':'info'" close-transition>{{scope.row.pushStatus=== '1'?'已推送':scope.row.pushStatus=== '0'?'未推送': ''}}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" align="center">
          <template slot-scope="scope">
            <el-tooltip class="item" effect="dark" :open-delay="300" content="编辑" placement="top-start">
              <el-button type="text" icon="el-icon-edit" @click="edit(scope.row, 'form', editUrl, 'visible')"></el-button>
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
        <el-button icon="el-icon-d-arrow-right" type="text" @click="push">推送</el-button>
      </div>
    </kindo-box>
    <el-dialog v-drag top="0" :visible.sync="visible" :title="(form.id?'编辑':'新增') +'自有药品'" :modal-append-to-body="false" :close-on-click-modal="false">
      <el-form :model="form" :rules="formRules" onsubmit="return false;" label-width="110px" ref="form">
        <el-form-item label="药品名称" prop="genericName" class="box">
          <el-input v-model.trim="form.genericName" clearable></el-input>
        </el-form-item>
        <el-form-item label="药品种类" prop="drugKind" class="box">
          <el-select v-model.trim="form.drugKind" clearable filterable placeholder="请选择(可输入搜索)">
            <el-option v-for="(item,index) in dict.DRUG_KIND" :key="index" :label="item.label" :value="item.value"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="剂型" prop="dosageCode" class="box">
          <el-select v-model.trim="form.dosageCode" placeholder="请输入名称" clearable filterable :loading="loading" @blur="(ev)=>{blurSel(ev,form,'dosageCode','dosageList')}" remote :remote-method="remoteMethod">
            <li class="title">
              <span>代码值</span>
              <span>代码标题</span>
            </li>
            <li class="tip">
              <span>
                &lt;请选择&gt;
              </span>
            </li>
            <el-option v-for="item in list.dosageList" :key="item.value" :label="item.label" :value="item.value">
              <span>{{ item.value }}</span>
              <span>{{ item.label }}</span>
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="单位(重量)" prop="weightValue">
          <el-row>
            <el-col :span="12">
              <el-input-number v-model.trim="form.weightValue" size="mini" :controls="false" :min="0" :max="1000" :disabled="Isdisabled"></el-input-number>
            </el-col>
            <el-col :span="12">
              <el-select v-model.trim="form.weightUnit" clearable filterable :disabled="Isdisabled">
                <el-option v-for="(item,index) in list.weightUnit" :key="index" :label="item.label" :value="item.value"></el-option>
              </el-select>
            </el-col>
          </el-row>
        </el-form-item>
        <el-form-item label="单位(剂量)" prop="dosageFormValue">
          <el-row>
            <el-col :span="12">
              <el-input-number v-model.trim="form.dosageFormValue" size="mini" :min="0" :max="1000" :disabled="Isdisabled"></el-input-number>
            </el-col>
            <el-col :span="12">
              <el-select v-model.trim="form.dosageFormUnit" clearable filterable :disabled="Isdisabled">
                <el-option v-for="(item,index) in list.otherUnit" :key="index" :label="item.label" :value="item.value"></el-option>
              </el-select>
            </el-col>
          </el-row>
        </el-form-item>
        <el-form-item label="最小封装单位" prop="minPackagingValue">
          <el-row>
            <el-col :span="12">
              <el-input-number v-model.trim="form.minPackagingValue" size="mini" :controls="false" :min="0" :max="1000" :disabled="Isdisabled"></el-input-number>
            </el-col>
            <el-col :span="12">
              <el-select v-model.trim="form.minPackagingUnit" clearable filterable :disabled="Isdisabled">
                <el-option v-for="(item,index) in list.minUnit" :key="index" :label="item.label" :value="item.value"></el-option>
              </el-select>
            </el-col>
          </el-row>
        </el-form-item>
        <el-form-item label="最大封装单位" prop="maxPackagingValue">
          <el-row>
            <el-col :span="12">
              <el-input-number v-model.trim="form.maxPackagingValue" size="mini" :controls="false" :min="0" :max="1000" :disabled="Isdisabled"></el-input-number>
            </el-col>
            <el-col :span="12">
              <el-select v-model.trim="form.maxPackagingUnit" clearable filterable :disabled="Isdisabled">
                <el-option v-for="(item,index) in list.maxUnit" :key="index" :label="item.label" :value="item.value"></el-option>
              </el-select>
            </el-col>
          </el-row>
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
  name: 'selfDrugCatelog',
  mixins: [tableMixIn],
  data() {
    return {
      url: config.api.table,
      editUrl: config.api.editQuery,
      loading: true,
      Isdisabled: false,
      // 查询实体
      search: {
        genericName: '',
        dosageName: '',
        status: ''
      },
      list: {
        // 查询重量单位的接口
        weightUnit: [],
        otherUnit: [],
        minUnit: [],
        maxUnit: [],
        dosageList: []
      },
      // 数据字典
      dict: {
        AUDIT_STATUS: [],
        DRUG_KIND: []
      },
      filtersDict: {
        AUDIT_STATUS: []
      },

      // 已选中表格数据
      selection: [],

      // 编辑、新增弹窗显示
      visible: false,
      // 新增、编辑表单
      form: {
        id: '',
        // drugCode: '',
        genericName: '',
        dosageCode: '',
        weightValue: 0,
        weightUnit: '',
        dosageFormValue: '',
        dosageFormUnit: '',
        minPackagingValue: '',
        minPackagingUnit: '',
        maxPackagingValue: '',
        maxPackagingUnit: '',
        drugKind: ''
      },

      // 表单校验规则
      formRules: {
        drugCode: [{ min: 0, max: 30, message: '长度不能超过30', trigger: 'blur' }],
        genericName: [{ required: true, message: '请输入', trigger: 'blur' }, { min: 0, max: 30, message: '长度不能超过30' }],
        dosageCode: [],
        weightValue: [{ min: 0, type: 'number', trigger: 'blur' }],
        dosageFormValue: [{ min: 0, type: 'number', trigger: 'blur' }],
        minPackagingValue: [{ min: 0, type: 'number', trigger: 'blur' }],
        maxPackagingValue: [{ min: 0, type: 'number', trigger: 'blur' }],
        drugKind: [{ required: true, message: '请输入', trigger: 'blur' }, { min: 0, trigger: 'blur' }]
      }
    }
  },

  created() {
    this._form = Object.assign({}, this.form)
    // 获取数据字典
    this.getDict(this.dict, this.filtersDict)
    // 获取所有的重量的单位
    this.$http.get(config.api.listForCombo, { params: { type: 1 } }).then(res => {
      this.list.weightUnit = res.data
    })
    // 获取除了重量以外的其他单位
    this.$http.get(config.api.listForCombo, { params: { type: 0 } }).then(res => {
      this.list.otherUnit = res.data
    })
    // 获取最小封装单位
    this.$http.get(config.api.listForCombo, { params: { type: 9 } }).then(res => {
      this.list.minUnit = res.data
    })
    // 获取最大封装单位
    this.$http.get(config.api.listForCombo, { params: { type: 10 } }).then(res => {
      this.list.maxUnit = res.data
    })
  },

  mounted() {
    this.$nextTick(() => {
      this.get('table')
    })
  },

  methods: {
    // 小剂型远程搜索
    remoteMethod(query) {
      if (query !== '') {
        this.loading = true
        if (this.timeout) {
          clearTimeout(this.timeout)
        }
        this.timeout = setTimeout(() => {
          this.$http.get(config.api.blurQuery, { params: { actualFormName: query } }).then(res => {
            this.loading = false
            if (res.data.length > 0) {
              this.list.dosageList = res.data.map(item => {
                return { label: item.actualFormName, value: item.actualFormCode }
              })
            } else {
              this.list.dosageList = []
            }
          })
        }, 200)
      } else {
        this.list.dosageList = []
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
          this.list.dosageList = []
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
          let self = this
          self.form.drugKind = row.drugKind
          setTimeout(function () {
            for (let key in row) {
              if (self[form].hasOwnProperty(key) === true) {
                if (key !== 'drugKind') {
                  self[form][key] = row[key]
                }
              }
            }
          }, 100)
          self.list.dosageList = [{ value: row.dosageCode, label: row.dosageName }]
        })
    },
    /*
  * 保存
  * form      ->   要保存数据的表单实体对象
  * table     ->   要保存数据的表格refs属性值
  * visible   ->   要保存数据的弹框是否显示变量
  */
    save(form, table, visible) {
      this.$refs[form].validate(valid => {
        let mainUrl = this.$refs[table].url
        let requestType = 'post'
        // 若有id则为编辑保存
        if (this[form].id) {
          requestType = 'put'
        }
        this.$http[requestType](mainUrl, this[form]).then(res => {
          kindo.util.alert(res.message, '提示', 'success')
          this[visible] = false
          this.get(table)
        })
      })
    },

    // 推送
    push() {
      if (this.selection.length > 0) {
        kindo.util.confirm('请确定是否推送 ', undefined, undefined, () => {
          let ids = this.selection.map(item => { return { id: item.id } })
          this.$http.put(config.api.push, ids).then(res => {
            kindo.util.alert(res.message, '提示', 'success')
            this.get('table')
          })
        })
      } else {
        kindo.util.alert('请至少勾选一条数据', '提示', 'warning')
      }
    }
    // 验证单位是否输入
    // valiUnit() {
    //   if (this.form.weightUnit === '') {
    //     kindo.util.alert('请选择重量单位', undefined, 'warning')
    //     return false
    //   } else if (this.form.dosageFormUnit === '') {
    //     kindo.util.alert('请选择剂量单位', undefined, 'warning')
    //     return false
    //   } else if (this.form.minPackagingUnit === '') {
    //     kindo.util.alert('请选择最小封装的单位', undefined, 'warning')
    //     return false
    //   } else if (this.form.maxPackagingUnit === '') {
    //     kindo.util.alert('请选择最大封装的单位', undefined, 'warning')
    //     return false
    //   } else {
    //     return true
    //   }
    // }
  },
  watch: {
    'form.dosageCode': function (val, oldVal) {
      if (val === '') {
        this.dosageList = []
      }
    },
    'form.drugKind': function (val) {
      if (val === '2') {
        this.Isdisabled = true
      } else {
        this.Isdisabled = false
      }
      if (val) {
        this.form.weightValue = 0
        this.form.dosageFormValue = ''
        this.form.minPackagingValue = ''
        this.form.maxPackagingValue = ''
        this.form.weightUnit = ''
        this.form.dosageFormUnit = ''
        this.form.minPackagingUnit = ''
        this.form.maxPackagingUnit = ''
        this.form.dosageCode = ''
      }
    }
  }
}
</script>
