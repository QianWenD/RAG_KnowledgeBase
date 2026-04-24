/* @Author:litianye
 * @Date: 2018/5/17
 * @Desc: 五险规则配置
 */
<template>
  <div>
    <el-tabs v-model.trim="tabsPrimary" @tab-click="tabChange">
      <el-tab-pane label="工伤保险规则" name="1">
      </el-tab-pane>
      <el-tab-pane label="生育保险规则" name="2">
      </el-tab-pane>
      <el-tab-pane label="失业保险规则" name="3">
      </el-tab-pane>
      <el-tab-pane label="养老保险规则" name="4">
      </el-tab-pane>
      <el-tab-pane label="医疗保险规则" name="5">
      </el-tab-pane>
      <el-tab-pane label="公共规则" name="6">
      </el-tab-pane>
    </el-tabs>
    <kindo-box title="查询条件" icon="xx">
      <el-form v-model.trim="parent.search" onsubmit="return false;" label-position="right" inline @keyup.enter.prevent.native="getTable('parent')">
        <el-form-item label="规则名称">
          <el-input v-model.trim="parent.search.ruleName" placeholder="" clearable></el-input>
        </el-form-item>
        <el-form-item label="规则类型">
          <el-select v-model.trim="parent.search.ruleType" placeholder="请选择" clearable>
            <el-option v-for="item in dict.RULE_TYPE" :key="item.value" :label="item.label" :value="item.value"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="风控等级">
          <el-select v-model.trim="parent.search.ruleGrade" placeholder="请选择" clearable>
            <el-option v-for="item in dict.RULE_GRADE" :key="item.value" :label="item.label" :value="item.value"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="开启状态">
          <el-select v-model.trim="parent.search.enable" placeholder="请选择" clearable>
            <el-option v-for="item in dict.ENABLE" :key="item.value" :label="item.label" :value="item.value"></el-option>
          </el-select>
        </el-form-item>
      </el-form>
      <div slot="control">
        <el-button icon="el-icon-search" type="primary" @click="getTable('parent')">查询</el-button>
      </div>
    </kindo-box>
    <kindo-box title="表格信息">
      <kindo-table ref="parent" :url="parent.url" :queryParam="parent.search" @selection-change="(selection) => tableChange('parent', selection)">
        <el-table-column type="selection" fixed="left" width="30"></el-table-column>
        <el-table-column label="规则ID" prop="ruleCode" width="140" header-align="center" show-overflow-tooltip></el-table-column>
        <el-table-column label="规则名称" prop="ruleName" min-width="120" header-align="center" show-overflow-tooltip></el-table-column>
        <el-table-column label="规则定义" prop="ruleDefinition" min-width="160" header-align="center" show-overflow-tooltip></el-table-column>
        <el-table-column label="规则类型" prop="ruleType" width="140" header-align="center" :formatter="(row, column) => kindo.dictionary.getLabel(dict.RULE_TYPE,row[column.property])" show-overflow-tooltip></el-table-column>
        <el-table-column label="风控等级" prop="ruleGrade" width="140" header-align="center" :formatter="(row, column) => kindo.dictionary.getLabel(dict.RULE_GRADE,row[column.property])" show-overflow-tooltip></el-table-column>
        <el-table-column label="规则依据" prop="ruleBasis" min-width="160" header-align="center" show-overflow-tooltip></el-table-column>
        <el-table-column label="开启状态" width="140" align="center">
          <template slot-scope="scope">
            <el-switch v-model.trim="scope.row.enable" active-value="1" inactive-value="0" @change="(val) => switchChange(scope.row.id, val)"></el-switch>
          </template>
        </el-table-column>
        <el-table-column label="审核状态" prop="status" width="100" align="center" columnKey='status' :filters="columnFilters(dict.AUDIT_STATUS)" :filter-method="filterHandler" :filter-multiple="false" filter-placement="bottom-end">
          <template slot-scope="scope">
            <el-tag :type="scope.row.status === '1'?'success':'info'" close-transition>{{kindo.dictionary.getLabel(dict.AUDIT_STATUS,scope.row.status)}}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" align="center" fixed="right">
          <template slot-scope="scope">
            <el-tooltip class="item" effect="dark" :open-delay="300" content="编辑" placement="top-start">
              <el-button type="text" icon="el-icon-edit" @click="update('parent', scope.row.id)"></el-button>
            </el-tooltip>
            <el-tooltip class="item" effect="dark" :open-delay="300" content="删除" placement="top-start">
              <el-button type="text" icon="el-icon-delete" @click="remove('parent', scope.row.id)"></el-button>
            </el-tooltip>
          </template>
        </el-table-column>
      </kindo-table>
      <div slot="control">
        <el-button icon="el-icon-search" type="text" @click="getTable('parent')">查询</el-button>
        <el-button icon="el-icon-plus" type="text" @click="add('parent','ruleAuditType')">新增</el-button>
        <el-button icon="el-icon-delete" type="text" @click="remove('parent')">删除</el-button>
        <el-button icon="el-icon-view" type="text" @click="audit('parent')">审核</el-button>
      </div>
    </kindo-box>
    <!-- 主表弹框 -->
    <el-dialog v-drag top="0" :visible.sync="parent.dialog.visible" :title="parent.dialog.title" :modal-append-to-body="false" :close-on-click-modal="false">
      <el-form :model="parent.form" class="box" onsubmit="return false;" ref="parentForm" :rules="parent.rules" label-width="90px" label-position="right">
        <el-form-item label="规则名称" prop="ruleName">
          <el-input v-model.trim="parent.form.ruleName" placeholder="" clearable></el-input>
        </el-form-item>
        <el-form-item label="规则定义" prop="ruleDefinition">
          <el-input v-model.trim="parent.form.ruleDefinition" type="textarea" placeholder="可输入200文字"></el-input>
        </el-form-item>
        <el-form-item label="规则类型" prop="ruleType">
          <el-select v-model.trim="parent.form.ruleType" placeholder="请选择" clearable>
            <el-option v-for="item in dict.RULE_TYPE" :key="item.value" :label="item.label" :value="item.value"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="风控等级" prop="ruleGrade">
          <el-select v-model.trim="parent.form.ruleGrade" placeholder="请选择" clearable>
            <el-option v-for="item in dict.RULE_GRADE" :key="item.value" :label="item.label" :value="item.value"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="规则依据" prop="ruleBasis">
          <el-input v-model.trim="parent.form.ruleBasis" type="textarea" placeholder="可输入200文字"></el-input>
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button type="primary" icon="fa fa-floppy-o" @click="save('parent')">保 存</el-button>
        <el-button @click="parent.dialog.visible = false" icon="el-icon-close" type="primary">取 消</el-button>
      </div>
    </el-dialog>
    <!-- 主表弹框 -->
  </div>
