/* @Author: zhengtian
 * @Desc: 限定条件规则 -> 精确判断
 */
<template>
  <div :parentRow="parentRow" :isOpen="isOpen">
    <kindo-box title="查询条件">
      <el-form v-model.trim="table.search" onsubmit="return false;" label-position="right" inline @keyup.enter.prevent.native="getTable('table')">
        <el-form-item label="项目类型">
          <el-select v-model.trim="table.search.itemType" clearable placeholder="请选择">
            <el-option v-for="item in dictRemote.itemType.data" :key="item.id" :label="item.name" :value="item.id"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="项目名称">
          <el-input v-model.trim="table.search.itemName" placeholder="" clearable></el-input>
        </el-form-item>
      </el-form>
      <div slot="control">
        <el-button icon="el-icon-search" type="primary" @click="getTable('table')">查询</el-button>
      </div>
    </kindo-box>
    <kindo-box :title="table.title + '精确判断'">
      <kindo-table ref="table" :url="table.url" :default-sort="tableSort" :queryParam="table.search" @selection-change="(selection) => tableChange('table', selection)" :pageSize="5">
        <el-table-column type="selection" fixed="left" width="30"></el-table-column>
        <el-table-column label="项目类型" prop="itemType" min-width="120" sortable="custom" :formatter="(row, column) => getDictLabel(dictRemote.itemType.data,row[column.property],'name','id')" show-overflow-tooltip></el-table-column>
        <el-table-column label="项目编码" prop="itemCode" min-width="120" sortable="custom" show-overflow-tooltip></el-table-column>
        <el-table-column label="项目名称" prop="itemName" min-width="120" sortable="custom" show-overflow-tooltip>
          <template slot-scope="scope">
            <span v-if="getDictLabel(dictRemote.itemType.data,scope.row.itemType,'name','id')==='适用险种'">{{kindo.dictionary.getLabel(dict.INSURANCE,scope.row.itemCode)}}</span>
            <span v-else-if="getDictLabel(dictRemote.itemType.data,scope.row.itemType,'name','id')==='医院等级'">{{kindo.dictionary.getLabel(dict.HOSPITAL_LEVEL,scope.row.itemCode)}}</span>
            <span v-else-if="getDictLabel(dictRemote.itemType.data,scope.row.itemType,'name','id')==='医院类型'">{{kindo.dictionary.getLabel(dict.HOSPITAL_TYPE,scope.row.itemCode)}}</span>
            <span v-else>{{scope.row.itemName}}</span>
          </template>
        </el-table-column>
        <el-table-column label="审核状态" prop="status" width="100" align="center" columnKey='status' :filters="columnFilters(dict.AUDIT_STATUS)" :filter-method="filterHandler" :filter-multiple="false" filter-placement="bottom-end">
          <template slot-scope="scope">
            <el-tag :type="scope.row.status === '1'?'success':'info'" close-transition>{{kindo.dictionary.getLabel(dict.AUDIT_STATUS,scope.row.status)}}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" align="center" fixed="right">
          <template slot-scope="scope">
            <el-tooltip class="item" effect="dark" :open-delay="300" content="删除" placement="top-start">
              <el-button type="text" icon="el-icon-delete" @click="remove('table', scope.row.id)"></el-button>
            </el-tooltip>
          </template>
        </el-table-column>
      </kindo-table>
      <div slot="control">
        <el-button icon="el-icon-plus" type="text" @click="add('table', 'limitCode','tableForm')">新增</el-button>
        <el-button icon="el-icon-delete" type="text" @click="remove('table')">删除</el-button>
        <el-button icon="el-icon-view" type="text" @click="audit('table')">审核</el-button>
      </div>
    </kindo-box>
    <!-- 弹框 -->
    <el-dialog v-drag top="0" :visible.sync="table.dialog.visible" :title="table.dialog.title+'精确条件'" :modal-append-to-body="false" :close-on-click-modal="false">
      <el-form :model="table.form" :rules="table.rules" onsubmit="return false;" label-width="130px" ref="tableForm">
        <el-form-item label="项目类型" prop="itemType">
          <el-select v-model.trim="table.form.itemType" clearable filterable placeholder="请选择">
            <el-option v-for="item in dictRemote.itemType.data" :key="item.id" :label="item.name" :value="item.id"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item v-if="getDictLabel(dictRemote.itemType.data,table.form.itemType,'name','id')==='诊断'" label="适应症" prop="itemCode">
          <el-select v-model.trim="table.form.itemCode" size="mini" :disabled="!kindo.validate.isEmpty(table.form.id)" @blur="(ev)=>{blurSel(ev,table.form,'itemCode',list.commonDrugList)}" placeholder="请输入名称或编码" clearable filterable :loading="loading" remote :remote-method="(str) => getDictRemoteSYZ('commonDrugList', 'name', str)">
            <el-option v-for="item in list.commonDrugList" :key="item.value" :label="item.label" :value="item.value">
              <span>{{ item.label }}</span>
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item v-else-if="getDictLabel(dictRemote.itemType.data,table.form.itemType,'name','id')==='年龄'" label="年龄段名称" style="display:block;" prop="itemCode">
          <el-select v-model.trim="table.form.itemCode" size="mini" :disabled="!kindo.validate.isEmpty(table.form.id)" @blur="(ev)=>{blurSel(ev,table.form,'itemCode',list.commonDrugList)}" placeholder="请输入选择" clearable filterable :loading="loading" remote :remote-method="(str) => getDictRemoteYear('commonDrugList', 'name', str)">
            <el-option v-for="item in list.commonDrugList" :key="item.value" :label="item.label" :value="item.value">
              <span>{{ item.label }}</span>
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item v-else-if="getDictLabel(dictRemote.itemType.data,table.form.itemType,'name','id')==='适用险种'" label="险种类型" style="display:block;" prop="itemCode">
          <el-select v-model.trim="table.form.itemCode" size="mini" placeholder="请输入选择" clearable filterable>
            <el-option v-for="item in dict.INSURANCE" :key="item.value" :label="item.label" :value="item.value"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item v-else-if="getDictLabel(dictRemote.itemType.data,table.form.itemType,'name','id')==='医院类型'" label="医院类型" style="display:block;" prop="itemCode">
          <el-select v-model.trim="table.form.itemCode" size="mini" placeholder="请输入选择" clearable filterable>
            <el-option v-for="item in dict.HOSPITAL_TYPE" :key="item.value" :label="item.label" :value="item.value"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item v-else-if="getDictLabel(dictRemote.itemType.data,table.form.itemType,'name','id')==='医院等级'" label="医院等级" style="display:block;" prop="itemCode">
          <el-select v-model.trim="table.form.itemCode" size="mini" placeholder="请输入选择" clearable filterable>
            <el-option v-for="item in dict.HOSPITAL_LEVEL" :key="item.value" :label="item.label" :value="item.value"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item v-else-if="getDictLabel(dictRemote.itemType.data,table.form.itemType,'name','id')==='姓名'" label="姓名" style="display:block;" prop="itemName">
          <el-input v-model.trim="table.form.itemCode" clearable></el-input>
        </el-form-item>
        <el-form-item v-else-if="getDictLabel(dictRemote.itemType.data,table.form.itemType,'name','id')==='科室名称'" label="科室名称" style="display:block;" prop="itemName">
          <el-input v-model.trim="table.form.itemCode" clearable></el-input>
        </el-form-item>
        <el-form-item v-else-if="getDictLabel(dictRemote.itemType.data,table.form.itemType,'name','id')==='药品'" label-width="0px">
          <el-form-item label="药品名称" style="display:block;" prop="itemName">
            <el-autocomplete v-model="table.form.itemName" clearable :fetch-suggestions="(queryString,callback)=>{SearchAsync(queryString,callback,'hcGenericName','hcGenericName','hcDrugCode','commonDrugList','kbmsHealthCareDrug')}" placeholder="请输入名称" @select="(item)=>{handleSelect(item,'table','itemCode')}"></el-autocomplete>
          </el-form-item>
          <el-form-item label="药品编码" style="display:block;" prop="itemCode">
            <el-autocomplete v-model="table.form.itemCode" clearable :fetch-suggestions="(queryString,callback)=>{SearchAsync(queryString,callback,'actualFormCode','hcDrugCode','hcGenericName','commonDrugList','kbmsHealthCareDrug')}" placeholder="请输入编码" @select="(item)=>{handleSelect(item,'table','itemName')}"></el-autocomplete>
          </el-form-item>
        </el-form-item>
        <el-form-item v-else label-width="0px">
          <el-form-item label="诊疗项目名称" style="display:block;" prop="itemName">
            <el-autocomplete v-model="table.form.itemName" clearable :fetch-suggestions="(queryString,callback)=>{SearchAsync(queryString,callback,'itemName','itemName','itemCode','commonDrugList','medicalTreatment')}" placeholder="请输入名称" @select="(item)=>{handleSelect(item,'table','itemCode')}"></el-autocomplete>
          </el-form-item>
          <el-form-item label="诊疗项目编码" style="display:block;" prop="itemCode">
            <el-autocomplete v-model="table.form.itemCode" clearable :fetch-suggestions="(queryString,callback)=>{SearchAsync(queryString,callback,'itemCode','itemCode','itemName','commonDrugList','medicalTreatment')}" placeholder="请输入编码" @select="(item)=>{handleSelect(item,'table','itemName')}"></el-autocomplete>
          </el-form-item>
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button type="primary" icon="fa fa-floppy-o" @click="save('table')">保 存</el-button>
        <el-button @click="table.dialog.visible = false" icon="el-icon-close" type="primary">取 消</el-button>
      </div>
    </el-dialog>
    <!-- 弹框-->
  </div>
