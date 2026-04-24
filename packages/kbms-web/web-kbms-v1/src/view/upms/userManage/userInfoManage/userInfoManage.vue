<template>
  <div>
    <kindo-box title="条件筛选" icon="el-icon-search">
      <el-form :model="form" onsubmit="return false;" label-position="right" inline @keyup.enter.prevent.native="get">
        <el-form-item label="登录帐号">
          <el-input v-model.trim="form.loginNo"></el-input>
        </el-form-item>
        <el-form-item label="工号">
          <el-input v-model.trim="form.emplNo"></el-input>
        </el-form-item>
        <el-form-item label="用户名">
          <el-input v-model.trim="form.emplName"></el-input>
        </el-form-item>
      </el-form>

      <div slot="control">
        <el-button type="primary" icon="el-icon-search" @click="get">查询</el-button>
      </div>
    </kindo-box>

    <kindo-box title="用户信息" icon="fa-bar-chart">
      <kindo-table ref="table" :url="url" :queryParam="form" @selection-change="selectionChange">
        <el-table-column type="selection" fixed="left" align="center" width="50"></el-table-column>
        <el-table-column label="登录账号" prop="loginNo" min-width="100" header-align="center" sortable='custom' show-overflow-tooltip></el-table-column>
        <el-table-column label="工号" prop="emplNo" min-width="100" header-align="center" sortable='custom' show-overflow-tooltip></el-table-column>
        <el-table-column label="用户名" prop="emplName" min-width="100" header-align="center" sortable='custom' show-overflow-tooltip></el-table-column>
        <el-table-column label="状态" prop="statusName" width="100" align="center"></el-table-column>
        <el-table-column label="组织机构名称" prop="orgaName" min-width="200" header-align="center" show-overlow-tooltip></el-table-column>
        <el-table-column label="创建时间" prop="createDate" width="160" align="center" sortable='custom' :formatter="(row, column) => kindo.util.formatTime(row[column.property])"></el-table-column>
        <el-table-column label="操作" width="160" align="center">
          <template slot-scope="scope">
            <el-tooltip class="item" effect="dark" :open-delay="300" content="编辑" placement="top-start">
              <el-button type="text" icon="el-icon-edit" @click="update(scope.$index, scope.row)"></el-button>
            </el-tooltip>
            <el-tooltip class="item" effect="dark" :open-delay="300" content="删除" placement="top-start">
              <el-button type="text" icon="el-icon-delete" @click="deleteUser(scope.$index, scope.row)"></el-button>
            </el-tooltip>
            <el-tooltip class="item" effect="dark" :open-delay="300" content="设置菜单角色" placement="top-start">
              <el-button type="text" icon="el-icon-setting" @click="roleClick(scope.row)"></el-button>
            </el-tooltip>
            <el-tooltip class="item" effect="dark" :open-delay="300" content="修改密码" placement="top-start">
              <el-button type="text" icon="el-icon-more" @click="updatePwd(scope.$index, scope.row)"></el-button>
            </el-tooltip>
            <el-tooltip class="item" effect="dark" :open-delay="300" content="重置密码" placement="top-start">
              <el-button type="text" icon="el-icon-back" @click="reset(scope.$index, scope.row)"></el-button>
            </el-tooltip>
          </template>
        </el-table-column>
      </kindo-table>

      <div slot="control">
        <el-button icon="el-icon-plus" type="text" @click="insert">新增</el-button>
        <el-button icon="el-icon-delete" type="text" @click="deleteBatch">批量删除</el-button>
      </div>
    </kindo-box>

    <el-dialog top="0" :visible.sync="visible" :title="(model.id === ''?'新增': '编辑') + '用户信息'" width="900px" :close-on-click-modal="false">
      <el-form :model="model" onsubmit="return false;" :rules="rules" ref="model" label-width="90px">
        <el-row>
          <el-col :span="9">
            <el-form-item label="登陆账号" prop="loginNo">
              <el-input v-model.trim="model.loginNo"></el-input>
            </el-form-item>
            <el-form-item label="工号" prop="emplNo">
              <el-input v-model.trim="model.emplNo"></el-input>
            </el-form-item>
            <el-form-item label="用户名" prop="emplName">
              <el-input v-model.trim="model.emplName"></el-input>
            </el-form-item>
            <el-form-item label="用户状态" prop="status">
              <el-select v-model.trim="model.status" placeholder="请选择状态">
                <el-option v-for="item in STATUS" :key="item.value" :label="item.label" :value="item.value"> </el-option>
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="14" :offset="1">
            <el-form-item label="组织机构" prop="orgaName">
              <el-input v-model.trim="model.orgaName" readonly></el-input>
            </el-form-item>
            <el-form-item label=" " style="max-height: 600;">
              <el-input placeholder="输入关键字进行过滤" v-model.trim="filterText"></el-input>
              <el-tree class="orgaTree" ref="orgaTree" highlight-current node-key="id" :data="orgaTreeData" :props="orgaTreeProps" :default-expanded-keys="defaultExpandedKeys" :current-node-key="orgaCurrentNodeKey" :filter-node-method="filterNode" @node-click="moreOrga" @current-change="currentChange"></el-tree>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button @click="visible = false">取 消</el-button>
        <el-button icon="el-icon-check" type="primary" @click="save">完 成</el-button>
      </div>
    </el-dialog>

    <el-dialog top="0" :visible.sync="roleVisible" width="600px" title="设置用户角色" :close-on-click-modal="false">
      <el-form :model="roleModel" ref="roleModel">
        <el-form-item label="选择菜单角色"></el-form-item>
        <el-form-item prop="MENUROLES" style="text-align: center">
          <el-transfer v-model.trim="roleModel.MENUROLES" filterable :titles="['可选菜单角色', '拥有菜单角色']" :button-texts="['删 除', '新 增']" :data="source.MENUROLES" :props="{ key: 'id', label: 'roleName' }" style="text-align: left; display: inline-block;">
          </el-transfer>
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button @click="roleVisible = false">取 消</el-button>
        <el-button icon="el-icon-check" type="primary" @click="saveRole">完 成</el-button>
      </div>
    </el-dialog>

    <el-dialog top="0" :visible.sync="visible1" title="修改用户密码" :close-on-click-modal="false">
      <el-form :model="model1" :rules="rules" ref="model1" label-width="110px">
        <el-form-item label="授权码" prop="varifyCode">
          <el-input v-model.trim="model1.varifyCode"></el-input>
        </el-form-item>
        <el-form-item label="请设置新密码" prop="pwd">
          <el-input type="password" v-model.trim="model1.pwd"></el-input>
        </el-form-item>
        <el-form-item label="请确认新密码" prop="checkPwd">
          <el-input type="password" v-model.trim="model1.checkPwd"></el-input>
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button @click="visible1 = false">取 消</el-button>
        <el-button icon="el-icon-check" type="primary" @click="savePwd">完 成</el-button>
      </div>
    </el-dialog>

    <el-dialog top="0" :visible.sync="visible2" title="重置用户密码" :close-on-click-modal="false">
      <el-form :model="model2" :rules="rules" ref="model2" label-width="90px">
        <el-form-item label="授权码" prop="varifyCode">
          <el-input v-model.trim="model2.varifyCode"></el-input>
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button @click="visible2 = false">取 消</el-button>
        <el-button icon="el-icon-check" type="primary" @click="resetPut">完 成</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import config from './config'