</template>

<script>
import config from './config/index.js'

import tableOpra from '@src/utils/helper/tableOpra.js'
export default {
  name: 'injuryInsurance',
  mixins: [tableOpra],
  data() {
    return {
      // tab 默认选中项
      tabsPrimary: '1',
      dict: {
        // 审核状态
        AUDIT_STATUS: [],
        // 风控等级
        RULE_GRADE: [],
        // 规则类型
        RULE_TYPE: [],
        // 是否且用
        ENABLE: []
      },
      parent: {
        url: config.api.parent,
        selection: [],
        dialog: {
          visible: false,
          title: '新增'
        },
        form: {
          id: '',
          ruleName: '',
          ruleType: '',
          ruleGrade: '',
          ruleBasis: '',
          ruleDefinition: '',
          enable: '',
          ruleAuditType: '1'
        },
        rules: {
          ruleName: [{ required: true, message: '请输入规则名称', trigger: 'blur' }],
          ruleDefinition: [{ required: true, message: '请输入规则定义', trigger: 'blur' }, { min: 0, max: 200, message: '不能超过200个文字' }],
          ruleType: [{ required: true, message: '请选择规则类型', trigger: 'blur' }],
          ruleGrade: [{ required: true, message: '请选择风控等级', trigger: 'blur' }],
          ruleBasis: [{ min: 0, max: 200, message: '不能超过200个文字' }]
        },
        search: {
          ruleAuditType: '1',
          ruleName: '',
          ruleType: '',
          ruleGrade: '',
          enable: '',
          status: ''
        }
      }
    }
  },
  methods: {
    // 查询
    getTable(table) {
      this.$refs[table].reloadData()
    },
    tabChange(tab) {
      this.parent.form.ruleAuditType = tab.name
      this.parent.search.ruleAuditType = tab.name
      this.getTable('parent')
    },
    switchChange(id, val) {
      this.$http.put(config.api.parent, { id: id, enable: val })
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
  watch: {},
  components: {}
}
</script>