/*
 * @Author: zhengtian
 * @Date: 2018-04-13
 * @Desc: 医保限制药品
 */
<template>
  <div>
    <!-- 父表 -->
    <kindo-box title="查询条件" icon="xx">
      <el-form :model="parent.search" onsubmit="return false;" label-position="right" inline @keyup.enter.prevent.native="getTable('parent')">
        <el-form-item label="规则名称">
          <el-input v-model.trim="parent.search.ruleName" placeholder="" clearable></el-input>
        </el-form-item>
        <el-form-item label="规则表达式">
          <el-input v-model.trim="parent.search.expression" placeholder="" clearable></el-input>
        </el-form-item>
      </el-form>
      <div slot="control">
        <el-button icon="el-icon-search" type="primary" @click="getTable('parent')">查询</el-button>
      </div>
    </kindo-box>
    <kindo-box title="医保限制药品">
      <kindo-table ref="parent" :url="parent.url" :queryParam="parent.search" @selection-change="(selection) => tableChange('parent', selection)">
        <el-table-column type="selection" fixed="left" width="30"></el-table-column>
        <el-table-column label="规则ID" prop="ruleCode" width="120" header-align="center" show-overflow-tooltip></el-table-column>
        <el-table-column label="规则名称" prop="ruleName" min-width="140" header-align="center" show-overflow-tooltip></el-table-column>
        <el-table-column label="规则相关药品" width="120" header-align="center" align="center" show-overflow-tooltip>
          <template slot-scope="scope">
            <el-button type="text" @click="showRule(scope.row)">查看</el-button>
          </template>
        </el-table-column>
        <el-table-column label="规则表达式" prop="expression" min-width="120" header-align="center" show-overflow-tooltip></el-table-column>
        <el-table-column label="审核状态" prop="status" width="100" align="center" columnKey='status' :filters="columnFilters(dict.AUDIT_STATUS)" :filter-method="filterHandler" :filter-multiple="false" filter-placement="bottom-end">
          <template slot-scope="scope">
            <el-tag :type="scope.row.status === '1'?'success':'info'" close-transition>{{kindo.dictionary.getLabel(dict.AUDIT_STATUS,scope.row.status)}}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" align="center" fixed="right">
          <template slot-scope="scope">
            <el-tooltip class="item" effect="dark" :open-delay="300" content="编辑" placement="top-start">
              <el-button type="text" icon="el-icon-edit" @click="update('parent', scope.row, 'updateBefore')"></el-button>
            </el-tooltip>
            <el-tooltip class="item" effect="dark" :open-delay="300" content="删除" placement="top-start">
              <el-button type="text" icon="el-icon-delete" @click="remove('parent', scope.row.id)"></el-button>
            </el-tooltip>
          </template>
        </el-table-column>
      </kindo-table>
      <div slot="control">
        <el-button icon="el-icon-plus" type="text" @click="add('parent')">新增</el-button>
        <el-button icon="el-icon-delete" type="text" @click="remove('parent')">删除</el-button>
        <el-button icon="el-icon-view" type="text" @click="audit('parent')">审核</el-button>
      </div>
    </kindo-box>
    <!-- 父表弹框-->
    <el-dialog v-drag top="0" :visible.sync="parent.dialog.visible" :title="parent.dialog.title +'医保限制用药'" :modal-append-to-body="false" :close-on-click-modal="false">
      <el-form :model="parent.form" class="box" onsubmit="return false;" ref="parentForm" label-width="100px" :rules="parent.rules" label-position="right">
        <el-form-item label="规则名称" prop="ruleName">
          <el-select v-model.trim="parent.form.ruleName" clearable filterable placeholder="请输入选择" remote :remote-method="(str) => getDictRemote('ruleName', 'ruleName', str)">
            <el-option v-for="(item,index) in dictRemote.ruleName.data" :key="index" :label="item" :value="item">
              <p :title="item" style="width:240px;overflow:hidden">{{ item }}</p>
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="规则表达式" prop="conditionId">
          <el-select v-model.trim="parent.form.conditionId" clearable filterable placeholder="请输入选择" remote :remote-method="(str) => getDictRemoteBds('conditionId', 'limitName', str)">
            <el-option v-for="item in dictRemote.conditionId.data" :key="item.value" :label="item.label" :value="item.value">
              <span>{{ item.label }}</span>
            </el-option>
          </el-select>
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button type="primary" icon="fa fa-floppy-o" @click="save('parent')">保 存</el-button>
        <el-button @click="parent.dialog.visible = false" icon="el-icon-close" type="primary">取 消</el-button>
      </div>
    </el-dialog>
    <!-- 父表弹框-->
    <!-- 规则相关药品查看 -->
    <el-dialog v-drag top="0" :visible.sync="visibleRule" :title="RuleTitle" :modal-append-to-body="false" :close-on-click-modal="false" width="700px">
      <kindo-table ref="table" :pagination="false" :url="table.url" :queryParam="table.search">
        <el-table-column label="药品编码" prop="hcCatalogueCode" min-width="100" header-align="center" show-overflow-tooltip></el-table-column>
        <el-table-column label="药品" prop="hcCatalogueName" min-width="120" header-align="center" show-overflow-tooltip></el-table-column>
        <el-table-column label="剂型" prop="dosageForm" width="130" header-align="center" show-overflow-tooltip></el-table-column>
      </kindo-table>
    </el-dialog>
    <!-- END规则相关药品查看 -->

  </div>