</template>

<script>
import config from './config/index.js'
import tableOpra from '@src/utils/helper/tableOpra.js'
export default {
  mixins: [tableOpra],
  name: 'todo-table',
  props: {
    parentRow: Object,
    isOpen: Boolean
  },
  data() {
    return {
      loading: false,
      // 模糊搜素下拉框
      restaurants: [],
      // 主表默认排序
      tableSort: {
        prop: 'itemType',
        sort: 'ascending'
      },
      dict: {
        // 审核状态
        AUDIT_STATUS: [],
        // 年龄单位
        LIMIT_TYPE: [],
        // 试用险种
        INSURANCE: [],
        // 医院类型
        HOSPITAL_TYPE: [],
        // 医院等级
        HOSPITAL_LEVEL: []
      },
      list: {
        commonDrugList: []
      },
      dictRemote: {
        itemType: {
          url: config.api.itemType,
          data: []
        }
      },
      table: {
        title: '',
        url: config.api.accuracy,
        selection: [],
        dialog: {
          visible: false,
          title: '新增'
        },
        form: {
          limitCode: '',
          id: '',
          itemCode: '',
          itemName: '',
          itemType: ''
        },
        rules: {
          itemName: [{ min: 0, max: 30, message: '长度不能超过30' }],
          itemCode: [{ min: 0, max: 30, message: '长度不能超过30' }],
          itemType: [{ required: true, message: '请选择项目类型', trigger: 'blur' }]
        },
        search: {
          limitCode: '',
          itemCode: '',
          itemType: ''
        }
      }
    }
  },
  methods: {
    // 可远程模糊可手填input框(编码)
    // @queryString  输入到input中的值
    // @callback     回调函数（自带方法）
    // @searchName   查询接口的字段
    // @value        对应后台返回数据作为value的字段
    // @label        对应后台返回数据作为label的字段
    // @dict         存放下拉框数据的数组
    // @api          对应数据的接口
    SearchAsync(queryString, callback, searchName, value, label, dict, api) {
      let arr = []
      if (queryString) {
        this.$http.get(config.api[api], { params: { rows: 200, [searchName]: queryString } }).then(res => {
          this.list[dict] =
            res.data.rows.map(item => {
              return { value: item[value], label: item[label] }
            }) || []
          callback(this.list[dict])
        })
      } else {
        callback(arr)
      }
    },
    // 点击下拉框
    handleSelect(item, table, key) {
      this[table].form[key] = item.label
    },
    // 适应症远程查询
    getDictRemoteSYZ(dict, searchName, searchVal) {
      let param = { rows: 200, [searchName]: searchVal }
      this.$http.get(config.api.Indication, { params: param }).then(res => {
        this.list[dict] =
          res.data.rows.map(item => {
            return { label: item.name, value: item.id }
          }) || []
      })
    },
    // 年龄远程查询
    getDictRemoteYear(dict, searchName, searchVal) {
      let param = { rows: 200, [searchName]: searchVal }
      this.$http.get(config.api.kbmsAge, { params: param }).then(res => {
        this.list[dict] =
          res.data.rows.map(item => {
            return { label: item.name, value: item.id }
          }) || []
      })
    },
    init() {
      if (this.parentRow.limitCode) {
        this.table.form.limitCode = this.parentRow.limitCode
        this.table.search.limitCode = this.parentRow.limitCode
        this.table.title = this.parentRow.limitName
        this.getTable('table')
      } else {
        this.table.title = ''
        this.$refs.table.clearTable()
      }
    },
    // 保存
    save(table) {
      this.$refs[table + 'Form'].validate(valid => {
        if (valid) {
          if (!this.table.form.itemCode && !this.table.form.itemName) {
            kindo.util.confirm('编码或者名称必填一项', '提示', 'warning', undefined, undefined)
          } else {
            if (this[table].form.id) {
              this.$http.put(this[table].url, this[table].form).then(res => {
                kindo.util.alert(res.message, '提示', 'success')
                this[table].dialog.visible = false
                this.getTable(table)
              })
            } else {
              this.$http.post(this[table].url, this[table].form).then(res => {
                kindo.util.alert(res.message, '提示', 'success')
                this[table].dialog.visible = false
                this.getTable(table)
              })
            }
          }
        }
      })
    },
    // 修改
    update(table, row, fn, refForm) {
      kindo.util
        .promise(() => {
          if (table) {
            this[table].dialog.visible = true
          } else {
            this.dialog.visible = true
          }
        })
        .then(() => {
          if (refForm) {
            this.$refs[refForm].resetFields()
          } else {
            return true
          }
        })
        .then(() => {
          if (table) {
            this.$http
              .get(this[table].url + '/getById', {
                params: {
                  id: row.id
                }
              })
              .then(res => {
                let data = res.data
                for (let k in this[table].form) {
                  this[table].form[k] = data[k]
                }
              })
            if (!kindo.validate.isEmpty(fn)) {
              this[fn](row)
            }
            if (this[table].dialog.hasOwnProperty('title')) {
              this[table].dialog.title = '修改'
            }
          } else {
            this.$http
              .get(this.url + '/getById', {
                params: {
                  id: row.id
                }
              })
              .then(res => {
                let data = res.data
                for (let k in this.form) {
                  this.form[k] = data[k]
                }
              })
            if (!kindo.validate.isEmpty(fn)) {
              this[fn]()
            }
            if (this.dialog.hasOwnProperty('title')) {
              this.dialog.title = '修改'
            }
          }
        })
    },
    // row 表的当前数据，类型-对象
    tableEdit(row) {
      this.list.commonDrugList = [{ value: row.itemCode, label: row.itemName }]
    },
    // 获取数据字典
    getDict(dict) {
      for (let k in this.dictRemote) {
        this.$http.get(this.dictRemote[k].url).then(res => {
          this.dictRemote[k].data = res.data
        })
      }
    },
    getDictLabel: (source, value, labelName, valueName) => {
      if (!kindo.validate.isEmpty(value)) {
        const item = source.filter(item => item[valueName] === value || item[valueName] === value.toString())
        if (item.length > 0) {
          return item[0][labelName]
        }
      }
      return '-'
    }
  },
  created() {
    this.getDictionary()
    this.getDict()
  },
  watch: {
    isOpen(val) {
      this.$refs.table.doLayout('table')
    },
    parentRow(val) {
      this.init()
    },
    'table.form.itemType': function (v) {
      if (!this.table.form.id) {
        this.list.commonDrugList = []
        this.table.form.itemCode = ''
        this.table.form.itemName = ''
      }
    },
    'table.form.itemCode': function (v) {
      switch (this.getDictLabel(this.dictRemote.itemType.data, this.table.form.itemType, 'name', 'id')) {
        case '年龄':
          this.table.form.itemName = kindo.dictionary.getLabel(this.list.commonDrugList, v)
          break
        case '诊断':
          this.table.form.itemName = kindo.dictionary.getLabel(this.list.commonDrugList, v)
          break
        case '姓名':
          this.table.form.itemName = v
          break
        case '科室名称':
          this.table.form.itemName = v
          break
        default:
          return v
      }
    }
  },
  mounted() {
    this.$nextTick(() => {
      this.init()
    })
  }
}
</script>
<style lang="scss" scoped>
.el-autocomplete {
  width: 280px;
}
</style>
