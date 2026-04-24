/*  @Author: litianye
 * @Date: 2018-05-10
 * @Desc: 传染病筛查规则
 */
<template>
  <div>
    <!-- 父表 -->
    <kindo-box title="查询条件" icon="xx">
      <el-form v-model.trim="search" onsubmit="return false;" label-position="right" inline @keyup.enter.prevent.native="getTable('parent')">
        <el-form-item label="诊疗项目">
          <el-input v-model.trim="search.itemName" placeholder="" clearable></el-input>
        </el-form-item>
      </el-form>
      <div slot="control">
        <el-button icon="el-icon-search" type="primary" @click="getTable('parent')">查询</el-button>
      </div>
    </kindo-box>
    <kindo-box title="传染病筛查规则信息">
      <kindo-table ref="parent" :url="url" :queryParam="search" :extendOption="extend" :default-sort="sortTable" @selection-change="(selection) => selectionChange(selection,'selection')" @current-change="tableClick" :pageSize="5">
        <el-table-column type="selection" fixed="left" width="30"></el-table-column>
        <el-table-column label="诊疗项目编码" prop="itemCode" width="140" header-align="center" sortable='custom' show-overflow-tooltip></el-table-column>
        <el-table-column label="诊疗项目名称" prop="itemName" width="160" header-align="center" sortable='custom' show-overflow-tooltip></el-table-column>
        <el-table-column label="项目内涵" prop="itemIntension" min-width="200" header-align="center" sortable='custom' show-overflow-tooltip></el-table-column>
        <el-table-column label="描述" prop="remark" min-width="200" header-align="center" show-overflow-tooltip></el-table-column>
        <el-table-column label="操作" width="100" align="center" fixed="right">
          <template slot-scope="scope">
            <el-tooltip class="item" effect="dark" :open-delay="300" content="编辑" placement="top-start">
              <el-button type="text" icon="el-icon-edit" @click="edit(scope.row,'form','','visible','tableEdit')"></el-button>
            </el-tooltip>
            <el-tooltip class="item" effect="dark" :open-delay="300" content="删除" placement="top-start">
              <el-button type="text" icon="el-icon-delete" @click="deleteOne(scope.row.id, 'parent')"></el-button>
            </el-tooltip>
          </template>
        </el-table-column>
      </kindo-table>
      <div slot="control">
        <el-button icon="el-icon-plus" type="text" @click="insert('visible', 'form')">新增</el-button>
        <el-button icon="el-icon-delete" type="text" @click="batch('selection', 'parent', 'delete')">删除</el-button>
      </div>
    </kindo-box>
    <el-tabs v-model="tabsActive" @tab-click="tabChange">
      <el-tab-pane label="低端项目" name="first">
        <todo-lowproject :parentRow="clickRow" :isOpen="tabsStatus.first"></todo-lowproject>
      </el-tab-pane>
      <el-tab-pane label="疾病" name="second">
        <todo-disease :parentRow="clickRow" :isOpen="tabsStatus.second"></todo-disease>
      </el-tab-pane>
    </el-tabs>

    <!-- 主表弹框 -->
    <el-dialog v-drag top="0" :visible.sync="visible" :title="this.form.id?'编辑':'新增'" :modal-append-to-body="false" :close-on-click-modal="false" width="450">
      <el-form :model="form" label-position="right" ref="form" class="box" label-width="90px" :rules="rules">
        <el-form-item label="诊疗项目" style="display:block;" prop="itemCode">
          <el-select v-model.trim="form.itemCode" size="mini" :disabled="!kindo.validate.isEmpty(form.id)" @blur="(ev)=>{blurSel(ev,form,'itemCode','commonDrugList')}" placeholder="请输入选择" clearable filterable :loading="loading" remote :remote-method="(query) => getDictRemote('commonDrugList', 'itemName', query)">
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
        <el-form-item label="描述" prop="remark">
          <el-input type="textarea" :rows="2" placeholder="可输入200字" v-model.trim="form.remark"></el-input>
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button type="primary" icon="fa fa-floppy-o" @click="save('form','parent','visible')">保 存</el-button>
        <el-button @click="visible = false" icon="el-icon-close" type="primary">取 消</el-button>
      </div>
    </el-dialog>
    <!-- 主表弹框 -->
  </div>
</template>

<script>
import config from './config/index.js'
import tableMixIn from '@src/utils/helper/tableMixIn.js'
// 低端项目
import LowProject from './LowProject'
import disease from './disease'

export default {
  name: 'InfectiousDiseasesRules',
  mixins: [tableMixIn],
  data() {
    return {
      // 主表默认选第一行数据
      extend: { selectedFirst: true },
      loading: false,
      tabsActive: 'first',
      tabsStatus: {
        first: false,
        second: false
      },
      // 初始化默认排序
      sortTable: {
        prop: 'itemCode',
        sort: 'ascending'
      },
      url: config.api.parent,
      selection: [],
      list: {
        commonDrugList: []
      },
      visible: false,
      form: {
        id: '',
        itemCode: '',
        remark: ''
      },
      rules: {
        itemCode: [{ required: true, message: '请输入名称', trigger: 'blur' }],
        remark: [{ min: 0, max: 200, message: '长度不能超过200' }]
      },
      search: {
        itemName: ''
      },
      clickRow: {}
    }
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
    // 编辑
    tableEdit(row) {
      this.list.commonDrugList = [{ value: row.itemCode, label: row.itemName }]
    },
    // 查询
    getTable(table) {
      this.$refs[table].reloadData()
    },
    tableChange(table, selection) {
      this[table].selection = selection
    },
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
        this.clickRow = row
        if (this.tabsStatus[this.tabsActive]) {
          this.tabsStatus[this.tabsActive] = false
        } else {
          this.tabsStatus[this.tabsActive] = true
        }
      } else {
        this.clickRow = {}
      }
    }
  },
  created() {
    this._form = Object.assign({}, this.form)
  },

  mounted() {
    this.$nextTick(() => {
      this.getTable('parent')
    })
  },
  components: {
    'todo-lowproject': LowProject,
    'todo-disease': disease
  }
}
</script>