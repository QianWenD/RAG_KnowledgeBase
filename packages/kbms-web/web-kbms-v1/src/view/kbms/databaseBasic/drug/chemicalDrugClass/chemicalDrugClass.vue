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
    <kindo-box title="化学药分类关联">
      <kindo-table ref="table" :url="url" :queryParam="search" @selection-change="(selection) => selectionChange(selection, 'selection')" @filter-change="(filters) => filterChange(filters, 'table', 'search')">
        <el-table-column type="selection" fixed="left" width="30"></el-table-column>
        <el-table-column label="药理分类一级分类" prop="chemicalPharmacologyLName1" width="200" header-align="center" sortable="custom" show-overflow-tooltip></el-table-column>
        <el-table-column label="药理分类二级分类" prop="chemicalPharmacologyLName2" width="200" header-align="center" sortable="custom" show-overflow-tooltip></el-table-column>
        <el-table-column label="药理分类三级分类" prop="chemicalPharmacologyLName3" width="200" header-align="center" sortable="custom" show-overflow-tooltip></el-table-column>
        <el-table-column label="药理分类四级分类" prop="chemicalPharmacologyLName4" width="200" header-align="center" sortable="custom" show-overflow-tooltip></el-table-column>
        <el-table-column label="药品编码" prop="drugCode" width="150" header-align="center" sortable="custom" show-overflow-tooltip></el-table-column>
        <el-table-column label="药品名称" prop="drugName" min-width="150" header-align="center" sortable="custom" show-overflow-tooltip></el-table-column>
        <el-table-column label="功能分类一级分类" prop="chemicalFunctionLName1" width="200" header-align="center" sortable="custom" show-overflow-tooltip></el-table-column>
        <el-table-column label="功能分类二级分类" prop="chemicalFunctionLName2" width="200" header-align="center" sortable="custom" show-overflow-tooltip></el-table-column>
        <el-table-column label="功能分类三级分类" prop="chemicalFunctionLName3" width="200" header-align="center" sortable="custom" show-overflow-tooltip></el-table-column>
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
    <el-dialog v-drag top="0" :visible.sync="visible" :title="(form.id?'编辑':'新增') +'化学药分类关联'" width="900px" :modal-append-to-body="false" :close-on-click-modal="false">
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
        <el-row>
          <el-col :span="12">
            <el-form-item label="药理分类">
              <el-input placeholder="输入关键字进行过滤" v-model.trim="filterTextYl"></el-input>
              <el-tree class="treeYl" ref="treeYl" highlight-current node-key="id" :data="treeDataYl" :props="treeProps" :default-expanded-keys="openKeysYl" :current-node-key="currentKeyYl" :filter-node-method="filterNode" @current-change="(data, node) => currentChange(data, node, 'chemicalPharmacologyLId')" style="height:490px;overflow:auto;"></el-tree>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="功能分类">
              <el-input placeholder="输入关键字进行过滤" v-model.trim="filterTextGn"></el-input>
              <el-tree class="treeGl" ref="treeGn" highlight-current node-key="id" :data="treeDataGn" :props="treeProps" :default-expanded-keys="openKeysGn" :current-node-key="currentKeyGn" :filter-node-method="filterNode" @current-change="(data, node) => currentChange(data, node, 'chemicalFunctionLId')" style="height:490px;overflow:auto;"></el-tree>
            </el-form-item>
          </el-col>
        </el-row>
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
  name: 'chemicalDrugClass',
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
        chemicalPharmacologyLId1: undefined,
        chemicalPharmacologyLId2: undefined,
        chemicalPharmacologyLId3: undefined,
        chemicalPharmacologyLId4: undefined,
        chemicalFunctionLId1: undefined,
        chemicalFunctionLId2: undefined,
        chemicalFunctionLId3: undefined
      },
      // 表单校验规则
      formRules: {
        drugId: [{ required: true, message: '请查询后选择', trigger: 'blur' }]
      },

      filterTextGn: '',
      openKeysGn: [],
      treeDataGn: [],
      currentKeyGn: '',

      filterTextYl: '',
      openKeysYl: [],
      treeDataYl: [],
      currentKeyYl: '',

      treeProps: {
        children: 'children',
        label: 'drugCategoryName'
      }
    }
  },

  created() {
    this._form = Object.assign({}, this.form)

    // 获取药理分类
    this.$http.get(config.api.ylQuery).then(res => {
      this.treeDataYl = res.data.trees || []
    })

    // 获取功能分类
    this.$http.get(config.api.gnQuery).then(res => {
      this.treeDataGn = res.data.trees || []
    })
  },

  mounted() {
    this.$nextTick(() => {
      this.get('table')
    })
  },

  watch: {
    filterTextYl(val) {
      this.$refs.treeYl.filter(val)
    },
    filterTextGn(val) {
      this.$refs.treeGn.filter(val)
    }
  },

  methods: {
    /*
    目的：节点树的过滤的方法，
   1、vaule树节点的值，类型-字符串
   2、data 树节点 类型-对象
   */
    filterNode(value, data) {
      if (!value) return true
      return data.drugCategoryName.indexOf(value) !== -1
    },

    // 选中节点变化时
    currentChange(data, node, name) {
      if (name === 'chemicalPharmacologyLId') {
        this.form.chemicalPharmacologyLId1 = ''
        this.form.chemicalPharmacologyLId2 = ''
        this.form.chemicalPharmacologyLId3 = ''
        this.form.chemicalPharmacologyLId4 = ''
      } else {
        this.form.chemicalFunctionLId1 = ''
        this.form.chemicalFunctionLId2 = ''
        this.form.chemicalFunctionLId3 = ''
      }
      let bltree = (item) => {
        this.form[name + item.level] = item.data.id
        if (item.parent) {
          bltree(item.parent)
        }
      }
      bltree(node)
    },

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
        this.currentKeyYl = null
        this.currentKeyGn = null
        this.filterTextYl = ''
        this.filterTextGn = ''
        this.openKeysYl = []
        this.openKeysGn = []
      }).then(() => {
        this.$refs.treeYl.setCurrentKey(this.currentKeyYl)
        this.$refs.treeGn.setCurrentKey(this.currentKeyGn)
        this.list.commonDrugList = []
        this.form = Object.assign(this.form, this._form)
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
        this.openKeysYl = []
        this.openKeysGn = []
      }).then(() => {
        for (var key in row) {
          if (this.form.hasOwnProperty(key) === true) {
            this.form[key] = row[key]
          }
        }
        if (row.chemicalPharmacologyLId4) {
          this.currentKeyYl = row.chemicalPharmacologyLId4
        } else if (row.chemicalPharmacologyLId3) {
          this.currentKeyYl = row.chemicalPharmacologyLId3
        } else if (row.chemicalPharmacologyLId2) {
          this.currentKeyYl = row.chemicalPharmacologyLId2
        } else if (row.chemicalPharmacologyLId1) {
          this.currentKeyYl = row.chemicalPharmacologyLId1
        } else {
          this.currentKeyYl = null
        }
        if (row.chemicalFunctionLId3) {
          this.currentKeyGn = row.chemicalFunctionLId3
        } else if (row.chemicalFunctionLId2) {
          this.currentKeyGn = row.chemicalFunctionLId2
        } else if (row.chemicalFunctionLId1) {
          this.currentKeyGn = row.chemicalFunctionLId1
        } else {
          this.currentKeyGn = null
        }
        this.filterTextYl = ''
        this.filterTextGn = ''
        if (this.currentKeyYl) {
          this.openKeysYl.push(this.currentKeyYl)
        }
        if (this.currentKeyGn) {
          this.openKeysGn.push(this.currentKeyGn)
        }
        this.$refs.treeYl.setCurrentKey(this.currentKeyYl)
        this.$refs.treeGn.setCurrentKey(this.currentKeyGn)
        this.list.commonDrugList = [{ code: row.drugCode, value: row.drugId, label: row.drugName }]
      })
    }
  }
}
</script>
