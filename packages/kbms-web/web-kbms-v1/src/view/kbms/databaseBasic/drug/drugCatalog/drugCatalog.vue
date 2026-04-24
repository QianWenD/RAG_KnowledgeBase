/*@Author: lilizhou
  *菜单：基础库-药品基础库-药理类别库
 */
<template>
  <div>
    <el-row>
      <el-col :xs="12" :sm="12" :md="10" :lg="6" :xl="8">
        <kindo-box title="药理类别信息" icon="xx" style="margin-bottom:0px;">
          <el-form label-position="right" onsubmit="return false;" label-width="60px" inline>
            <el-form-item>
              <el-input placeholder="请输入关键字" v-model.trim="filterText" suffix-icon="el-icon-search" clearable>
              </el-input>
            </el-form-item>
          </el-form>
        </kindo-box>
        <el-tree :style="treeHeight" :data="treeData" node-key="id" id="drugCatelogTree" ref="tree" @node-click="clickNode" :highlight-current="true" :default-expanded-keys="openKeys" :props="treeProp" :filter-node-method="filterNode" :expand-on-click-node="false">
          <span class="custom-tree-node" slot-scope="{node, data}">
            <span>{{ node.label }}</span>
            <span style="color: #409EFF; padding-left:4px;">
              <span class="el-icon-plus" @click="append(data)">
              </span>
              <span @click="modify(node, data)" class="el-icon-edit-outline" v-if="node.level!==1">
              </span>
              <span @click="remove(node, data)" class="el-icon-minus" v-if="node.isLeaf&&node.level!==1">
              </span>
            </span>
          </span>
        </el-tree>
      </el-col>
      <el-col :xs="12" :sm="12" :md="14" :lg="18" :xl="16" id="mianHeight">
        <kindo-box title="查询条件" icon="xx">
          <el-form :model="search" label-position="right" onsubmit="return false;" inline @keyup.enter.prevent.native="get">
            <el-form-item label="药品名称">
              <el-input v-model.trim="search.hcGenericName" clearable></el-input>
            </el-form-item>
            <el-form-item label="药理类别">
              <el-input v-model.trim="search.drugCategoryName" clearable></el-input>
            </el-form-item>
            <el-form-item label="药品剂型">
              <el-input v-model.trim="search.actualFormName" clearable></el-input>
            </el-form-item>
          </el-form>
          <div slot="control">
            <el-button icon="el-icon-search" type="primary" @click="get" :disabled="kindo.validate.isEmpty(search.drugCategoryCode)">查询</el-button>
          </div>
        </kindo-box>
        <kindo-box title="关联药品信息">
          <kindo-table ref="table1" :url="url" :queryParam="search" @selection-change="selectionChange">
            <el-table-column type="selection" fixed="left" width="30"></el-table-column>
            <el-table-column label="药品编码" fixed="left" prop="hcDrugCode" min-width="120" header-align="center" sortable='custom' show-overflow-tooltip></el-table-column>
            <el-table-column label="药品名称" prop="hcGenericName" min-width="140" header-align="center" sortable='custom' show-overflow-tooltip></el-table-column>
            <el-table-column label="药理类别" prop="drugCategoryName" min-width="120" header-align="center" sortable='custom' show-overflow-tooltip></el-table-column>
            <el-table-column label="剂型" prop="actualFormName" min-width="100" header-align="center" sortable='custom' show-overflow-tooltip></el-table-column>
            <el-table-column label="备注" prop="remark" min-width="120" header-align="center" sortable='custom' show-overflow-tooltip></el-table-column>
            <el-table-column label="审核状态" prop="status" width="100" align="center" sortable='custom' show-overflow-tooltip>
              <template slot-scope="scope">
                <el-tag :type="scope.row.status === '1'?'success':'primary'" close-transition>{{kindo.dictionary.getLabel(dict.AUDIT_STATUS,scope.row.status)}}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="60" align="center" fixed="right">
              <template slot-scope="scope">
                <el-tooltip class="item" effect="dark" :open-delay="300" content="删除" placement="top-start">
                  <el-button type="text" icon="el-icon-delete" @click="deleteOne(scope.$index,scope.row)"></el-button>
                </el-tooltip>
              </template>
            </el-table-column>
          </kindo-table>
          <div slot="control">
            <el-button icon="el-icon-plus" type="text" @click="insert" :disabled="insertable">新增</el-button>
            <el-button icon="el-icon-view" type="text" @click="audit">审核</el-button>
            <el-button icon="el-icon-delete" type="text" @click="batchDelete">删除</el-button>
          </div>
        </kindo-box>
      </el-col>
    </el-row>
    <!-- 关联药品新增/编辑弹出框starts-->
    <el-dialog top="0" :visible.sync="visible1" :title="(dialog1.id?'编辑':'新增') +insertTitle+'关联药品'" :modal-append-to-body="false" :close-on-click-modal="false">
      <el-form :model="dialog1" label-position="right" onsubmit="return false;" ref="dialog1Form" label-width="90px" :rules="dialog1Rules">
        <el-form-item label="药理类别">
          <el-input v-model.trim="insertTitle" disabled></el-input>
        </el-form-item>
        <el-form-item label="药品名称" prop="hcDrugCode">
          <el-select v-model.trim="dialog1.hcDrugCode" placeholder="请选择(可输入搜索)" clearable filterable @blur="(ev)=>{blurSel(ev)}" :loading="loading" remote :remote-method="remoteMethod">
            <li class="title">
              <span>代码值</span>
              <span>代码标题</span>
            </li>
            <li class="tip">
              <span>
                &lt;请选择&gt;
              </span>
            </li>
            <el-option v-for="item in list.drugList" :key="item.value" :label="item.label" :value="item.value">
              <span>{{ item.value }}</span>
              <span>{{ item.label }}</span>
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="药品剂型" prop="actualFormName">
          <el-input v-model.trim="dialog1.actualFormName" disabled></el-input>
        </el-form-item>
        <el-form-item label="备注" prop="remark" class="oneLineTextarea">
          <el-input type="textarea" resize="none" :rows="2" placeholder="请输入内容" disabled v-model.trim="dialog1.remark"></el-input>
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button type="primary" icon="fa fa-floppy-o" @click="save">保存</el-button>
        <el-button @click="visible1 = false" icon="el-icon-close" type="primary">取 消</el-button>
      </div>
    </el-dialog>
    <!-- 关联药品新增/编辑弹出框ends-->
    <!-- 新增节点弹出框starts-->
    <el-dialog top="0" :visible.sync="visible2" :title="dialogTitle2" :modal-append-to-body="false" :close-on-click-modal="false">
      <el-form :model="dialog2" ref="dialog2Form" label-position="right" label-width="100px" onsubmit="return false;" :rules="dialog2Rules">
        <el-form-item label="子节点名称" style="display:block;" prop="drugCategoryName">
          <el-input v-model.trim="dialog2.drugCategoryName" clearable></el-input>
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button type="primary" icon="fa fa-floppy-o" @click="saveDialog2">保存</el-button>
        <el-button @click="visible2 = false" icon="el-icon-close" type="primary">取 消</el-button>
      </div>
    </el-dialog>
    <!-- 新增节点弹出框ends-->
  </div>
