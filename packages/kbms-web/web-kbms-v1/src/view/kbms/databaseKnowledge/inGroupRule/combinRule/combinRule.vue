/* @Author: wuhuihui
 *菜单：知识数据库-诊断诊疗组合规则
<template>
  <div>
    <!-- 父表 start -->
    <kindo-box title="查询条件" icon="xx">
      <el-form :model="parent.search" onsubmit="return false;" label-position="right" inline @keyup.enter.prevent.native="getTable('parent')">
        <el-form-item label="诊断模块编码">
          <el-input v-model.trim="parent.search.groupingDiagnosisCode" clearable placeholder="输入诊断模块编码"></el-input>
        </el-form-item>
        <el-form-item label="诊断模块名称">
          <el-input v-model.trim="parent.search.groupingDiagnosisName" clearable placeholder="输入诊断模块名称"></el-input>
        </el-form-item>
        <el-form-item label="诊疗模块名称">
          <el-input v-model.trim="parent.search.groupingTreatName" clearable placeholder="输入诊疗模块名称或编码关键字"></el-input>
        </el-form-item>
      </el-form>
      <div slot="control">
        <el-button icon="el-icon-search" type="primary" @click="getTable('parent')">查询</el-button>
      </div>
    </kindo-box>
    <kindo-box title="诊断模块信息">
      <kindo-table ref="parent" :url="parent.url" :queryParam="parent.search" :extendOption="extend" @selection-change="(selection) => tableChange('parent', selection)" @current-change="tableClick" :pageSize="5" :row-class-name="rowClassName">
        <el-table-column type="selection" fixed="left" width="30"></el-table-column>
        <el-table-column label="诊断模块编码" fixed="left" prop="groupingDiagnosisCode" min-width="150" header-align="center" show-overflow-tooltip></el-table-column>
        <el-table-column label="诊断模块名称" fixed="left" prop="groupingDiagnosisName" min-width="150" header-align="center" show-overflow-tooltip></el-table-column>
        <el-table-column label="备注" prop="remark" min-width="200" header-align="center" show-overflow-tooltip></el-table-column>
        <el-table-column label="操作" width="100" align="center" fixed="right">
          <template slot-scope="scope">
            <el-tooltip class="item" effect="dark" :open-delay="300" content="删除" placement="top-start">
              <el-button type="text" icon="el-icon-delete" @click="deleteParent(scope.row.id)"></el-button>
            </el-tooltip>
          </template>
        </el-table-column>
      </kindo-table>
      <div slot="control">
        <el-button icon="el-icon-plus" type="text" @click="addParent">新增</el-button>
        <el-button icon="el-icon-delete" type="text" @click="deleteParent()">删除</el-button>
      </div>
    </kindo-box>
    <!-- 父表 end -->

    <!-- 子表 start -->
    <kindo-box title="查询条件" icon="xx">
      <el-form :model="child.search" onsubmit="return false;" label-position="right" inline @keyup.enter.prevent.native="getTable('child')">
        <el-form-item label="诊疗关联表达式">
          <el-input v-model.trim="child.search.expressionName" placeholder="输入关键字" clearable></el-input>
        </el-form-item>
      </el-form>
      <div slot="control">
        <el-button icon="el-icon-search" type="primary" :disabled="child.search.composeId === ''?true:false" @click="getTable('child')">查询</el-button>
      </div>
    </kindo-box>
    <kindo-box title="诊疗关联表达式信息">
      <kindo-table ref="child" :height="400" :url="child.url" :queryParam="child.search" :extendOption="extend" @selection-change="(selection) => tableChange('child', selection)" :pageSize="5">
        <el-table-column type="selection" fixed="left" width="30"></el-table-column>
        <el-table-column label="诊疗关联表达式" fixed="left" prop="expressionName" min-width="140" header-align="center">
          <!-- <template slot-scope="scope">
            {{ruleDom(scope.row, [JSON.parse(scope.row.expressionTree)])}}
            <span v-for="(item,index) in scope.row.dom" :key="index">
              <span v-if="!item.value">{{item}}</span>
              <el-button v-else @click="viewDetail(item,scope.row)" style="border-radius: 15px;">{{item.label}}</el-button>
            </span>
          </template> -->
        </el-table-column>
        <el-table-column label="表达式代码" prop="expression" min-width="100" header-align="center">
        </el-table-column>
        <el-table-column label="判断类型" prop="surgeryType" width="120" align="center" sortable="custom">
          <template slot-scope="scope">
            <el-tag type="info" close-transition>{{ kindo.dictionary.getLabel(dict.GROUPPING_EXP_TYPE,scope.row.surgeryType) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" align="center" fixed="right">
          <template slot-scope="scope">
            <el-tooltip class="item" effect="dark" :open-delay="300" content="编辑" placement="top-start">
              <el-button type="text" icon="el-icon-edit" @click="editChild(scope.row)"></el-button>
            </el-tooltip>
            <el-tooltip class="item" effect="dark" :open-delay="300" content="删除" placement="top-start">
              <el-button type="text" icon="el-icon-delete" @click="remove('child', scope.row.id)"></el-button>
            </el-tooltip>
          </template>
        </el-table-column>
      </kindo-table>
      <div slot="control">
        <el-button icon="el-icon-plus" type="text" :disabled="child.search.composeId === ''?true:false" @click="addChild">新增</el-button>
        <el-button icon="el-icon-delete" type="text" :disabled="child.search.composeId === ''?true:false" @click="remove('child')">删除</el-button>
      </div>
    </kindo-box>
    <!-- 子表 end -->

    <!-- 主表新增 start -->
    <el-dialog v-drag top="0" width="1000px" @close="getTable('parent')" :visible.sync="parent.dialog.visible" title="新增诊断模块" :close-on-click-modal="false">
      <kindo-box title="查询条件" icon="xx" :expand="true">
        <el-form ref="parentForm" :model="zdTable.search" label-position="right" onsubmit="return false;" inline @keyup.enter.prevent.native="getTable('zdTable')">
          <el-form-item label="诊断模块编码" prop="code">
            <el-input v-model.trim="zdTable.search.code" clearable></el-input>
          </el-form-item>
          <el-form-item label="诊断模块名称" prop="name">
            <el-input v-model.trim="zdTable.search.name" clearable></el-input>
          </el-form-item>
        </el-form>
        <div slot="control">
          <el-button icon="el-icon-search" type="primary" @click="getTable('zdTable')">查询</el-button>
        </div>
      </kindo-box>
      <kindo-box title="诊断模块">
        <kindo-table ref="zdTable" :url="zdTable.url" :queryParam="zdTable.search" @selection-change="(selection) => tableChange('zdTable', selection)" :pageSize="10">
          <el-table-column type="selection" :selectable="(r) => r.pushStatus === '0'" fixed="left" width="30"></el-table-column>
          <el-table-column label="诊断模块编码" fixed="left" prop="code" width="150" header-align="center" sortable='custom' show-overflow-tooltip></el-table-column>
          <el-table-column label="诊断模块名称" fixed="left" prop="name" min-width="150" header-align="center" sortable='custom' show-overflow-tooltip></el-table-column>
          <el-table-column label="备注" prop="remark" min-width="200" header-align="center" show-overflow-tooltip></el-table-column>
          <el-table-column label="推送状态" prop="pushStatus" width="120" align="center" sortable='custom'>
            <template slot-scope="scope">
              <el-tag :type="scope.row.pushStatus === '1'?'success':'info'" close-transition>{{scope.row.pushStatus === '1'?'已推新增':'未新增'}}</el-tag>
            </template>
          </el-table-column>
        </kindo-table>
        <div slot="control">
          <el-button icon="el-icon-plus" type="text" @click="saveAdd">确定</el-button>
        </div>
      </kindo-box>
    </el-dialog>
    <!-- 主表新增 end -->

    <!-- 子表新增 start -->
    <el-dialog v-drag top="0" width="600px" :visible.sync="child.dialog.visible" :title="(child.form.id?'编辑':'新增') + '诊疗关联表达式'">
      <el-form :model="child.form" onsubmit="return false;" class="box" ref="childForm" label-width="90px" label-position="right">
        <rule-tree :model="child.form.expressionTree" :ruleEdit="ruleEdit" :source="source"></rule-tree>
        <el-form-item label="判断类型" prop="surgeryType">
          <el-radio-group v-model="child.form.surgeryType">
            <el-radio v-for="item in dict.GROUPPING_EXP_TYPE" :key="item.value" :label="item.value">{{ item.label }}</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button type="primary" icon="fa fa-floppy-o" @click="saveChild">保 存</el-button>
        <el-button @click="child.dialog.visible = false" icon="el-icon-close" type="primary">取 消</el-button>
      </div>
    </el-dialog>
    <!-- 子表新增 end -->

    <!--  子表诊疗详情 start -->
    <el-dialog v-drag top="0" width="90%" :visible.sync="child.zl_dialog.visible" title="诊疗项目详情" :close-on-click-modal="false">
      <zl-detail-module :groupTreatExpId="child.zl_dialog.groupingTreatExpId" :groupTreatExpSubitem="child.zl_dialog.itemId" :canAudit="false" apiType="rule"></zl-detail-module>
    </el-dialog>
    <!--  子表诊疗详情 end -->
  </div>
</template>

<script>
import config from './config/index.js'
import tableOpra from '@src/utils/helper/tableOpra.js'
import zlDetailModule from '../treatmentModuleDetail/index.vue'
import ruleTree from './配置规则.vue'
export default {
  name: 'combinRule',
  mixins: [tableOpra],
  components: {
    zlDetailModule,
    ruleTree
  },
  data() {
    return {
      // 主表默认选第一行数据
      extend: { selectedFirst: true },
      loading: false,

      parent: {
        url: config.api.parent,
        selection: [],
        dialog: {
          visible: false
        },
        form: {
          id: ''
        },
        search: {
          groupingDiagnosisCode: '',
          groupingDiagnosisName: '',
          groupingTreatName: ''
        }
      },

      child: {
        url: config.api.child,
        selection: [],
        dialog: {
          visible: false
        },
        zl_dialog: {
          groupingTreatExpId: '',
          itemId: '',
          visible: false
        },
        form: {
          id: '',
          composeId: '',
          groupingTreatExpId: '',
          expressionTree: {
            tj: '||',
            item: [],
            depth: 1,
            children: []
          },
          surgeryType: '0'
        },
        search: {
          groupingTreatExpId: '',
          expressionName: ''
        }
      },

      zdTable: {
        url: config.api.zdTable,
        selection: [],
        search: {
          code: '',
          name: ''
        }
      },
      ruleEdit: false,
      // 规则配置字典
      source: {
        ZL: []
      },
      dict: {
        GROUPPING_EXP_TYPE: [] // 判断类型
      },
      FU_HAO: [
        { label: '与', value: '&&' },
        { label: '或', value: '||' },
        { label: '非与', value: '!&&' },
        { label: '非或', value: '!||' }
      ]
    }
  },
  created() {
    // 获取数据字典
    this.getDict(this.dict)
    this.$http.get(config.api.zlQuery, { params: { rows: 1000 } }).then(res => {
      this.source.ZL = res.data.rows.map(item => {
        let obj = {
          label: item.name,
          value: item.id,
          code: item.code
        }
        return obj
      })
    })
  },

  mounted() {
    this.$nextTick(() => {
      this.getTable('parent')
    })
  },
  methods: {
    // 父表新增
    addParent() {
      kindo.util.promise(() => {
        this.parent.dialog.visible = true
      }).then(() => {
        this.$refs.parentForm.resetFields()
      }).then(() => {
        this.$refs.zdTable.reloadData()
      })
    },

    // 父表删除
    deleteParent(id) {
      let ids = []
      if (id) {
        ids.push(id)
        kindo.util.confirm('请确定是否删除', undefined, undefined, () => {
          this.$http.delete(config.api.delete, { data: { ids: ids } }).then(res => {
            kindo.util.alert(res.message, '提示', 'success')
            this.getTable('parent')
          })
        })
      } else {
        let data = this.parent.selection
        if (data.length < 1) {
          kindo.util.alert('请选择一项进行操作', '提示', 'warning')
          return false
        } else {
          for (let item of data) {
            ids.push(item.id)
          }
          kindo.util.confirm('请确定是否删除', undefined, undefined, () => {
            this.$http.delete(config.api.delete, { data: { ids: ids } }).then(res => {
              kindo.util.alert(res.message, '提示', 'success')
              this.getTable('parent')
            })
          })
        }
      }
    },

    tableClick(row) {
      if (row) {
        this.child.form.groupingTreatExpId = row.groupingTreatExpId
        this.child.form.composeId = row.id
        this.child.search.groupingTreatExpId = row.groupingTreatExpId
        this.getTable('child')
      } else {
        this.$refs.child.clearTable()
        this.child.form.groupingTreatExpId = ''
        this.child.form.composeId = ''
        this.child.search.groupingTreatExpId = ''
      }
    },
    // 批量新增
    saveAdd() {
      if (this.zdTable.selection.length > 0) {
        kindo.util.confirm('请确定是否推送 ', undefined, undefined, () => {
          let ids = this.zdTable.selection.map(item => { return { id: item.id } })
          this.$http.put(config.api.push, ids).then(res => {
            kindo.util.alert(res.message, '提示', 'success')
            this.getTable('zdTable')
          })
        })
      } else {
        kindo.util.alert('请至少勾选一条数据', '提示', 'warning')
      }
    },

    // 下表新增
    addChild() {
      kindo.util.promise(() => {
        this.child.dialog.visible = true
      }).then(() => {
        this.child.form.id = ''
        this.child.form.expressionTree = { tj: '||', item: [], itemValue: [], depth: 1, children: [] }
        this.child.form.surgeryType = '0'
        this.ruleEdit = true
      })
    },

    // 下表编辑
    editChild(row) {
      kindo.util.promise(() => {
        this.child.dialog.visible = true
      }).then(() => {
        this.child.form.id = row.id
        this.child.form.expressionTree = JSON.parse(row.expressionTree)
        this.child.form.surgeryType = row.surgeryType
        this.ruleEdit = false
      })
    },

    // 下表新增
    saveChild() {
      if (this.child.form.id) {
        let params = {
          id: this.child.form.id,
          surgeryType: this.child.form.surgeryType
        }
        this.$http.put(this.child.url, params).then(res => {
          kindo.util.alert(res.message, '提示', 'success')
          this.child.dialog.visible = false
          this.getTable('child')
        })
      } else {
        let treeData = [this.child.form.expressionTree]
        this.blTree(treeData)
        let params = {
          groupingTreatExpId: this.child.form.groupingTreatExpId,
          expressionTree: JSON.stringify(treeData[0]),
          surgeryType: this.child.form.surgeryType
        }
        this.$http.post(this.child.url + this.child.form.composeId, params).then(res => {
          kindo.util.alert(res.message, '提示', 'success')
          this.child.dialog.visible = false
          this.getTable('child')
        })
      }
    },

    // 遍历树
    blTree(data, type) {
      if (!data) {
        return
      }
      for (let i in data) {
        let itemData = data[i]
        itemData.item = itemData.itemValue.map(item => {
          let obj = {
            label: kindo.dictionary.getLabel(this.source.ZL, item),
            value: item
          }
          return obj
        })
        if (itemData.children && itemData.children.length > 0) {
          this.blTree(itemData.children)
        }
      }
    },

    // 遍历生成诊疗关联表达式
    ruleDom(row, tree, parentTree) {
      if (!tree) {
        row.dom = []
        return
      }
      for (let i = 0, length = tree.length; i < length; i++) {
        let itemData = tree[i]
        if (itemData.depth === 1) {
          row.dom = []
        } else if (itemData.item.length + itemData.children.length > 0) {
          if (parentTree.item.length > 0 || i !== 0) {
            if (parentTree.tj === '||' || parentTree.tj === '!||') {
              row.dom.push(' 或 ')
            } else if (parentTree.tj === '&&' || parentTree.tj === '!&&') {
              row.dom.push(' 与 ')
            }
          }
          if (itemData.item.length + itemData.children.length > 1) {
            row.dom.push(' ( ')
          }
        }
        if (itemData.tj === '!&&' || itemData.tj === '!||') {
          row.dom.push('非 ( ')
        }
        for (let k = 0, len = itemData.item.length; k < len; k++) {
          row.dom.push(itemData.item[k])
          if ((itemData.tj === '||' || itemData.tj === '!||') && (k < len - 1)) {
            row.dom.push(' 或 ')
          } else if ((itemData.tj === '&&' || itemData.tj === '!&&') && (k < len - 1)) {
            row.dom.push(' 与 ')
          }
        }
        if (itemData.children && itemData.children.length > 0) {
          this.ruleDom(row, itemData.children, itemData)
        }
        if (itemData.depth !== 1 && (itemData.item.length + itemData.children.length > 1)) {
          row.dom.push(' ) ')
        }
        if (itemData.tj === '!&&' || itemData.tj === '!||') {
          row.dom.push(' ) ')
        }
      }
    },

    // 下表诊疗表达式查看详情
    viewDetail(item, row) {
      this.child.zl_dialog.visible = true
      // this.child.zl_dialog.groupingTreatExpId = this.child.search.groupingTreatExpId
      this.child.zl_dialog.groupingTreatExpId = row.id
      this.child.zl_dialog.itemId = item.value
    },

    rowClassName({ row }) {
      if (row.groupingDiagnosisStatus === '0') {
        return 'disable'
      }
    },

    getDict(dict, filtersDict) {
      for (let k in dict) {
        if (dict.hasOwnProperty(k)) {
          kindo.dictionary
            .getDictionary(k)
            .then(res => {
              dict[k] = res || []
            })
            .then(() => {
              // 表内筛选数据字典字段名转换
              if (filtersDict && filtersDict.hasOwnProperty(k)) {
                for (let i = 0; i < dict[k].length; i++) {
                  filtersDict[k].push({
                    text: dict[k][i].label,
                    value: dict[k][i].value
                  })
                }
              }
            })
        }
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.kindo-table /deep/ .disable td {
  background: #c0c4cc !important;
}
</style>