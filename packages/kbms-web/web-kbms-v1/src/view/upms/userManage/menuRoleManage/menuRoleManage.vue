<template>
  <div>
    <kindo-box title="条件筛选" icon="el-icon-search">
      <el-form :model="form" onsubmit="return false;" label-position="right" inline @keyup.enter.prevent.native="get">
        <el-form-item label="角色名称">
          <el-input v-model.trim="form.roleName" placeholder="请输入菜单角色名称"></el-input>
        </el-form-item>
      </el-form>

      <div slot="control">
        <el-button type="primary" icon="el-icon-search" @click="getData">查询</el-button>
      </div>
    </kindo-box>

    <kindo-box title="菜单角色" icon="fa-bar-chart">
      <kindo-table ref="table" :url="url" :queryParam="form">
        <el-table-column width="250px" sortable='custom' label="菜单角色名称" prop="roleName" header-align="center"> </el-table-column>
        <el-table-column min-width="460px" label="备注" prop="roleDesc" header-align="center"> </el-table-column>
        <el-table-column width="80px" label="操作" align="center">
          <template slot-scope="scope">
            <el-tooltip class="item" effect="dark" :open-delay="300" content="编辑" placement="top-start">
              <el-button type="text" icon="el-icon-edit" @click="editUser(scope.$index, scope.row)"></el-button>
            </el-tooltip>
            <el-tooltip class="item" effect="dark" :open-delay="300" content="删除" placement="top-start">
              <el-button type="text" icon="el-icon-delete" @click="deleteUser(scope.$index, scope.row)"></el-button>
            </el-tooltip>
          </template>
        </el-table-column>
      </kindo-table>

      <div slot="control">
        <el-button icon="el-icon-plus" type="text" @click="openAddModel">新增</el-button>
      </div>
    </kindo-box>

    <el-dialog top="0" :title="'权限'+(model.id===''?'新增':'编辑')" :visible.sync="dialogVisible" width="600px" :close-on-click-modal="false">
      <el-row>
        <el-steps space="50%" :active="model.active" center align-center finish-status="success">
          <el-step title="基础信息"></el-step>
          <el-step title="菜单权限"></el-step>
        </el-steps>
      </el-row>
      <br>
      <br>
      <div v-show="model.active === 0">
        <el-form :model="model" onsubmit="return false;" :rules="rules" ref="model" label-width="110px">
          <el-form-item label="菜单角色名称" prop="roleName">
            <el-input v-model.trim="model.roleName"></el-input>
          </el-form-item>
          <el-form-item label="备注" prop="roleDesc">
            <el-input type="textarea" :rows="2" v-model.trim="model.roleDesc"></el-input>
          </el-form-item>
        </el-form>
      </div>
      <div v-show="model.active === 1">
        <el-form>
          <el-form-item>
            <el-tree class="treeTable" ref="menuTree" highlight-current node-key="id" show-checkbox @node-click="moreMenu" :data="menuTreeData" :props="menuTreeProps" :default-expanded-keys="defaultExpandedMenu" :current-node-key="menuCurrentNodeKey"></el-tree>
          </el-form-item>
        </el-form>
      </div>

      <div slot="footer" class="dialog-footer">
        <el-button @click="prev" v-if="model.active > 0">上一步</el-button>
        <el-button @click="next" v-if="model.active < 1">下一步</el-button>
        <el-button icon="el-icon-check" type="primary" @click="save" v-if="model.active === 1">完 成</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import config from './config'
