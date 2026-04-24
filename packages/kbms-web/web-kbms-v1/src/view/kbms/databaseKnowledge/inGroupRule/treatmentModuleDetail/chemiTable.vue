/* @Author: wuhuihui
 *菜单：知识数据库-诊疗模块详情-化学药
<template>
  <div>
    <kindo-box title="查询条件">
      <el-form :model="table_hx.search" label-position="right" onsubmit="return false;" inline
        @keyup.enter.prevent.native="getTable('table_hx')">
        <el-form-item label="药品编码">
          <el-input v-model.trim="table_hx.search.drugCode" placeholder="请输入关键字" clearable></el-input>
        </el-form-item>
        <el-form-item label="药品名称">
          <el-input v-model.trim="table_hx.search.drugName" placeholder="请输入关键字" clearable></el-input>
        </el-form-item>
      </el-form>
      <div slot="control">
        <el-button icon="el-icon-search" type="primary" :disabled="apiType === 'default' && !groupingTreatId"
          @click="getTable('table_hx')">查询</el-button>
      </div>
    </kindo-box>

    <kindo-box title="化学药信息">
      <kindo-table ref="table_hx" :url="table_hx.url"
        :queryParam="Object.assign({},table_hx.search,{groupingTreatId: groupingTreatId, groupTreatExpId: groupTreatExpId, groupTreatExpSubitem: groupTreatExpSubitem })"
        @selection-change="(selection) => tableChange('table_hx', selection)" :pageSize="5">
        <el-table-column type="selection" fixed="left" width="30"></el-table-column>
        <el-table-column label="组编码" prop="groupingCode" width="150" fixed="left" header-align="center"
          sortable='custom' show-overflow-tooltip></el-table-column>
        <el-table-column label="组名称" prop="groupingName" min-width="150" fixed="left" header-align="center"
          sortable='custom' show-overflow-tooltip></el-table-column>
        <el-table-column label="药理分类一级分类" prop="chemicalPharmacologyLName1" width="200" header-align="center"
          sortable='custom' show-overflow-tooltip></el-table-column>
        <el-table-column label="药理分类二级分类" prop="chemicalPharmacologyLName2" width="200" header-align="center"
          sortable='custom' show-overflow-tooltip></el-table-column>
        <el-table-column label="药理分类三级分类" prop="chemicalPharmacologyLName3" width="200" header-align="center"
          sortable='custom' show-overflow-tooltip></el-table-column>
        <el-table-column label="药理分类四级分类" prop="chemicalPharmacologyLName4" width="200" header-align="center"
          sortable='custom' show-overflow-tooltip></el-table-column>
        <el-table-column label="药品编码" prop="drugCode" width="150" header-align="center" sortable='custom'
          show-overflow-tooltip></el-table-column>
        <el-table-column label="药品名称" prop="drugName" min-width="150" header-align="center" sortable='custom'
          show-overflow-tooltip></el-table-column>
        <el-table-column label="功能分类一级分类" prop="chemicalFunctionLName1" width="200" header-align="center"
          sortable='custom' show-overflow-tooltip></el-table-column>
        <el-table-column label="功能分类二级分类" prop="chemicalFunctionLName2" width="200" header-align="center"
          sortable='custom' show-overflow-tooltip></el-table-column>
        <el-table-column label="功能分类三级分类" prop="chemicalFunctionLName3" width="200" header-align="center"
          sortable='custom' show-overflow-tooltip></el-table-column>
        <el-table-column label="审核状态" prop="status" v-if="apiType === 'default'" fixed="right" width="100"
          align="center" sortable='custom'>
          <template slot-scope="scope">
            <el-tag :type="scope.row.status === '1'?'success':'info'" close-transition>
              {{scope.row.status === '1'?'已审核': '未审核'}}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" align="center" fixed="right">
          <template slot-scope="scope">
            <el-tooltip class="item" effect="dark" :open-delay="300" content="新增" placement="top-start">
              <el-button type="text" icon="el-icon-plus" @click="addItem(scope.row)">新增</el-button>
            </el-tooltip>
            <el-tooltip class="item" effect="dark" :open-delay="300" content="删除" placement="top-start">
              <el-button type="text" icon="el-icon-delete" @click="remove(scope.row.id)"></el-button>
            </el-tooltip>
          </template>
        </el-table-column>
      </kindo-table>
      <div slot="control">
        <el-button icon="el-icon-plus" type="text" :disabled="apiType === 'default' && !groupingTreatId"
          @click="addGroup">新增</el-button>
        <el-button icon="el-icon-delete" type="text" :disabled="apiType === 'default' && !groupingTreatId"
          @click="remove()">删除</el-button>
        <el-button icon="el-icon-view" type="text" :disabled="apiType === 'default' && !groupingTreatId" v-if="canAudit"
          @click="auditData">审核</el-button>
      </div>
    </kindo-box>

    <!-- 新增/编辑 弹框-->
    <el-dialog v-drag top="0" width="90%" :visible.sync="table_hx.dialog.visible" title="新增化学药" append-to-body
      :close-on-click-modal="false">
      <el-form :model="table_hx.form" class="box" onsubmit="return false;" inline ref="tableForm"
        :rules="table_hx.rules" label-position="right">
        <el-form-item label="组编码" prop="groupingCode">
          <el-input disabled v-model.trim="table_hx.form.groupingCode"></el-input>
        </el-form-item>
        <el-form-item label="组名称" prop="groupingName">
          <el-input v-model.trim="table_hx.form.groupingName" ref="focusInput"></el-input>
        </el-form-item>
      </el-form>
      <kindo-box title="查询条件" icon="xx" :expand="true">
        <el-form :model="drugTable.search" label-position="right" onsubmit="return false;" inline
          @keyup.enter.prevent.native="getTable('drugTable')">
          <el-form-item label="化学药药理分类">
            <el-cascader v-model="drugTable.dict_gl" @change="changeYl" :options="drugTable.options_yl"
              :props="treeProps" placeholder="请输入关键字" style="width:400px;" filterable change-on-select clearable>
            </el-cascader>
          </el-form-item>
          <el-form-item label="化学药功能分类">
            <el-cascader v-model="drugTable.dict_yl" @change="changeGl" :options="drugTable.options_gl"
              :props="treeProps" placeholder="请输入关键字" style="width:400px;" filterable change-on-select clearable>
            </el-cascader>
          </el-form-item>
          <el-form-item label="药品" prop="drudName">
            <el-input v-model.trim="drugTable.search.drugName" clearable placeholder="请输入编码或名称"></el-input>
          </el-form-item>
        </el-form>
        <div slot="control">
          <el-button icon="el-icon-search" type="primary" @click="getTable('drugTable')">查询</el-button>
        </div>
      </kindo-box>
      <kindo-box title="未新增药品信息">
        <kindo-table ref="drugTable" :url="drugTable.url" :queryParam="drugTable.search"
          @selection-change="(selection) => tableChange('drugTable', selection)" :pageSize="10">
          <el-table-column type="selection" fixed="left" width="30"></el-table-column>
          <el-table-column label="药理分类一级分类" prop="chemicalPharmacologyLName1" width="200" header-align="center"
            sortable='custom' show-overflow-tooltip></el-table-column>
          <el-table-column label="药理分类二级分类" prop="chemicalPharmacologyLName2" width="200" header-align="center"
            sortable='custom' show-overflow-tooltip></el-table-column>
          <el-table-column label="药理分类三级分类" prop="chemicalPharmacologyLName3" width="200" header-align="center"
            sortable='custom' show-overflow-tooltip></el-table-column>
          <el-table-column label="药理分类四级分类" prop="chemicalPharmacologyLName4" width="200" header-align="center"
            sortable='custom' show-overflow-tooltip></el-table-column>
          <el-table-column label="药品编码" prop="drugCode" width="150" header-align="center" sortable='custom'
            show-overflow-tooltip></el-table-column>
          <el-table-column label="药品名称" prop="drugName" min-width="150" header-align="center" sortable='custom'
            show-overflow-tooltip></el-table-column>
          <el-table-column label="功能分类一级分类" prop="chemicalFunctionLName1" width="200" header-align="center"
            sortable='custom' show-overflow-tooltip></el-table-column>
          <el-table-column label="功能分类二级分类" prop="chemicalFunctionLName2" width="200" header-align="center"
            sortable='custom' show-overflow-tooltip></el-table-column>
          <el-table-column label="功能分类三级分类" prop="chemicalFunctionLName3" width="200" header-align="center"
            sortable='custom' show-overflow-tooltip></el-table-column>
        </kindo-table>
        <div slot="control">
          <el-button icon="el-icon-plus" type="text" @click="saveAdd">新增</el-button>
        </div>
      </kindo-box>
    </el-dialog>
    <!-- 新增/编辑 弹框-->

  </div>
</template>

<script>
import config from './config/index.js'
import tableOpra from '@src/utils/helper/tableOpra.js'
export default {
  mixins: [tableOpra],
  name: 'chemiTable',
  props: {
    // 诊疗项目所需参数 上表ID
    groupingTreatId: {
      type: String,
      default: ''
    },
    // 关联表达式诊疗所需参数 上表ID
    groupTreatExpId: {
      type: String,
      default: ''
    },
    // 关联表达式诊疗所需参数 点击子项
    groupTreatExpSubitem: {
      type: String,
      default: ''
    },
    // 是否可以进行审核
    canAudit: {
      type: Boolean,
      default: true
    },
    // api采用 诊疗模块/诊断诊疗规则
    apiType: {
      type: String,
      default: 'default'
    }
  },
  data() {
    return {
      treeProps: {
        label: 'drugCategoryName',
        value: 'id'
      },
      table_hx: {
        url: config.api[this.apiType].hx_group,
        // 已选中表格数据
        selection: [],
        // 查询实体
        search: {
          drugCode: '',
          drugName: ''
        },
        // 新增组信息
        form: {
          groupTreatExpId: '',
          groupTreatExpSubitem: '',
          groupingTreatId: '',
          groupingCode: '',
          groupingName: ''
        },
        // 表单校验规则
        rules: {
          groupingName: [{ required: true, message: '请输入名称', trigger: 'blur' }]
        },
        // 编辑、新增弹窗显示
        dialog: {
          visible: false
        }
      },
      // 新增、编辑
      drugTable: {
        url: config.api[this.apiType].table_hx,
        // 已选中表格数据
        selection: [],
        // 查询实体
        search: {
          groupingTreatId: undefined,
          groupTreatExpId: undefined,
          groupTreatExpSubitem: undefined,
          chemicalPharmacologyLId: '',
          chemicalFunctionLId: '',
          groupingCode: '',
          drugName: ''
        },
        dict_gl: [],
        dict_yl: [],
        options_yl: [],
        options_gl: []
      }
    }
  },

  watch: {
    groupingTreatId(val) {
      if (val) {
        this.$nextTick(() => {
          this.getTable('table_hx')
        })
      } else {
        this.$refs.table_hx.clearTable()
      }
    },
    groupTreatExpSubitem(val) {
      if (val) {
        this.$nextTick(() => {
          this.getTable('table_hx')
        })
      } else {
        this.$refs.table_hx.clearTable()
      }
    },
    groupTreatExpId(val) {
      if (val) {
        this.$nextTick(() => {
          this.getTable('table_hx')
        })
      } else {
        this.$refs.table_hx.clearTable()
      }
    }
  },

  created() {
    this.$http.get(config.api[this.apiType].ylTree).then(res => {
      this.drugTable.options_yl = res.data.trees
    })
    this.$http.get(config.api[this.apiType].glTree).then(res => {
      this.drugTable.options_gl = res.data.trees
    })
  },

  mounted() {
    this.$nextTick(() => {
      if (this.groupingTreatId || this.groupTreatExpSubitem || this.groupTreatExpId) {
        this.getTable('table_hx')
      } else {
        this.$refs.table_hx.clearTable()
      }
    })
  },

  methods: {
    // 新增化学药分组
    addGroup() {
      kindo.util.promise(() => {
        this.table_hx.dialog.visible = true
      }).then(() => {
        this.$refs.tableForm.resetFields()
        this.table_hx.form.groupingTreatId = this.groupingTreatId
        this.table_hx.form.groupTreatExpSubitem = this.groupTreatExpSubitem
        this.table_hx.form.groupTreatExpId = this.groupTreatExpId
        this.drugTable.search.groupingCode = ''
      }).then(() => {
        this.getTable('drugTable')
      })
    },

    // 在已有组上新增化学药
    addItem(row) {
      kindo.util.promise(() => {
        this.table_hx.dialog.visible = true
        this.drugTable.search.groupingCode = row.groupingCode
        if (this.apiType === 'default') {
          this.drugTable.search.groupingTreatId = this.groupingTreatId
        } else {
          this.drugTable.search.groupTreatExpId = this.groupTreatExpId
          this.drugTable.search.groupTreatExpSubitem = this.groupTreatExpSubitem
        }
      }).then(() => {
        this.$refs.tableForm.resetFields()
        this.table_hx.form.groupingCode = row.groupingCode
        this.table_hx.form.groupingName = row.groupingName
        this.table_hx.form.groupingTreatId = this.groupingTreatId
        this.table_hx.form.groupTreatExpSubitem = this.groupTreatExpSubitem
        this.table_hx.form.groupTreatExpId = this.groupTreatExpId
      }).then(() => {
        this.getTable('drugTable')
      })
    },

    // 批量新增
    saveAdd() {
      this.$refs.tableForm.validate(valid => {
        if (valid) {
          let ids = []
          let data = this.drugTable.selection
          if (data.length < 1) {
            kindo.util.alert('请选择一项进行操作。', '提示', 'warning')
          } else {
            for (let item of data) {
              let obj = Object.assign({}, this.table_hx.form, { relaId: item.id, drugId: item.drugId })
              ids.push(obj)
            }
            let api = ''
            if (this.table_hx.form.groupingCode) {
              // 新增已有分组项目
              api = config.api[this.apiType].add_item_hx
            } else {
              // 新增分组
              api = config.api[this.apiType].add_hx
            }
            kindo.util.confirm('请确定是否批量新增', undefined, undefined, () => {
              this.$http.post(api, ids).then(res => {
                kindo.util.alert(res.message, '提示', 'success')
                this.drugTable.search.groupingCode = res.data[0].groupingCode
                this.table_hx.form.groupingCode = res.data[0].groupingCode
                return res
              }).then(res => {
                this.getTable('table_hx')
                this.getTable('drugTable')
              })
            })
          }
        }
      })
    },

    // 删除 
    remove(id) {
      let ids = []
      if (id) {
        ids.push(id)
        kindo.util.confirm('请确定是否删除', undefined, undefined, () => {
          this.$http.delete(config.api[this.apiType].delete_hx, { data: { ids: ids } }).then(res => {
            kindo.util.alert(res.message, '提示', 'success')
            this.getTable('table_hx')
          })
        })
      } else {
        if (this.table_hx.selection.length < 1) {
          kindo.util.alert('请选择一项进行操作。', '提示', 'warning')
          return false
        } else {
          for (let item of this.table_hx.selection) {
            ids.push(item.id)
          }
          kindo.util.confirm('请确定是否删除', undefined, undefined, () => {
            this.$http.delete(config.api[this.apiType].delete_hx, { data: { ids: ids } }).then(res => {
              kindo.util.alert(res.message, '提示', 'success')
              this.getTable('table_hx')
            })
          })
        }
      }
    },

    // 审核
    auditData() {
      let ids = []
      let data = this.table_hx.selection
      if (data.length < 1) {
        kindo.util.alert('请选择一项进行操作。', '提示', 'warning')
      } else {
        for (let item of data) {
          ids.push({
            id: item.id
          })
        }
        kindo.util.confirm('请确定是否审核', undefined, undefined, () => {
          this.$http.put(config.api[this.apiType].audit, ids).then(res => {
            kindo.util.alert(res.message, '提示', 'success')
            this.getTable('table_hx')
          })
        })
      }
    },

    changeYl(v) {
      if (v) {
        this.drugTable.search.chemicalPharmacologyLId = v[v.length - 1]
      } else {
        this.drugTable.search.chemicalPharmacologyLId = ''
      }
    },

    changeGl(v) {
      if (v) {
        this.drugTable.search.chemicalFunctionLId = v[v.length - 1]
      } else {
        this.drugTable.search.chemicalFunctionLId = ''
      }
    }
  }
}
</script>
