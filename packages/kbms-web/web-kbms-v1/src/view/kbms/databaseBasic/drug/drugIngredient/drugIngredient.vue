/*
 * @Author: wuhuihui
 * @Date: 2018-03-18 17:53:51 
 * @Last Modified by: wuhuihui
 * @Last Modified time: 2018-06-29 16:09:14
 * 菜单：合理用药规则
 * 遗留问题：
 * 1、导入、导出未做
 * 2、排序报错
 */

<template>
  <div>
    <kindo-box title="查询条件" icon="xx">
      <el-form :model="search" label-position="right" onsubmit="return false;" inline @keyup.enter.prevent.native="get('table')">
        <el-form-item label="药品名称">
          <el-input v-model.trim="search.genericName" placeholder="" clearable></el-input>
        </el-form-item>
        <el-form-item label="剂型">
          <el-input v-model.trim="search.dosageName" placeholder="" clearable></el-input>
        </el-form-item>
      </el-form>
      <div slot="control">
        <el-button icon="el-icon-search" type="primary" @click="get('table')">查询</el-button>
      </div>
    </kindo-box>
    <kindo-box title="药品信息">
      <kindo-table ref="table" :url="url" :queryParam="search" :pageSize="5" height="218px" :extend-option="extendOption" @selection-change="(selection) => selectionChange(selection, 'selection')" @filter-change="(filters) => filterChange(filters, 'table', 'search')" @current-change="rowClick">
        <el-table-column type="selection" fixed="left" width="30"></el-table-column>
        <el-table-column label="药品编码" fixed="left" prop="drugCode" min-width="100" header-align="center" sortable='custom' show-overflow-tooltip></el-table-column>
        <el-table-column label="药品名称" fixed="left" prop="genericName" min-width="120" header-align="center" sortable='custom' show-overflow-tooltip>
          <template slot-scope="scope">
            <p style="cursor: pointer;" @click="genericTable(scope.row.id)">
              <el-tag type="'primary'" close-transition>{{scope.row.genericName}}</el-tag>
            </p>
          </template>
        </el-table-column>
        <el-table-column label="规格(单位1)" prop="weightValue" width="120" header-align="center" show-overflow-tooltip>
          <template slot-scope="scope">
            {{getValUnit(scope.row.weightValue,scope.row.weightUnit,list.weightUnit)}}
          </template>
        </el-table-column>
        <el-table-column label="规格(单位2)" prop="dosageFormValue" width="120" header-align="center" show-overflow-tooltip>
          <template slot-scope="scope">
            {{getValUnit(scope.row.dosageFormValue,scope.row.dosageFormUnit,list.otherUnit)}}
          </template>
        </el-table-column>
        <el-table-column label="规格(最小封装)" prop="minPackagingValue" width="120" header-align="center" show-overflow-tooltip>
          <template slot-scope="scope">
            {{getValUnit(scope.row.minPackagingValue,scope.row.minPackagingUnit,list.otherUnit)}}
          </template>
        </el-table-column>
        <el-table-column label="规格(最大封装)" prop="maxPackagingValue" width="120" header-align="center" show-overflow-tooltip>
          <template slot-scope="scope">
            {{getValUnit(scope.row.maxPackagingValue,scope.row.maxPackagingUnit,list.otherUnit)}}
          </template>
        </el-table-column>
        <el-table-column label="小剂型" prop="dosageName" width="100" header-align="center" sortable='custom' show-overflow-tooltip></el-table-column>
      </kindo-table>
      <div slot="control">
        <!-- <el-button icon="el-icon-k-sys-add" type="primary" @click="tableInsert">新增</el-button> -->
        <!-- <el-button icon="el-icon-delete" type="primary" @click="batch('selection', 'table', 'delete')">删除</el-button> -->
        <!-- <el-button icon="el-icon-view" type="primary" @click="batch('selection', 'table', 'audit')">审核</el-button> -->
        <!-- <el-button icon="el-icon-k-sys-import" type="primary" @click="importData">导入</el-button> -->
        <!-- <el-button icon="el-icon-k-sys-export" type="primary" @click="exportData">导出</el-button> -->
      </div>
    </kindo-box>

    <!-- 主表弹框 -->
    <el-dialog v-drag top="0" :visible.sync="drugInfoVisible" title="医院药品信息" :modal-append-to-body="false" :close-on-click-modal="false" width="60%">
      <el-form v-model.trim="drugSearch" onsubmit="return false;" label-position="right" inline @keyup.enter.prevent.native="getTable('generic')">
        <el-form-item label="医疗机构">
          <el-input v-model.trim="drugSearch.hospitalName" placeholder="" clearable></el-input>
        </el-form-item>
        <el-form-item label="">
          <el-button icon="el-icon-search" type="primary" @click="getTable('generic')">查询</el-button>
        </el-form-item>
      </el-form>
      <kindo-box title="表格信息">
        <kindo-table ref="generic" :url="generic.url" :queryParam="drugSearch" :pageSize="5">
          <el-table-column label="医疗机构名称" prop="hospitalName" min-width="120" header-align="center" sortable='custom'></el-table-column>
          <el-table-column label="医院药品编码" prop="hospitalCode" min-width="120" header-align="center" sortable='custom'></el-table-column>
          <el-table-column label="剂型" prop="dosageForm" min-width="120" header-align="center" sortable='custom'></el-table-column>
          <el-table-column label="规格" prop="spec" min-width="120" header-align="center" sortable='custom'></el-table-column>
          <el-table-column label="生产厂家" prop="manufacturer" min-width="120" header-align="center" sortable='custom'></el-table-column>
        </kindo-table>
      </kindo-box>
      <div slot="footer" class="dialog-footer">
        <el-button @click="drugInfoVisible= false" icon="el-icon-close" type="primary">关 闭</el-button>
      </div>
    </el-dialog>

    <!-- 主表弹框 -->
    <kindo-box :title="childTitle">
      <kindo-table ref="child" style="margin-top:-26px;" :url="childUrl" :queryParam="childSearch" :pageSize="5" height="218px" @selection-change="(selection) => selectionChange(selection,'childSelection')">
        <el-table-column type="selection" fixed="left" width="30"></el-table-column>
        <el-table-column label="主要成分" prop="ingredient" min-width="100" header-align="center" show-overflow-tooltip></el-table-column>
        <el-table-column label="操作" width="120" align="center" fixed="right">
          <template slot-scope="scope">
            <el-tooltip class="item" effect="dark" :open-delay="300" content="编辑" placement="top-start">
              <el-button type="text" icon="el-icon-edit" @click="editOne(scope.row, 'childForm','childVisible')"></el-button>
            </el-tooltip>
            <el-tooltip class="item" effect="dark" :open-delay="300" content="删除" placement="top-start">
              <el-button type="text" icon="el-icon-delete" @click="deleteOne(scope.$index, scope.row, 'child')"></el-button>
            </el-tooltip>
          </template>
        </el-table-column>
      </kindo-table>
      <div slot="control">
        <el-button icon="el-icon-search" :disabled="isDisabled" type="text" @click="get('child')">查询</el-button>
        <el-button icon="el-icon-k-sys-add" :disabled="isDisabled" type="text" @click="childTableInsert">新增</el-button>
        <el-button icon="el-icon-delete" :disabled="isDisabled" type="text" @click="batch('childSelection', 'child', 'delete')">删除</el-button>
        <!-- <el-button icon="el-icon-view" :disabled="isDisabled" type="text" @click="batch('childSelection', 'child', 'audit')">审核</el-button> -->
        <!-- <el-button icon="el-icon-k-sys-import" :disabled="isDisabled" type="text" @click="importData">导入</el-button> -->
        <!-- <el-button icon="el-icon-k-sys-export" :disabled="isDisabled" type="text" @click="exportData">导出</el-button>  -->
      </div>
    </kindo-box>

    <el-dialog v-drag top="0" :visible.sync="childVisible" :title="(childForm.id?'编辑':'新增') +'主要药品成分'" :modal-append-to-body="false" :close-on-click-modal="false">
      <el-form :model="childForm" ref="childForm" onsubmit="return false;" label-width="90px" :rules="childFormRules">
        <el-form-item label="主要成分" prop="ingredient">
          <el-input type="textarea" :rows="2" placeholder="请输入内容" v-model.trim="childForm.ingredient">
          </el-input>
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button icon="el-icon-check" type="primary" @click="save('childForm', 'child', 'childVisible')">完 成</el-button>
        <el-button icon="el-icon-close" type="primary" @click="childVisible = false">取 消</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import config from './config'
