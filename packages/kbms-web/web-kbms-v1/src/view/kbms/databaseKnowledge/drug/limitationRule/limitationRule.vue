/* @Author: zhengtian
 * @Desc: 限定条件规则
 */
<template>
  <div>
    <el-tabs v-model.trim="tabsPrimary" @tab-click="tabChange">
      <el-tab-pane label="限定条件" name="first">
        <kindo-box title="查询条件" icon="xx">
          <el-form v-model.trim="parent.search" onsubmit="return false;" label-position="right" inline @keyup.enter.prevent.native="getTable('parent')">
            <el-form-item label="限定代码">
              <el-input v-model.trim="parent.search.limitCode" placeholder="" clearable></el-input>
            </el-form-item>
            <el-form-item label="限定名称">
              <el-input v-model.trim="parent.search.limitName" placeholder="" clearable></el-input>
            </el-form-item>
            <el-form-item label="条件类型">
              <el-radio v-for="item in dict.LIMIT_TYPE" v-model.trim="parent.search.limitDefine" :key="item.value" :label="item.value">{{item.label}}</el-radio>
            </el-form-item>
          </el-form>
          <div slot="control">
            <el-button icon="el-icon-search" type="primary" @click="getTable('parent')">查询</el-button>
          </div>
        </kindo-box>
        <kindo-box title="限定条件规则信息">
          <kindo-table ref="parent" :url="parent.url" :queryParam="parent.search" :default-sort="tableSort" :extendOption="extend" @selection-change="(selection) => tableChange('parent', selection)" @current-change="tableClick" :pageSize="5">
            <el-table-column type="selection" fixed="left" width="30"></el-table-column>
            <el-table-column label="限定代码" prop="limitCode" min-width="120" header-align="center" sortable="custom" show-overflow-tooltip></el-table-column>
            <el-table-column label="限定名称" prop="limitName" min-width="120" header-align="center" sortable="custom" show-overflow-tooltip>
              <template slot-scope="scope">
                <el-tag type="'primary'" close-transition>{{scope.row.limitName}}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="限定类型" prop="restrictType" min-width="140" header-align="center" :formatter="(row, column) => kindo.dictionary.getLabel(dict.LIMIT_RESTRICT_TYPE,row[column.property])"></el-table-column>
            <el-table-column label="条件类型" prop="limitDefine" min-width="140" header-align="center" :formatter="(row, column) => kindo.dictionary.getLabel(dict.LIMIT_TYPE,row[column.property])"></el-table-column>
            <el-table-column label="精确判断" min-width="140" align="center">
              <template slot-scope="scope">
                <el-switch v-model.trim="scope.row.limitCon" active-value="1" inactive-value="2" @change="(val) => switchChange(scope.row.id, val)"></el-switch>
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
                <el-tooltip class="item" effect="dark" :open-delay="300" content="复制" placement="top-start">
                  <el-button type="text" icon="el-icon-tickets" @click="copy('parent', scope.row.id)"></el-button>
                </el-tooltip>
              </template>
            </el-table-column>
          </kindo-table>
          <div slot="control">
            <el-button icon="el-icon-plus" type="text" @click="add('parent', 'limitDefine,limitType,limitCon','parentForm')">新增</el-button>
            <el-button icon="el-icon-delete" type="text" @click="remove('parent')">删除</el-button>
          </div>
        </kindo-box>
        <el-tabs v-model.trim="tabsActive" @tab-click="tabChange">
          <el-tab-pane label="精确判断" name="first">
            <todo-accuracy :parentRow="parent.clickRow" :isOpen="tabsStatus.first"></todo-accuracy>
          </el-tab-pane>
          <el-tab-pane label="模糊判断" name="second">
            <todo-fuzzy :parentRow="parent.clickRow" :isOpen="tabsStatus.second"></todo-fuzzy>
          </el-tab-pane>
        </el-tabs>
      </el-tab-pane>
      <el-tab-pane label="组合条件" name="second">
        <todo-comboxLimit :formLimitDefine="parent.form.limitDefine" :searchLimitDefine="parent.search.limitDefine"></todo-comboxLimit>
      </el-tab-pane>
    </el-tabs>
    <!-- 主表弹框 -->
    <el-dialog v-drag top="0" :visible.sync="parent.dialog.visible" :title="parent.dialog.title +'条件规则'" :modal-append-to-body="false" :close-on-click-modal="false">
      <el-form :model="parent.form" class="box" onsubmit="return false;" ref="parentForm" :rules="parent.rules" label-width="90px" label-position="right">
        <el-form-item label="条件类型" prop="limitDefine">
          <el-tag size="medium"> {{kindo.dictionary.getLabel(dict.LIMIT_TYPE,this.parent.form.limitDefine)}}</el-tag>
        </el-form-item>
        <el-form-item label="限定名称" prop="limitName">
          <el-input v-model.trim="parent.form.limitName"></el-input>
        </el-form-item>
        <el-form-item label="限定类型">
          <el-select v-model.trim="parent.form.restrictType" filterable clearable>
            <el-option v-for="item in dict.LIMIT_RESTRICT_TYPE" :key="item.value" :label="item.label" :value="item.value"></el-option>
          </el-select>
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
// 适应症
import todoAccuracy from './todoAccuracy'
import todoComboxLimit from './todoComboxLimit'
import todoFuzzy from './todoFuzzy'
import tableOpra from '@src/utils/helper/tableOpra.js'
export default {
  name: 'limitationRule',
  mixins: [tableOpra],
  data() {
    return {
      // 主表默认选第一行数据
      extend: { selectedFirst: true },
      tableSort: {
        prop: 'limitCode',
        sort: 'ascending'
      },
      loading: false,
      tabsActive: 'first',
      tabsPrimary: 'first',
      dict: {
        // 审核状态
        AUDIT_STATUS: [],
        // 限定条件类型
        LIMIT_TYPE: [],
        // 限定条件
        LIMIT_RESTRICT_TYPE: []
      },
      tabsStatus: {
        first: true,
        second: false
      },
      parentOld: {
        form: {}
      },
      parent: {
        url: config.api.parent,
        selection: [],
        dialog: {
          visible: false,
          title: '新增'
        },
        form: {
          limitDefine: '2',
          limitType: '1', // '1' 默认单一限定条件
          limitCon: '2', // '2' 默认模糊
          id: '',
          limitName: '',
          restrictType: ''
        },
        rules: {
          limitDefine: [{ required: true, message: '请输入条件类型', trigger: 'blur' }],
          limitName: [{ required: true, message: '请输入限定名称', trigger: 'blur' }, { min: 0, max: 30, message: '长度不能超过30' }]
        },
        search: {
          limitDefine: '2', // '2' 默认医保限定条件
          limitType: '1', // '1' 默认单一限定条件
          limitCode: '',
          limitName: ''
        },
        clickRow: {}
      }
    }
  },
  methods: {
    tabChange(tab) {
      for (let k in this.tabsStatus) {
        if (k === tab.name) {
          this.tabsStatus[k] = true
        } else {
          this.tabsStatus[k] = false
        }
      }
    },
    tableClick(row) {
      if (row) {
        this['parent'].clickRow = row
        if (this.tabsStatus[this.tabsActive]) {
          this.tabsStatus[this.tabsActive] = false
        } else {
          this.tabsStatus[this.tabsActive] = true
        }
        this.switchTabs(row.limitCon)
      } else {
        this['parent'].clickRow = {}
      }
    },
    copy(table, id) {
      kindo.util.confirm(
        '复制后将生成相同信息的' + '【' + kindo.dictionary.getLabel(this.dict.LIMIT_TYPE, this.parent.search.limitDefine === '1' ? '2' : '1') + '】',
        undefined,
        undefined,
        () => {
          this.$http.post(config.api.copy, { id: id }).then(res => {
            kindo.util.alert(res.message, '提示', 'success')
            this.getTable(table)
          })
        }
      )
    },
    add(table, joinId, refForm) {
      kindo.util
        .promise(() => {
          if (this[table].dialog.hasOwnProperty('title')) {
            this[table].dialog.title = '新增'
          }
          this[table].dialog.visible = true
        })
        .then(() => {
          this.parentOld.form = Object.assign({}, this.parent.form)
        })
        .then(() => {
          if (refForm) {
            this.$refs[refForm].resetFields()
          } else {
            return true
          }
        })
        .then(() => {
          let row = this.parentOld.form
          this.parent.form.limitDefine = row.limitDefine
          this.parent.form.limitType = row.limitType
        })
    },
    // 根据精准判断切换从表选项卡
    switchTabs(val) {
      if (val === '1') {
        this.tabsActive = 'first'
      } else {
        this.tabsActive = 'second'
      }
    },
    switchChange(id, val) {
      this.$http.put(config.api.parent, { id: id, limitCon: val })
      this.switchTabs(val)
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
    // 条件类型
    'parent.search.limitDefine': function (v) {
      this.parent.form.limitDefine = v
      this.getTable('parent')
    }
  },
  components: {
    'todo-accuracy': todoAccuracy,
    'todo-fuzzy': todoFuzzy,
    'todo-comboxLimit': todoComboxLimit
  }
}
</script>