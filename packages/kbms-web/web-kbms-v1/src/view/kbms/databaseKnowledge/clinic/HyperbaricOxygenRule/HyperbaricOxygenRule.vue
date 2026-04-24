/* @Author: litianye
 *菜单：知识数据库-诊疗-高压氧规则
<template>
  <div>
    <!-- 父表 start -->
    <kindo-box title="查询条件" icon="xx">
      <el-form :model="parent.search" onsubmit="return false;" label-position="right" inline @keyup.enter.prevent.native="getParent">
        <el-form-item label="诊疗项目">
          <el-input v-model.trim="parent.search.itemName" placeholder="请输入关键字" clearable></el-input>
        </el-form-item>
      </el-form>
      <div slot="control">
        <el-button icon="el-icon-search" type="primary" @click="getParent">查询</el-button>
      </div>
    </kindo-box>
    <kindo-box title="高压氧规则信息">
      <kindo-table ref="parent" :url="parent.url" :queryParam="parent.search" :extendOption="extend" @selection-change="(selection) => tableChange('parent', selection)" @filter-change="(filters)=>filterChange(filters,'parent', 'search')" :pageSize="5">
        <el-table-column type="selection" fixed="left" width="30"></el-table-column>
        <el-table-column label="诊疗项目编码" prop="itemCode" width="140" header-align="center" sortable='custom' show-overflow-tooltip></el-table-column>
        <el-table-column label="诊疗项目名称" prop="itemName" width="160" header-align="center" sortable='custom' show-overflow-tooltip></el-table-column>
        <el-table-column label="每日限定次数" prop="itemNum" width="150" header-align="center" align="right" sortable='custom' show-overflow-tooltip></el-table-column>
        <el-table-column label="项目内涵" prop="itemIntension" min-width="200" header-align="center" sortable='custom' show-overflow-tooltip></el-table-column>
        <el-table-column label="审核状态" prop="status" width="100" align="center" columnKey='status' :filters="columnFilters(dict.AUDIT_STATUS)" :filter-method="filterHandler" :filter-multiple="false" filter-placement="bottom-end">
          <template slot-scope="scope">
            <el-tag :type="scope.row.status === '1'?'success':'info'" close-transition>{{kindo.dictionary.getLabel(dict.AUDIT_STATUS,scope.row.status)}}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" align="center" fixed="right">
          <template slot-scope="scope">
            <el-tooltip class="item" effect="dark" :open-delay="300" content="编辑" placement="top-start">
              <el-button type="text" icon="el-icon-edit" @click="update('parent', scope.row,'tableEdit', 'parentForm')"></el-button>
            </el-tooltip>
            <el-tooltip class="item" effect="dark" :open-delay="300" content="删除" placement="top-start">
              <el-button type="text" icon="el-icon-delete" @click="remove('parent', scope.row.id)"></el-button>
            </el-tooltip>
          </template>
        </el-table-column>
      </kindo-table>
      <div slot="control">
        <el-button icon="el-icon-plus" type="text" @click="add('parent','itemNum,itemRuleType', 'parentForm')">新增</el-button>
        <el-button icon="el-icon-delete" type="text" @click="remove('parent')">删除</el-button>
        <el-button icon="el-icon-view" type="text" @click="audit('parent')">审核</el-button>
      </div>
    </kindo-box>
    <!-- 父表 end -->

    <!-- 主表新增 start -->
    <el-dialog v-drag top="0" :visible.sync="parent.dialog.visible" :title="(parent.form.id?'编辑':'新增') + '高压氧项目'" :close-on-click-modal="false">
      <el-form :model="parent.form" onsubmit="return false;" class="box" ref="parentForm" :rules="parent.rules" label-width="150px" label-position="right">
        <el-form-item label="诊疗项目" style="display:block;" prop="itemCode">
          <el-select v-model.trim="parent.form.itemCode" size="mini" :disabled="!kindo.validate.isEmpty(parent.form.id)" @blur="(ev)=>{blurSel(ev,parent.form,'itemCode',list.commonDrugList)}" placeholder="请输入名称或编码" clearable filterable :loading="loading" remote :remote-method="(str) => getDictRemote('commonDrugList', 'itemName', str)">
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
        <el-form-item label="政策限定用量（次）" prop="itemNum">
          <el-input-number v-model.trim="parent.form.itemNum" size="mini" :controls="false" :min="0" :max="99"></el-input-number>
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button type="primary" icon="fa fa-floppy-o" @click="save('parent')">保 存</el-button>
        <el-button @click="parent.dialog.visible = false" icon="el-icon-close" type="primary">取 消</el-button>
      </div>
    </el-dialog>
    <!-- 主表新增 end -->
  </div>
</template>

<script>
import config from './config/index.js'
import tableOpra from '@src/utils/helper/tableOpra.js'
export default {
  name: 'HyperbaricOxygenRule',
  mixins: [tableOpra],
  data() {
    var validateNum = (rule, value, callback) => {
      if (!kindo.validate.pInterger(value)) {
        return callback(new Error('数值为正整数'))
      } else {
        callback()
      }
    }
    return {
      // 主表默认选第一行数据
      extend: { selectedFirst: true },
      loading: false,
      disabled: true,
      dict: {
        AUDIT_STATUS: []
      },
      list: {
        commonDrugList: []
      },

      parent: {
        url: config.api.parent,
        selection: [],
        dialog: {
          visible: false
        },
        form: {
          id: '',
          itemCode: '',
          itemNum: '20',
          itemRuleType: '7'
        },
        rules: {
          itemCode: [{ required: true, message: '请输入名称或编码', trigger: 'blur' }],
          itemNum: [
            { required: true, message: '请输入次数', trigger: 'blur' },
            {
              validator: validateNum,
              trigger: 'blur'
            }
          ]
        },
        search: {
          itemName: '',
          itemRuleType: '7'
        }
      }
    }
  },
  methods: {
    // 状态筛选
    filterChange(filters, table, search) {
      for (let k in filters) {
        if (filters.hasOwnProperty(k)) {
          this.parent.search[k] = filters[k].toString()
        }
      }
      this.getTable(table)
    },
    // 诊疗项目远程查询
    getDictRemote(dict, searchName, searchVal) {
      let param = { rows: 200, [searchName]: searchVal }
      this.$http.get(config.api.medicalTreatment, { params: param }).then(res => {
        this.list[dict] =
          res.data.rows.map(item => {
            return { label: item.itemName, value: item.itemCode }
          }) || []
      })
    },
    // 编辑
    tableEdit(row) {
      this.list.commonDrugList = [{ value: row.itemCode, label: row.itemName }]
    },
    // 修改
    update(table, row, fn, refForm) {
      kindo.util
        .promise(() => {
          this[table].dialog.visible = true
        })
        .then(() => {
          if (refForm) {
            this.$refs[refForm].resetFields()
          } else {
            return true
          }
        })
        .then(() => {
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
        })
    },
    // 获取父表信息
    getParent() {
      this.$refs.parent.reloadData().then(res => {
        if (res.data.total > 0) {
          this.$refs.parent.setCurrentRowIndex(0)
        } else {
          this.$refs.child.clearTable()
          this.child.form.materialOperationId = ''
          this.child.search.materialOperationId = ''
        }
      })
    }
  },
  created() {
    this.getDictionary()
  },
  mounted() {
    this.$nextTick(() => {
      this.getParent()
    })
  },
  watch: {
    'parent.form.itemCode': function (val) {
      if (val === '') {
        this.list.commonDrugList = []
      }
    }
  }
}
</script>