export default {
  name: 'userInfoManage',
  data() {
    let validatePass = (rule, value, callback) => {
      if (this.model1.checkPwd !== '') {
        this.$refs.model1.validateField('checkPwd')
      }
      callback()
    }
    let validatePass2 = (rule, value, callback) => {
      if (value === '') {
        callback(new Error('请再次请输入密码'))
      } else if (value !== this.model1.pwd) {
        callback(new Error('两次请输入密码不一致!'))
      } else {
        callback()
      }
    }
    return {
      // 用户表查询
      url: config.api.get,

      // 是否编辑状态
      visible: false,

      // 是否修改密码状态
      visible1: false,
      // 是否重置密码状态
      visible2: false,

      roleVisible: false,

      // 查询实体
      form: {
        loginNo: '',
        emplNo: '',
        emplName: ''
      },

      // 编辑实体
      model: {
        id: '',
        loginNo: '',
        emplNo: '',
        emplName: '',
        orgaName: '',
        orgaId: '',
        status: '00'
      },

      roleModel: {
        id: '',
        MENUROLES: []
      },

      // 密码编辑实体
      model1: {
        id: '',
        pwd: '',
        checkPwd: '',
        varifyCode: ''
      },

      // 密码重置实体
      model2: {
        id: '',
        varifyCode: ''
      },

      source: {
        MENUROLES: []
      },

      // 数据字典分类
      STATUS: [],

      // 实体验证
      rules: {
        loginNo: [{ required: true, message: '请输入登陆账号', trigger: 'blur' }, { min: 0, max: 32, message: '请输入最多32个字', trigger: 'blur' }],
        emplNo: [{ required: true, message: '请输入工号', trigger: 'blur' }, { min: 0, max: 32, message: '请输入最多32个字', trigger: 'blur' }],
        emplName: [{ required: true, message: '请输入用户名', trigger: 'blur' }, { min: 0, max: 32, message: '请输入最多32个字', trigger: 'blur' }],
        orgaName: [{ required: true, message: '请选择组织机构', trigger: 'blur' }],
        status: [{ required: true, message: '请选择用户状态', trigger: 'blur' }],
        varifyCode: [{ required: true, message: '请输入授权码', trigger: 'blur' }, { min: 6, max: 20, message: '请输入6~20位码', trigger: 'blur' }],
        pwd: [
          { required: true, message: '请输入新密码', trigger: 'blur' },
          { min: 6, max: 16, message: '请输入6~16位密码', trigger: 'blur' },
          { validator: validatePass, trigger: 'blur' }
        ],
        checkPwd: [
          { required: true, message: '请输入新密码', trigger: 'blur' },
          { min: 6, max: 16, message: '请输入6~16位密码', trigger: 'blur' },
          { validator: validatePass2, trigger: 'blur' }
        ]
      },

      // 已选中用户
      selection: [],

      // 树属性
      orgaTreeProps: {
        children: 'children',
        label: 'orgaName'
      },

      orgaTreeData: [],

      defaultExpandedKeys: [],

      orgaCurrentNodeKey: '',
      filterText: ''
    }
  },

  created() {
    this.$nextTick(() => {
      this._model = Object.assign({}, this.model)
      // 获取用户状态的数据字典
      this.$http
        .get(config.api.getStatus)
        .then(res => {
          if (res.data) {
            this.STATUS = res.data.map(item => item)
          }
        })
        .then(() => {
          // 获取用户权限的列表
          this.$http.get(config.api.getMenuRole).then(res => {
            this.source.MENUROLES = res.data
          })
        })
    })
  },

  mounted() {
    this.$nextTick(() => {
      this.get()
    })
  },

  watch: {
    filterText(val) {
      this.$refs.orgaTree.filter(val)
    }
  },

  methods: {
    roleClick(row) {
      kindo.util
        .promise(() => {
          this.roleVisible = true
        })
        .then(() => {
          this.$refs.roleModel.resetFields()
        })
        .then(() => {
          this.roleModel.id = row.id

          // 获取用户菜单角色列表
          this.$http.get(config.api.getMenuRoleById, { params: { userId: row.id } }).then(res => {
            this.roleModel.MENUROLES = res.data
          })
        })
    },

    // 保存
    saveRole() {
      this.$http.post(config.api.updateMenuRole, { userId: this.roleModel.id, menuRoleIds: this.roleModel.MENUROLES.toString() }).then(res => {
        kindo.util.alert(res.data.message)
        this.roleVisible = false
        this.get()
      })
    },

    // 被选中项
    selectionChange(selection) {
      this.selection = selection
    },

    // 查询用户
    get() {
      this.$refs.table.reloadData()
    },

    // 删除用户
    deleteUser(index, row) {
      kindo.util.confirm('请确定删除', undefined, undefined, () => {
        this.$http.post(config.api.delete, { id: row.id }).then(res => {
          kindo.util.alert('删除成功', '提示', 'success')
          this.get()
        })
      })
    },

    // 批量删除用户
    deleteBatch() {
      if (this.selection.length > 0) {
        kindo.util.confirm('请确认是否批量删除 ', undefined, undefined, () => {
          this.$http.post(config.api.deleteBatch, { ids: this.selection.map(item => item.id).toString() }).then(res => {
            kindo.util.alert('批量删除成功', '提示', 'success')
            this.get()
          })
        })
      } else {
        kindo.util.alert('请至少选择一个用户', '提示', 'warning')
      }
    },

    // 新增用户
    insert() {
      kindo.util
        .promise(() => {
          this.visible = true
        })
        .then(() => {
          // this.$refs.model.resetFields()
        })
        .then(() => {
          this.model = Object.assign({}, this._model)
          this.getOrgaTree()
        })
    },

    // 编辑用户
    update(index, row) {
      kindo.util
        .promise(() => {
          this.visible = true
        })
        .then(() => {
          this.$refs.model.resetFields()
        })
        .then(() => {
          this.model = Object.assign({}, this._model, row)
          this.getOrgaTree(row.orgaId, row.pid)
        })
    },

    // 获取组织机构树
    getOrgaTree(id, pid) {
      this.$http
        .get(config.api.orgaTree)
        .then(res => {
          if (res.data.length > 0) {
            res.data.sort((itema, itemb) => {
              return itema.sort - itemb.sort
            })
            let treeOrgas = kindo.util.toTree(res.data, 'id', 'pid')
            this.orgaTreeData = treeOrgas
            return res.data
          } else {
            return false
          }
        })
        .then(data => {
          if (data.length > 0) {
            if (id !== null || id !== undefined) {
              if (pid) {
                this.defaultExpandedKeys = [pid]
              } else {
                this.defaultExpandedKeys = [id]
              }
              this.orgaCurrentNodeKey = id
              for (let i in data) {
                if (data[i].id === id) {
                  this.model.orgaName = data[i].orgaName
                  break
                }
              }
            } else {
              if (this.orgaTreeData[0].children) {
                this.defaultExpandedKeys = [this.orgaTreeData[0].children[1].id]
              } else {
                this.defaultExpandedKeys = [this.orgaTreeData[0].id]
              }
              this.orgaCurrentNodeKey = ''
            }
          }
        })
    },

    // 树节点被点击时的回调
    moreOrga(data) {
      this.defaultExpandedKeys = [data.id]
    },

    filterNode(value, data) {
      if (!value) {
        return true
      }
      return data.orgaName.indexOf(value) !== -1
    },

    // 选中节点变化时
    currentChange(data, node) {
      this.model.orgaName = data.orgaName
      this.orgaCurrentNodeKey = data.id
    },

    // 保存
    save() {
      this.$refs.model.validate(valid => {
        if (valid) {
          let params = {}
          params = {
            id: this.model.id,
            loginNo: this.model.loginNo,
            emplNo: this.model.emplNo,
            emplName: this.model.emplName,
            orgaId: this.orgaCurrentNodeKey,
            status: this.model.status
          }
          if (this.model.id) {
            this.$http.post(config.api.update, params).then(res => {
              kindo.util.alert('编辑用户成功', '提示', 'success')
              this.visible = false
              this.get()
            })
          } else {
            this.$http.post(config.api.insert, params).then(res => {
              kindo.util.alert('新增用户成功', '提示', 'success')
              this.visible = false
              this.get()
            })
          }
        }
      })
    },

    // 修改用户密码
    updatePwd(index, row) {
      kindo.util
        .promise(() => {
          this.visible1 = true
        })
        .then(() => {
          this.$refs.model1.resetFields()
        })
        .then(() => {
          this.model1 = Object.assign({}, row)
        })
    },

    // 重置用户密码
    reset(index, row) {
      kindo.util
        .promise(() => {
          this.visible2 = true
        })
        .then(() => {
          this.$refs.model2.resetFields()
        })
        .then(() => {
          this.model2 = Object.assign({}, row)
        })
    },

    // 重置用户密码确认
    resetPut(index, row) {
      this.$refs.model2.validate(valid => {
        if (valid) {
          this.$http.post(config.api.reset, { varifyCode: this.model2.varifyCode, userId: this.model2.id }).then(res => {
            kindo.util.alert('重置密码成功', '提示', 'success')
            this.visible2 = false
            this.get()
          })
        }
      })
    },

    // 修改用户密码保存
    savePwd() {
      this.$refs.model1.validate(valid => {
        if (valid) {
          let params = {}
          params = {
            varifyCode: this.model1.varifyCode,
            pwd: kindo.util.md5(this.model1.pwd),
            userId: this.model1.id
          }
          this.$http.post(config.api.updatePwd, params).then(res => {
            kindo.util.alert('修改密码成功', '提示', 'success')
            this.visible1 = false
            this.get()
          })
        }
      })
    }
  }
}
</script>

<style scoped>
.orgaTree {
  overflow: auto;
  height: 400px;
  max-height: 500px;
}
</style>