</template>

<script>
import config from './config/index.js'
import tableOpra from '@src/utils/helper/tableOpra.js'
export default {
  name: 'limitationDrug',
  mixins: [tableOpra],
  data() {
    return {
      // 主表默认选第一行数据
      dict: {
        // 审核状态
        AUDIT_STATUS: []
      },
      dictRemote: {
        ruleName: {
          url: config.api.listRemark,
          data: []
        },
        conditionId: {
          url: config.api.listForCombo,
          data: []
        }
      },
      table: {
        url: config.api.listAll,
        search: {
          remark: ''
        }
      },
      parent: {
        url: config.api.parent,
        selection: [],
        search: {
          ruleName: '',
          expression: ''
        },
        dialog: {
          visible: false,
          title: '新增'
        },
        form: {
          id: '',
          ruleName: '',
          conditionId: ''
        },
        rules: {
          ruleName: [{ required: true, message: '请选择药品名称', trigger: 'blur' }],
          conditionId: [{ required: true, message: '请选择条件', trigger: 'blur' }]
        }
      },
      // 规则相关药品查看
      visibleRule: false,
      RuleTitle: ''
    }
  },
  methods: {
    getDictRemote(dict, searchName, searchVal) {
      let param = { rows: 200, [searchName]: searchVal }
      this.$http.get(this.dictRemote[dict].url, { params: param }).then(res => {
        this.dictRemote[dict].data = res.data
      })
    },
    // 表达式模糊查询
    getDictRemoteBds(dict, searchName, searchVal) {
      let param = { rows: 200, [searchName]: searchVal, limitDefine: '2', status: '1' }
      this.$http.get(this.dictRemote[dict].url, { params: param }).then(res => {
        this.dictRemote[dict].data = res.data
      })
    },
    // 清除模糊搜素下拉框
    dictRemoteClear(dict) {
      this.dictRemote[dict].data = []
    },

    // 规则相关药品查看
    showRule(row) {
      kindo.util
        .promise(() => {
          this.visibleRule = true
        })
        .then(() => {
          this.RuleTitle = row.ruleName + '相关药品'
          this.table.search.remark = row.ruleName
        })
        .then(() => {
          this.getTable('table')
        })
    },

    updateBefore(row) {
      if (row.conditionId) {
        this.getDictRemoteBds('conditionId', 'limitName', row.expression)
        this.dictRemote.conditionId.data = [
          { label: this.dictRemote.conditionId.data.expression, value: this.dictRemote.conditionId.data.conditionId }
        ]
      }
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
              this[table].dialog.title = '编辑'
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
              this[fn](row)
            }
            if (this.dialog.hasOwnProperty('title')) {
              this.dialog.title = '修改'
            }
          }
        })
    }
  },

  created() {
    this.getDictionary()
  },

  mounted() {
    this.$nextTick(() => {
      this.getTable('parent')
    })
  },
  watch: {
    'parent.dialog.visible'(val) {
      if (val === false) {
        this.dictRemoteClear('ruleName')
        this.dictRemoteClear('conditionId')
      }
    },
    'parent.form.conditionId'(val) {
      if (val === '') {
        this.dictRemoteClear('conditionId')
      }
    }
  }
}
</script>