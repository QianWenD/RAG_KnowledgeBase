/* @Author: wuhuihui
 * 菜单：化学药分类关联
 */

<template>
  <div>
    <kindo-box title="查询条件" icon="xx">
      <el-form :model="search" label-position="right" onsubmit="return false;" inline @keyup.enter.prevent.native="get('table')">
        <el-form-item label="药品编码">
          <el-input v-model.trim="search.drugCode" placeholder="请输入关键字" clearable></el-input>
        </el-form-item>
        <el-form-item label="药品名称">
          <el-input v-model.trim="search.drugName" placeholder="请输入关键字" clearable></el-input>
        </el-form-item>
      </el-form>
      <div slot="control">
        <el-button icon="el-icon-search" type="primary" @click="get('table')">查询</el-button>
      </div>
    </kindo-box>
    <kindo-box title="中成药分类关联">
      <kindo-table ref="table" :url="url" :queryParam="search" @selection-change="(selection) => selectionChange(selection, 'selection')" @filter-change="(filters) => filterChange(filters, 'table', 'search')">
        <el-table-column type="selection" fixed="left" width="30"></el-table-column>
        <el-table-column label="药品编码" fixed="left" prop="drugCode" width="150" header-align="center" sortable="custom" show-overflow-tooltip></el-table-column>
        <el-table-column label="药品名称" fixed="left" prop="drugName" min-width="200" header-align="center" sortable="custom" show-overflow-tooltip></el-table-column>
        <el-table-column label="分类一" prop="chineseMedicineLName1" min-width="200" sortable="custom" header-align="center" show-overflow-tooltip></el-table-column>
        <el-table-column label="分类二" prop="chineseMedicineLName2" min-width="200" sortable="custom" header-align="center" show-overflow-tooltip></el-table-column>
        <el-table-column label="分类三" prop="chineseMedicineLName3" min-width="200" sortable="custom" header-align="center" show-overflow-tooltip></el-table-column>
        <!-- <el-table-column label="分类四" prop="chineseMedicineLName4" min-width="200" sortable="custom" header-align="center" show-overflow-tooltip></el-table-column> -->
        <el-table-column label="操作" width="100" align="center" fixed="right">
          <template slot-scope="scope">
            <el-tooltip class="item" effect="dark" :open-delay="300" content="编辑" placement="top-start">
              <el-button type="text" icon="el-icon-edit" @click="edit(scope.row)"></el-button>
            </el-tooltip>
            <el-tooltip class="item" effect="dark" :open-delay="300" content="删除" placement="top-start">
              <el-button type="text" icon="el-icon-delete" @click="deleteOne(scope.row.id, 'table')"></el-button>
            </el-tooltip>
          </template>
        </el-table-column>
      </kindo-table>
      <div slot="control">
        <el-button icon="el-icon-plus" type="text" @click="insert">新增</el-button>
        <el-button icon="el-icon-delete" type="text" @click="batch('selection', 'table', 'delete')">删除</el-button>
      </div>
    </kindo-box>
    <el-dialog v-drag top="0" :visible.sync="visible" :title="(form.id?'编辑':'新增') +'中成药分类关联'" :modal-append-to-body="false" :close-on-click-modal="false">
      <el-form :model="form" :rules="formRules" class="box" onsubmit="return false;" label-width="90px" ref="form">
        <el-form-item label="药品名称" prop="drugId">
          <el-select v-model.trim="form.drugId" :disabled="form.id !== ''" size="mini" @blur="(ev)=>{blurSel(ev,form,'drugId','commonDrugList')}" placeholder="请输入选择" clearable filterable :loading="loading" remote :remote-method="getDictRemote">
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
              <span>{{ item.code }}</span>
              <span>{{ item.label }}</span>
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item v-for="(item, index) in treeDataYl" :label="item.drugCategoryName" :key="item.id" :prop="'chineseMedicineLId'+index+1">
          <el-select v-model="form['chineseMedicineLId'+(index+1)]" clearable>
            <el-option v-for="idata in item.children" :key="idata.id" :value="idata.id" :label="idata.drugCategoryName"></el-option>
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
  name: 'chineseReative',
  mixins: [tableMixIn],
  data() {
    return {
      url: config.api.table,
      loading: false,
      // 查询实体
      search: {
        drugCode: '',
        drugName: ''
      },
      list: {
        commonDrugList: []
      },
      // 已选中表格数据
      selection: [],

      // 编辑、新增弹窗显示
      visible: false,
      // 新增、编辑表单
      form: {
        id: '',
        drugId: '',
        chineseMedicineLId1: undefined,
        chineseMedicineLId2: undefined,
        chineseMedicineLId3: undefined,
        chineseMedicineLId4: undefined
      },
      // 表单校验规则
      formRules: {
        drugId: [{ required: true, message: '请查询后选择', trigger: 'blur' }]
      },

      treeDataYl: []
    }
  },

  created() {
    this._form = Object.assign({}, this.form)

    // 获取药理分类
    this.$http.get(config.api.ylQuery).then(res => {
      this.treeDataYl = res.data.trees || []
    })
  },

  mounted() {
    this.$nextTick(() => {
      this.get('table')
    })
  },

  methods: {
    // 药品远程查询
    getDictRemote(searchVal) {
      let param = { rows: 200, hcGenericName: searchVal }
      this.$http.get(config.api.drugQuery, { params: param }).then(res => {
        this.list.commonDrugList =
          res.data.rows.map(item => {
            return { label: item.hcGenericName, value: item.id, code: item.hcDrugCode }
          }) || []
      })
    },

    insert() {
      kindo.util.promise(() => {
        this.visible = true
      }).then(() => {
        this.$refs.form.clearValidate()
        this.form = Object.assign({}, this._form)
      }).then(() => {
        this.list.commonDrugList = []
      })
    },
    /*
       * 表格编辑方法
       */
    edit(row) {
      kindo.util.promise(() => {
        this.visible = true
      }).then(() => {
        // 初始化，去除校验提示并清空实体
        this.$refs.form.clearValidate()
        this.form = Object.assign({}, this._form)
      }).then(() => {
        for (var key in row) {
          if (this.form.hasOwnProperty(key) === true) {
            this.form[key] = row[key]
          }
        }
        this.list.commonDrugList = [{ code: row.drugCode, label: row.drugName, value: row.drugId }]
      })
    }
  }
}
</script>
