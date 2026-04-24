/*@Author: wuhuihui
  *菜单：基础库-药品基础库-化学药药理分类
 */
<template>
  <div>
    <kindo-box title="化学药药理分类" icon="xx" style="margin-bottom:0px;">
      <el-input v-model.trim="filterText" placeholder="输入关键字查询" suffix-icon="el-icon-search" clearable></el-input>
      <el-tree :style="treeHeight" :default-expand-all="true" :data="treeData" node-key="id" id="drugCatelogTree" ref="tree" :highlight-current="true" :default-expanded-keys="openKeys" :props="treeProp" :filter-node-method="filterNode" :expand-on-click-node="false">
        <span class="custom-tree-node" slot-scope="{node, data}">
          <span>{{ node.label }}</span>
          <span style="color: #409EFF; padding-left:4px;">
            <span class="el-icon-plus" v-if="node.level < 4" @click="append(data)">
            </span>
            <span @click="modify(node, data)" class="el-icon-edit-outline">
            </span>
            <span @click="remove(node, data)" class="el-icon-minus" v-if="node.isLeaf">
            </span>
          </span>
        </span>
      </el-tree>
      <div slot="control">
        <el-button icon="el-icon-plus" type="primary" @click="append()">新增</el-button>
      </div>
    </kindo-box>
    <!-- 新增节点弹出框starts-->
    <el-dialog top="0" :visible.sync="visible2" :title="dialogTitle2" :modal-append-to-body="false" :close-on-click-modal="false">
      <el-form :model="dialog2" ref="dialog2Form" label-position="right" label-width="150px" onsubmit="return false;" :rules="dialog2Rules">
        <el-form-item label="化学药药理分类名称" style="display:block;" prop="drugCategoryName">
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
  name: 'chemicalClass',
  mixin: [mixin],
  data() {
    return {
      treeHeight: {
        height: 'auto',
        overflow: 'scroll'
      },
      // 树结构的数据
      treeData: [],
      treeProp: {
        children: 'children',
        label: 'drugCategoryName'
      },
      filterText: '',
      openKeys: [],
      treeUrl: config.api.tree,
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
      addOperate: true
    }
  },

  created() { },

  mounted() {
    this.$nextTick(() => {
      // 加载树的结构
      this.getTree()
      this.treeHeight.height = document.body.clientHeight - document.querySelector('#drugCatelogTree').offsetTop - document.querySelector('.main').offsetTop - 10 + 'px'
    })
  },

  methods: {
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
    目的：点击新增树节点的时候
    2、data 树节点 类型-对象
    */
    append(data) {
      this.dialogTitle2 = data ? ('新增 < ' + data.drugCategoryName + ' > 子节点') : '新增根节点'
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
              .post(config.api.saveTree, { name: this.dialog2.drugCategoryName, parentCode: this.tempAddData ? this.tempAddData.drugCategoryCode : 'X' })
              .then(res => {
                this.getTree(this.tempAddData ? this.tempAddData.id : 'X')
                this.visible2 = false
              })
          } else {
            this.$http.put(config.api.saveTree, { id: this.tempModifyVnode.data.id, name: this.dialog2.drugCategoryName }).then(res => {
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
          this.$http.delete(config.api.deleteTree, { data: { id: node.data.id } }).then(res => {
            this.$message({
              type: 'success',
              message: '删除成功!'
            })
            this.getTree(node.parent.data.id)
          })
        })
      } else {
        this.$message({
          type: 'warning',
          message: '该节点还有子节点，不能删除!'
        })
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
    }
  },
  watch: {
    filterText(val) {
      this.$refs.tree.filter(val)
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
