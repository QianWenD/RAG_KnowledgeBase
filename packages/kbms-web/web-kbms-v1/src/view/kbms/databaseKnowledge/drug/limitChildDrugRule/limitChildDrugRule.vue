s/* @Author: lilizhou
 * 菜单：儿童限制用药
 */

<template>
  <div>
    <kindo-box title="查询条件" icon="xx">
      <el-form :model="search" label-position="right" onsubmit="return false;" inline
        @keyup.enter.prevent.native="get('table1')">
        <el-form-item label="药品名称">
          <el-input v-model.trim="search.hcDrugCode" clearable placeholder="请输入编码或名称"></el-input>
        </el-form-item>
        <el-form-item label="剂型">
          <el-input v-model.trim="search.actualFormName" clearable></el-input>
        </el-form-item>
      </el-form>
      <div slot="control">
        <el-button icon="el-icon-search" type="primary" @click="get('table1')">查询</el-button>
      </div>
    </kindo-box>
    <kindo-box title="儿童限制用药">
      <kindo-table ref="table1" :url="url" :queryParam="search"
        @selection-change="(selection)=>selectionChange(selection, 'selection')"
        @filter-change="(filters) =>filterChange(filters,'table1','search')">
        <el-table-column type="selection" fixed="left" width="30"></el-table-column>
        <el-table-column label="药品编码" fixed="left" prop="hcDrugCode" min-width="120" header-align="center"
          sortable='custom' show-overflow-tooltip></el-table-column>
        <el-table-column label="药品名称" prop="hcGenericName" min-width="120" header-align="center" sortable='custom'
          show-overflow-tooltip></el-table-column>
        <el-table-column label="剂型" prop="actualFormName" min-width="120" header-align="center" sortable='custom'
          show-overflow-tooltip></el-table-column>
        <el-table-column label="描述" prop="remark" min-width="120" header-align="center" show-overflow-tooltip>
        </el-table-column>
        <el-table-column label="限制条件" prop="ageName" min-width="120" header-align="center" show-overflow-tooltip>
        </el-table-column>
        <el-table-column label="排除条件" prop="kbmsDrugIndicationName" min-width="120" header-align="center"
          show-overflow-tooltip></el-table-column>
        <el-table-column label="审核状态" prop="status" width="100" align="center" column-key="status"
          :filters="filtersDict.AUDIT_STATUS" :filter-method="filterHandler" :filter-multiple="false"
          filter-placement="bottom-end">
          <template slot-scope="scope">
            <el-tag :type="scope.row.status === '1'?'success':'info'" close-transition>
              {{kindo.dictionary.getLabel(dict.AUDIT_STATUS, scope.row.status)}}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" align="center" fixed="right">
          <template slot-scope="scope">
            <el-tooltip class="item" effect="dark" :open-delay="300" content="编辑" placement="top-start">
              <el-button type="text" icon="el-icon-edit" @click="edit(scope.row)"></el-button>
            </el-tooltip>
            <el-tooltip class="item" effect="dark" :open-delay="300" content="删除" placement="top-start">
              <el-button type="text" icon="el-icon-delete" @click="deleteOne(scope.row.id, 'table1',operateUrl)">
              </el-button>
            </el-tooltip>
          </template>
        </el-table-column>
      </kindo-table>
      <div slot="control">
        <el-button icon="el-icon-plus" type="text" @click="insert('visible','form','tableInsert')">新增</el-button>
        <el-button icon="el-icon-delete" type="text" @click="batch('selection', 'table1', 'delete',operateUrl)">删除
        </el-button>
        <el-button icon="el-icon-view" type="text" @click="batch('selection', 'table1', 'audit',operateUrl)">审核
        </el-button>
        <!-- <el-button icon="el-icon-k-sys-import" type="text" @click="importData">导入</el-button> -->
        <!-- <el-button icon="el-icon-k-sys-export" type="text" @click="exportData">导出</el-button> -->
      </div>
    </kindo-box>
    <el-dialog v-drag top="0" :visible.sync="visible" :title="(form.id?'编辑':'新增') +'儿童限制用药'"
      :modal-append-to-body="false" :close-on-click-modal="false">
      <el-form :model="form" :rules="formRules" class="box" onsubmit="return false;" label-width="90px" ref="form">
        <el-form-item label="药品名称" prop="hcDrugCode">
          <el-select v-model.trim="form.hcDrugCode" remote :remote-method="remoteDrug"
            @blur="(ev)=>{blurSel(ev,form,'hcDrugCode','healthDrugList')}" :disabled="!kindo.validate.isEmpty(form.id)"
            placeholder="请输入选择" clearable filterable :loading="loading">
            <li class="title">
              <span>药品编码</span>
              <span>药品名称</span>
            </li>
            <li class="tip">
              <span>
                &lt;请选择&gt;
              </span>
            </li>
            <el-option v-for="item in list.healthDrugList" :key="item.value" :label="item.label" :value="item.value">
              <span>{{ item.value }}</span>
              <span>{{ item.label+'('+item.actualFormName+')' }}</span>
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="剂型" prop="actualFormName">
          <el-input v-model.trim="form.actualFormName" clearable disabled></el-input>
        </el-form-item>
        <el-form-item label="限制条件" prop="kbmsAgeId">
          <el-select v-model="form.kbmsAgeId" clearable filterable>
            <el-option v-for="(item,index) in list._限制条件" :key="index" :label="item.label" :value="item.value">
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="排除条件" prop="kbmsDrugIndicationId">
          <el-select v-model.trim="form.kbmsDrugIndicationId" remote :remote-method="remoteTj"
            @blur="(ev)=>{blurSel(ev,form,'kbmsDrugIndicationId','_排除条件')}" :loading="loading" placeholder="请输入选择"
            clearable filterable>
            <el-option v-for="item in list._排除条件" :key="item.value" :label="item.label" :value="item.value">
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="描述" prop="remark">
          <el-input v-model.trim="form.remark" placeholder="可输入200字" type="textarea"></el-input>
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button icon="el-icon-check" type="primary" @click="save('form', 'table1', 'visible',operateUrl)">保 存
        </el-button>
        <el-button icon="el-icon-close" type="primary" @click="visible=false">取 消</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import config from './config'