export default {
  name: 'menuRoleManage',
  data() {
    return {
      // 是否编辑状态
      dialogVisible: false,

      // 角色信息表查询
      url: config.api.get,

      // 编辑实体
      model: {
        // 步骤条
        active: 0,
        id: '',
        roleName: '',
        roleDesc: '',
        menuIds: ''
      },

      // 实体验证
      rules: {
        roleName: [{ required: true, message: '请输入菜单角色名称', trigger: 'blur' }, { min: 0, max: 32, message: '请输入最多32个字', trigger: 'blur' }],
        roleDesc: [{ min: 0, max: 250, message: '请输入最多250个字', trigger: 'blur' }]
      },

      // 查询实体
      form: {
        roleName: ''
      },

      // 存放树节点
      nodeKeys: [],

      // 树属性
      menuTreeProps: {
        children: 'children',
        label: 'name'
      },

      menuTreeData: [],

      defaultExpandedMenu: [],

      menuCurrentNodeKey: ''
    }
  },

  created() {
    // 保存查询条件或者任意model 的默认值
    this._form = Object.assign({}, this.form)
    this._model = Object.assign({}, this.model)
  },

  mounted() {
    this.$nextTick(() => {
      this.getData()
    })
  },

  methods: {
    prev() {
      this.model.active = this.model.active - 1
    },

    next() {
      if (this.model.active === 0) {
        this.$refs.model.validate(valid => {
          if (valid) {
            let param = {}
            let apiInfo = ''
            if (this.model.id) {
              apiInfo = config.api.update
              param = {
                id: this.model.id,
                roleName: this.model.roleName,
                roleDesc: this.model.roleDesc
              }
            } else {
              apiInfo = config.api.insert
              param = {
                roleName: this.model.roleName,
                roleDesc: this.model.roleDesc
              }
            }
            this.$http.all([this.$http.post(apiInfo, param), this.$http.get(config.api.getMenu)]).then(
              this.$http.spread((acct, perms) => {
                if (acct.code === 200) {
                  this.model.active = this.model.active + 1
                  if (perms.data.length > 0) {
                    perms.data.sort((itema, itemb) => {
                      return itema.sort - itemb.sort
                    })
                    let treeMenus = kindo.util.toTree(perms.data, 'id', 'pid')
                    this.menuTreeData = treeMenus
                    this.model.id = acct.data
                    this.getData()

                    let param = this.model.menuIds.split(',')
                    let checkKeys = []

                    let getLastChild = menus => {
                      menus.forEach(item => {
                        if (item.children && item.children.length > 0) {
                          getLastChild(item.children)
                        } else {
                          if (param.findIndex(menuId => menuId === item.id) > -1) {
                            checkKeys.push(item.id)
                          }
                        }
                      })
                    }
                    getLastChild(this.menuTreeData)

                    this.$refs.menuTree.setCheckedKeys(checkKeys)

                    // 默认展开选中权限的节点
                    // 否则展开第一层节点
                    if (checkKeys.length > 0) {
                      this.defaultExpandedMenu = checkKeys
                    } else {
                      this.defaultExpandedMenu = [this.menuTreeData[0].id]
                    }
                  }
                } else {
                  return false
                }
              })
            )
          }
        })
      }
    },

    // 查询角色信息
    getData() {
      this.$refs.table.reloadData()
    },

    // 树节点被点击时的回调
    moreMenu(data) {
      this.defaultExpandedMenu = [data.id]
    },

    // 打开新增窗口
    openAddModel() {
      kindo.util
        .promise(() => {
          this.dialogVisible = true
        })
        .then(() => {
          this.$refs.model.resetFields()
        })
        .then(() => {
          this.model = Object.assign(this.model, this._model)
        })
    },

    // 打开编辑窗口
    editUser(index, row) {
      kindo.util.promise(() => {
        this.dialogVisible = true
      }).then(() => {
        this.$refs.model.resetFields()
      }).then(() => {
        this.$http.all([this.$http.get(config.api.getRoleUser, { params: { id: row.id } }), this.$http.get(config.api.getMenuRole, { params: { roleId: row.id } })]).then(
          this.$http.spread((acct, perms) => {
            let param = {}
            param = {
              id: row.id,
              menuIds: perms.data.toString()
            }
            this.model = Object.assign(this.model, this._model, acct.data, param)
          })
        )
      })
    },

    // 删除数据
    deleteUser(index, row) {
      kindo.util
        .promise(() => {
          this.model = Object.assign({}, row)
        })
        .then(() => {
          kindo.util.confirm('确定删除吗?', undefined, undefined, () => {
            this.$http.post(config.api.delete, { id: this.model.id }).then(res => {
              kindo.util.alert('删除成功', '提示', 'success')
              this.getData()
            })
          })
        })
    },

    // 保存
    save() {
      let halfCheck = this.getIndeterminate()
      let checked = this.$refs.menuTree.getCheckedKeys().concat(halfCheck)
      this.$http
        .post(config.api.updateMenuRole, {
          roleId: this.model.id,
          menuIds: checked.toString()
        })
        .then(res => {
          kindo.util.alert('保存成功', '提示', 'success')
          this.dialogVisible = false
          this.model.active = 0
          this.getData()
        })
    },

    // 获取半选中节点
    getIndeterminate() {
      let res = []
      let nodesDOM = this.$refs.menuTree.$el.querySelectorAll('.el-tree-node')
      let nodesVue = [].map.call(nodesDOM, node => node.__vue__)
      let node = nodesVue.filter(item => item.node.indeterminate === true)
      node.map(item => {
        res.push(item.$vnode.key)
      })

      return res
    }
  }
}
</script>

<style scoped>
.treeTable {
  overflow: auto;
  height: 400px;
}
</style>