// 依赖于 table - 表格处理
import tableMixIn from '@src/utils/helper/tableMixIn.js'

export default {
  name: 'drugIngredient',
  mixins: [tableMixIn],
  data() {
    return {
      loading: false,
      timeout: null,
      // 下拉列表项目
      list: {
        // 查询重量单位的接口
        weightUnit: [],
        otherUnit: [],
        dosageList: []
      },
      // 药品弹出框
      drugInfoVisible: false,
      drugSearch: {
        drugId: '',
        hospitalName: ''
      },
      generic: {
        url: config.api.generic
      },
      // 父表url
      url: config.api.parent,
      // 子表url
      childUrl: config.api.child,
      // 说明书表url
      instructionsUrl: config.api.instructions,

      // 查询实体
      search: {
        genericName: '',
        dosageName: ''
      },
      // 表格属性
      // 表格默认排序
      tableSort: {
        prop: 'drugCode',
        order: 'descending'
      },
      // 表扩展序号，默认选中第一行
      extendOption: {
        selectedFirst: true
      },
      // 已选中表格数据
      selection: [],

      // 数据字典
      dict: {
        // 审核状态
        AUDIT_STATUS: [],
        // 收费类别字典
        CHARGE_CATEGORY: [],
        // 收费项目等级字典
        CHARGE_LEVEL: []
      },
      // 表内筛选数据源
      filtersDict: {
        // 筛选审核状态数组
        AUDIT_STATUS: []
      },

      // 上表新增弹窗
      visible: false,
      // 搜索已审核的耗材说明书
      instructionsSearch: {
        instructionsCode: ''
      },
      formRules: {
        instructionsCode: [{ required: true, message: '请选择', trigger: 'blur' }],
        itemCode: [{ required: true, message: '请选择', trigger: 'blur' }]
      },

      // 下表查询实体
      childSearch: {
        drugCode: ''
      },
      childTitle: '',
      // 下表功能按钮可否使用
      isDisabled: true,

      // 子表表格属性
      // 子表已选中表格数据
      childSelection: [],
      childFormRules: {
        ingredient: [{ required: true, message: '请输入', trigger: 'blur' }, { min: 0, max: 30, message: '长度不能超过30', trigger: 'blur' }]
      },
      // 下表编辑、新增表单相关 start //
      // 编辑、新增弹窗显示
      childVisible: false,
      childForm: {
        id: '',
        drugCode: '',
        ingredient: ''
      }
    }
  },
  created() {
    this._childForm = Object.assign({}, this.childForm)
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
  },

  mounted() {
    this.$nextTick(() => {
      this.get('table')
    })
  },

  methods: {
    // 上表选中一行时触发
    rowClick(row) {
      if (row) {
        this.childSearch.drugCode = row.drugCode
        this.childForm.drugCode = row.drugCode
        setTimeout(() => {
          this.get('child')
        }, 0)
      }
    },

    // 获取表格数据
    get(tableName) {
      if (!this.childSearch.drugCode && tableName === 'child') {
        return ''
      }
      this.$refs[tableName].reloadData().then(res => {
        if (tableName === 'table' && res.data) {
          if (res.data.total > 0) {
            this.isDisabled = false
            this.childTitle = res.data.rows[0].genericName + '-的主要成分表格信息'
            if (!kindo.validate.isEmpty(this.$refs[tableName])) {
              this.$refs[tableName].setCurrentRow(res.data.rows[0])
            }
          } else {
            this.childSearch.drugCode = ''
            this.isDisabled = true
            this.$refs.child.clearTable()
          }
        }
      })
    },
    // 查询药品弹出框的表格
    getTable(table) {
      this.$refs[table].reloadData()
    },
    // 点击药品名称的时候
    genericTable(id) {
      kindo.util
        .promise(() => {
          this.drugInfoVisible = true
          this.drugSearch.drugId = id
          this.drugSearch.hospitalName = ''
        })
        .then(() => {
          this.getTable('generic')
        })
    },
    // 子表新增
    childTableInsert() {
      this.list = []
      kindo.util
        .promise(() => {
          this.childVisible = true
        })
        .then(() => {
          this.$refs.childForm.resetFields()
        })
        .then(() => {
          for (let key in this.childForm) {
            if (key !== 'drugCode') {
              this.childForm[key] = this._childForm[key]
            }
          }
        })
    },

    // 上表新增
    tableInsert() {
      kindo.util
        .promise(() => {
          this.visible = true
        })
        .then(() => {
          this.getTable('instructionsTable')
        })
    },
    // 点击编辑的时候
    editOne(row, form, visible) {
      kindo.util
        .promise(() => {
          this[visible] = true
        })
        .then(() => {
          this.$refs[form].resetFields()
        })
        .then(() => {
          for (let key in this[form]) {
            this[form][key] = row[key]
          }
        })
    },
    // 删除
    deleteOne(index, row, api) {
      let mainUrl = ''
      if (api === 'child') {
        mainUrl = config.api.child
      } else {
        mainUrl = config.api.parent
      }
      let params = { data: { ids: [row.id] } }
      kindo.util.confirm('请确定删除', undefined, undefined, () => {
        this.$http.delete(mainUrl, params).then(res => {
          kindo.util.alert(res.message, '提示', 'success')
          this.get(api)
        })
      })
    },

    // 保存
    save(form, api, visible) {
      this.$refs[form].validate(valid => {
        if (valid) {
          let mainUrl = ''
          let method = 'post'
          if (api === 'child') {
            mainUrl = config.api.child
          } else {
            mainUrl = config.api.parent
          }
          if (this[form].id) {
            method = 'put'
          }
          // 新增保存
          this.$http[method](mainUrl, this[form]).then(res => {
            kindo.util.alert(res.message, '提示', 'success')
            this[visible] = false
            this.get(api)
          })
        }
      })
    },
    // 根据提供的数组和单位返回应有的值
    getValUnit(val, unit, list) {
      if (kindo.validate.isEmpty(val)) {
        return ''
      } else if (!kindo.validate.isEmpty(unit)) {
        return val + kindo.dictionary.getLabel(list, unit)
      }
    },
    // 批量操作
    batch(selection, api, proType) {
      let prompt = ''
      let requestType = 'put'
      // let urlType = ''
      switch (proType) {
        case 'delete':
          prompt = '请确定批量删除 '
          requestType = 'delete'
          break
        case 'audit':
          prompt = '请确定通过审核 '
          // urlType = 'batchAudit'
          break
        default:
          return
      }
      let mainUrl = ''
      if (api === 'child') {
        mainUrl = config.api.child
      } else {
        mainUrl = config.api.parent
      }
      if (this[selection].length > 0) {
        kindo.util.confirm(prompt, undefined, undefined, () => {
          let params = this[selection].map(item => {
            return item.id
          })
          this.$http[requestType](mainUrl, { data: { ids: params } }).then(res => {
            kindo.util.alert(res.message, '提示', 'success')
            this.get(api)
          })
        })
      } else {
        kindo.util.alert('请至少勾选一条数据', '提示', 'warning')
      }
    }
  }
}
</script>