// 依赖于 table - 表格处理
import tableMixIn from '@src/utils/helper/tableMixIn.js'

export default {
  name: 'limitChildDrugRule',
  mixins: [tableMixIn],
  data() {
    return {
      loading: false,
      timeout_tj: null,
      url: config.api.table,
      operateUrl: config.api.operateTable,
      search: {
        hcDrugCode: '',
        actualFormName: ''
      },
      // 已选中表格数据
      selection: [],

      // 编辑、新增弹窗显示
      visible: false,

      // 数据字典
      dict: {
        // 审核状态
        AUDIT_STATUS: [],
        // 收费项目等级
        CHARGE_LEVEL: []
      },
      // 表内筛选数据字典
      filtersDict: {
        // 审核状态
        AUDIT_STATUS: []
      },

      // 远程筛选下拉框建议数据集
      list: {
        healthDrugList: [],
        _限制条件: [],
        _排除条件: []
      },
      // 新增、编辑表单
      form: {
        id: '',
        kbmsAgeId: '',
        hcDrugCode: '',
        actualFormName: '',
        kbmsDrugIndicationId: '',
        remark: ''
      },

      // 表单校验规则
      formRules: {
        remark: [{ min: 0, max: 200, message: '长度不能超过200' }],
        hcDrugCode: [{ required: true, message: '请输入药品名称', trigger: 'blur' }, { min: 0, max: 30, message: '长度不能超过30' }],
        kbmsAgeId: [{ required: true, message: '请选择', trigger: 'blur' }]
      }
    }
  },

  created() {
    this._form = Object.assign({}, this.form)
    this.getDict(this.dict, this.filtersDict)
    this.$http.get(config.api.xzTj).then(res => {
      this.list._限制条件 = res.data.map(item => {
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
      this.get('table1')
    })
  },

  methods: {
    // 新增时清空下拉筛选列表
    tableInsert() {
      this.list.healthDrugList = []
    },
    edit(row) {
      kindo.util.promise(() => {
        this.visible = true
      }).then(() => {
        // 初始化，去除校验提示并清空实体
        this.$refs.form.resetFields()
      }).then(() => {
        for (var key in row) {
          if (this.form.hasOwnProperty(key) === true) {
            this.form[key] = row[key]
          }
        }
      }).then(() => {
        this.list.healthDrugList = [{ value: row.hcDrugCode, label: row.hcGenericName, actualFormName: row.actualFormName }]
        this.list._排除条件 = [{ value: row.kbmsDrugIndicationId, label: row.kbmsDrugIndicationName }]
      })
    },

    // 项目名称远程查询
    remoteDrug(query) {
      if (query !== '') {
        this.loading = true
        if (!kindo.validate.isEmpty(this.timeout_tj)) {
          clearTimeout(this.timeout_tj)
        }
        this.timeout_tj = setTimeout(() => {
          let params = {
            hcGenericName: query,
            status: '1',
            rows: 100
          }
          this.$http.get(config.api.drug, { params: params }).then(res => {
            this.loading = false
            if (res.data && res.data.rows && res.data.rows.length > 0) {
              this.list.healthDrugList = res.data.rows.map(item => {
                let tempObj = {
                  label: item.hcGenericName,
                  value: item.hcDrugCode,
                  actualFormName: item.actualFormName
                }
                return tempObj
              })
            } else {
              this.list.healthDrugList = []
            }
          })
        }, 200)
      } else {
        this.list.healthDrugList = []
      }
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
              this.list._排除条件 = res.data.rows.map(item => {
                let tempObj = {
                  label: item.name,
                  value: item.id
                }
                return tempObj
              })
            } else {
              this.list._排除条件 = []
            }
          })
        }, 200)
      } else {
        this.list._排除条件 = []
      }
    }
  },
  watch: {
    'form.hcDrugCode': function (val, oldVal) {
      if (val === '') {
        this.list.healthDrugList = []
        this.form.actualFormName = ''
      } else {
        this.list.healthDrugList.map(item => {
          if (item.value === val) {
            this.form.actualFormName = item.actualFormName
          }
        })
      }
    }
  }
}
</script>