</template>

<script>
import config from './config/index.js'
import mixin from '@src/utils/helper/tableMixIn.js'

export default {
  name: 'drugCatalog',
  mixin: [mixin],
  data() {
    return {
      treeWidth: 0,
      treeHeight: {
        height: 'auto',
        overflow: 'scroll'
      },
      loading: false,
      list: { drugList: [] },
      // 树结构的数据
      treeData: [],
      treeProp: {
        children: 'children',
        label: 'drugCategoryName'
      },
      dict: {
        // 审核状态
        AUDIT_STATUS: [],
        CHARGE_LEVEL: []
      },
      // actualFormNameList: [],
      filtersDict: {
        // 表内筛选审核状态数组
        AUDIT_STATUS: []
      },
      insertable: true,
      filterText: '',
      openKeys: [],
      treeUrl: config.api.tree,
      url: config.api.table,
      search: {
        drugCategoryCode: '',
        drugCategoryName: '',
        hcGenericName: '',
        actualFormName: '',
        status: ''
      },
      insertTitle: '',
      visible1: false,
      dialog1Rules: {
        hcDrugCode: [{ required: true, message: '请选择', trigger: 'blur' }]
      },
      dialog1: {
        id: '',
        drugCategoryCode: '',
        hcDrugCode: '',
        actualFormName: '',
        remark: ''
      },
      selection: [],
      dialog2: { drugCategoryName: '' },
      dialog2Rules: {
        drugCategoryName: [{ required: true, message: '请输入', trigger: 'blur' }, { min: 0, max: 30, message: '长度不能超过30' }]
      },
      visible2: false,
      dialogTitle2: '',
      // 临时保存的新增节点的数据
      tempAddData: {},
      // 临时保存的Vnode的数据
      tempModifyVnode: {},
      // 如果是新增操作，默认是true
      addOperate: true,
      timeout: null
    }
  },

  created() {
    this._dialog1 = Object.assign({}, this.dialog1)
    for (let k in this.dict) {
      if (this.dict.hasOwnProperty(k)) {
        kindo.dictionary.getDictionary(k).then(res => {
          this.dict[k] = res || []
          if (this.filtersDict.hasOwnProperty(k)) {
            this.filtersDict[k] = res.map(item => {
              return { text: item.label, value: item.value }
            })
          }
        })
      }
    }
    // 获取所有剂型编码和名称的接口
    // this.$http.get(config.api.actualFormName).then(res => {
    //   this.actualFormNameList = res.data
    // })
  },

  mounted() {
    this.$nextTick(() => {
      // 加载树的结构
      this.getTree()
      // 获取tree的初始宽度，15是滚动条的高度
      this.treeWidth = Math.floor(document.getElementById('drugCatelogTree').offsetWidth - 15)
      this.treeHeight.height = document.body.clientHeight - document.querySelector('#drugCatelogTree').offsetTop - document.querySelector('.main').offsetTop - 10 + 'px'
    })
  },

  methods: {
    blurSel(ev) {
      setTimeout(() => {
        if (this.dialog1.hcDrugCode === '') {
          this.list.drugList = []
        }
      }, 500)
    },
    // 查询右侧的表格
    get() {
      if (this.search.drugCategoryCode) {
        this.$refs.table1.reloadData()
      }
    },
    /*
    目的：重新加载树，并且展开到制定的节点
    1、id，展开节点的id值，类型-字符串
    */
    getTree(id) {
      if (id) {
        this.openKeys = [id]
      }
      this.$http.get(this.treeUrl).then(res => {
        this.treeData = res.data.trees
      })
    },
    // 新增
    insert() {
      if (this.search.drugCategoryCode) {
        kindo.util
          .promise(() => {
            let treeNode = this.$refs.tree.getCurrentNode()
            this.insertTitle = treeNode.drugCategoryName
            this.visible1 = true
          })
          .then(() => {
            this.$refs.dialog1Form.resetFields()
          })
          .then(() => {
            Object.assign(this.dialog1, this._dialog1)
            this.list.drugList = []
          })
      } else {
        kindo.util.alert('请首先选择右侧的药理类别', '提示', 'info')
      }
    },
    /*
      目的： 当表格中选择项发生变化时，
      1、selection 表的选择的项目，类型-数组
    */
    selectionChange(selection) {
      this.selection = selection
    },

    // 保存
    save() {
      this.$refs.dialog1Form.validate(valid => {
        if (valid) {
          this.dialog1.drugCategoryCode = this.search.drugCategoryCode
          if (this.dialog1.id) {
            // 编辑保存
            this.$http.put(config.api.table, this.dialog1).then(res => {
              kindo.util.alert(res.message, '提示', 'success')
              this.visible1 = false
              this.get()
            })
          } else {
            // 新增保存
            this.$http.post(config.api.table, this.dialog1).then(res => {
              kindo.util.alert(res.message, '提示', 'success')
              this.visible1 = false
              this.get()
            })
          }
        }
      })
    },
    /*
     目的： 表内点击删除的时候，
     1、index 表的索引，类型-数字
     2、row 表的当前数据，类型-对象
    */
    deleteOne(index, row) {
      kindo.util.confirm('请确定删除', undefined, undefined, () => {
        let params = { data: { ids: [row.id] } }
        this.$http.delete(config.api.table, params).then(res => {
          kindo.util.alert(res.message, '提示', 'success')
          this.get()
        })
      })
    },
    // 批量删除
    batchDelete() {
      if (this.selection.length > 0) {
        kindo.util.confirm('请确定批量删除 ', undefined, undefined, () => {
          let params = this.selection.map(item => {
            return item.id
          })
          this.$http.delete(config.api.table, { data: { ids: params } }).then(res => {
            kindo.util.alert(res.message, '提示', 'success')
            this.get()
          })
        })
      } else {
        kindo.util.alert('请至少勾选一条数据', '提示', 'warning')
      }
    },
    // 审核
    audit() {
      if (this.selection.length > 0) {
        kindo.util.confirm('请确定通过审核 ', undefined, undefined, () => {
          let params = this.selection.map(item => {
            return { id: item.id }
          })
          this.$http.put(config.api.table + 'batchAudit', params).then(res => {
            kindo.util.alert(res.message, '提示', 'success')
            this.get()
          })
        })
      } else {
        kindo.util.alert('请至少勾选一条数据', '提示', 'warning')
      }
    },
    // 导入
    importData() { },
    // 导出
    exportData() {
      window.open(kindo.util.exportUrl(config.api.export, this.search))
    },

    /*
    目的：节点树的过滤的方法，
   1、vaule树节点的值，类型-字符串
   2、data 树节点 类型-对象
   */
    filterNode(value, data) {
      if (!value) return true
      return data.drugCategoryName.indexOf(value) !== -1
    },
    /*
    目的：点击节点的时候，设置样式和右侧按钮是否可以disable
   1、data 点击树节点的数据 类型-对象
   2、node 点击树节点vnode的数据, 类型-对象
   3、self 点击树节点树节点的vue数据 类型-Vuecomponent
   */
    clickNode(data, node, self) {
      // 动态调整tree的宽度
      let paddingLeft = self.$el.firstElementChild.style.paddingLeft.slice(0, self.$el.firstElementChild.style.paddingLeft.length - 2)
      let iconWidth = self.$el.querySelector('.el-tree-node__expand-icon').offsetWidth
      let tempWidth = self.$el.querySelector('.custom-tree-node').firstChild.offsetWidth + iconWidth + parseFloat(paddingLeft) + 100
      if (this.treeWidth < tempWidth) {
        document.querySelector('#drugCatelogTree').style.width = tempWidth + 'px'
      } else {
        document.querySelector('#drugCatelogTree').style.width = this.treeWidth
      }
      Array.from(document.querySelectorAll('.currentNode')).map(domItem => {
        domItem.className = 'el-tree-node__content'
      })
      self.$el.firstChild.className = self.$el.firstChild.className + ' currentNode'
      this.search.drugCategoryCode = data.drugCategoryCode
      if (node.level !== 1) {
        this.insertable = false
      } else {
        this.insertable = true
      }
      setTimeout(() => {
        this.get()
      })
    },
    /*
  目的：点击新增树节点的时候
 2、data 树节点 类型-对象
 */
    append(data) {
      this.dialogTitle2 = '新增' + data.drugCategoryName + '子节点'
      this.addOperate = true
      this.visible2 = true
      this.dialog2.drugCategoryName = ''
      this.tempAddData = data
    },
    // 保存树的操作的数据
    saveDialog2() {
      this.$refs.dialog2Form.validate(valid => {
        if (valid) {
          if (this.addOperate) {
            // 如果是新增操作
            this.$http
              .post(config.api.saveTree, { drugCategoryName: this.dialog2.drugCategoryName, parentCode: this.tempAddData.drugCategoryCode })
              .then(res => {
                this.getTree(this.tempAddData.id)
                this.visible2 = false
              })
          } else {
            this.$http.put(config.api.saveTree, { id: this.tempModifyVnode.data.id, drugCategoryName: this.dialog2.drugCategoryName }).then(res => {
              this.getTree(this.tempModifyVnode.parent.data.id)
              this.visible2 = false
            })
          }
        }
      })
    },
    /*
目的：删除节点的时候，
1、node 点击树节点vnode的数据, 类型-对象
2、data 点击树节点的数据 类型-对象
*/
    remove(node, data) {
      if (node.isLeaf) {
        // 如果是叶子节点
        kindo.util.confirm('此操作将永久删除该节点, 是否继续?', undefined, undefined, () => {
          this.$http.delete(config.api.deleteTree, { data: { drugCategoryCode: node.data.drugCategoryCode } }).then(res => {
            this.$message({
              type: 'success',
              message: '删除成功!'
            })
            this.getTree(node.parent.data.id)
            this.$refs.table1.clearTable()
          })
        })
      } else {
        this.$message({
          type: 'warning',
          message: '该节点还有子节点，不能删除!'
        })
        // this.$confirm('此操作将永久删除该节点和其子节点, 是否继续?', '提示', {
        //   confirmButtonText: '确定',
        //   cancelButtonText: '取消',
        //   type: 'warning'
        // }).then(() => {
        //   let repeatIds = ''
        //   let getId = (items) => {
        //     repeatIds += items.id + ','
        //     if (items.children && items.children.length > 0) {
        //       for (let ss = 0; ss < items.children.length; ss++) {
        //         getId(items.children[ss])
        //       }
        //     } else {
        //       return repeatIds
        //     }
        //   }
        //   getId(node.data)
        //   let ids = repeatIds.slice(0, repeatIds.length - 1)
        //   this.$http.delete(config.api.tree + ids).then(res => {
        //     this.$message({
        //       type: 'success',
        //       message: '删除成功!'
        //     })
        //     this.getTree(node.parent.data.id)
        //   })
        // }).catch(() => { })
      }
    },
    /*
目的：修改节点的时候，
1、node 点击树节点vnode的数据, 类型-对象
2、data 点击树节点的数据 类型-对象
*/
    modify(node, data) {
      this.dialogTitle2 = '修改' + data.drugCategoryName + '子节点'
      this.addOperate = false
      this.visible2 = true
      this.dialog2.drugCategoryName = data.drugCategoryName
      this.tempModifyVnode = node
    },
    // 查询药理类别的弹出框
    openDialog3() {
      this.visible3 = true
    },
    /*
目的：远程搜索，
1、query 远程搜索的数据, 类型-字符串
*/
    remoteMethod(query) {
      if (query !== '') {
        this.loading = true
        clearTimeout(this.timeout)
        this.timeout = setTimeout(() => {
          let temp = { hcGenericName: query, status: '1' }
          this.$http.get(config.api.query, { params: temp }).then(res => {
            this.loading = false
            if (res.data.rows && res.data.rows.length > 0) {
              let arr = res.data.rows.map(item => {
                // 药品名称列表
                return { label: item.hcGenericName, value: item.hcDrugCode, actualFormName: item.actualFormName, reamrk: item.remark }
              })
              this.list.drugList = arr.filter(item => {
                return item.label.toLowerCase().indexOf(query.toLowerCase()) > -1 || item.value.toLowerCase().indexOf(query.toLowerCase()) > -1
              })
            } else {
              this.list.drugList = []
            }
          })
        }, 200)
      } else {
        this.list.drugList = []
      }
    }
  },
  watch: {
    filterText(val) {
      this.$refs.tree.filter(val)
    },
    'dialog1.hcDrugCode': function (val, oldVal) {
      if (val === '') {
        this.dialog1.actualFormName = ''
        this.dialog1.remark = ''
      } else {
        this.list.drugList.map(item => {
          if (item.value === val) {
            this.dialog1.actualFormName = item.actualFormName
            this.dialog1.remark = item.remark
          }
        })
      }
    }
  }
}
</script>

<style lang="scss" scoped>
#drugCatelogTree {
  margin: 5px;
  overflow: auto !important;
}
</style>
