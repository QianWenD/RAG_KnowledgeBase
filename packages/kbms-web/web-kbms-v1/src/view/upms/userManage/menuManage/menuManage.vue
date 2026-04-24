<template>
  <div>
    <kindo-box title="条件筛选" icon="el-icon-search">
      <el-form :model="form" onsubmit="return false;" label-position="right" inline @keyup.enter.prevent.native="get">
        <el-form-item label="菜单名称">
          <el-input v-model.trim="form.name" placeholder="请输入菜单名称"></el-input>
        </el-form-item>
        <el-form-item label="路由名称">
          <el-input v-model.trim="form.routerName" placeholder="请输入路由名称"></el-input>
        </el-form-item>
      </el-form>

      <div slot="control">
        <el-button @click="get" icon="el-icon-search" type="primary">查询</el-button>
      </div>
    </kindo-box>

    <kindo-box title="菜单信息" icon="fa-bar-chart">
      <el-table :data="data" border stripe>
        <el-table-tree-column fixed="left" fileIcon="el-icon-document" folderIcon="fa-folder" :remote="remoteData" parentKey="pid" :expand-all="!1" prop="name" label="菜单名称" min-width="180" header-align="center" :show-overflow-tooltip="true"></el-table-tree-column>
        <el-table-column prop="routerPath" label="路由路径" min-width="380" :show-overflow-tooltip="true"></el-table-column>
        <el-table-column prop="routerName" label="路由名称" width="120" :show-overflow-tooltip="true"></el-table-column>
        <el-table-column prop="sort" label="排序" header-align="center" align="right" width="60" :show-overflow-tooltip="true"></el-table-column>
        <el-table-column prop="iconUrl" label="图标" align="center" width="60" :show-overflow-tooltip="true">
          <template slot-scope="scope">
            <i :class="scope.row.iconUrl"></i>
          </template>
        </el-table-column>
        <el-table-column label="操作" fixed="right" width="120" align="center">
          <template slot-scope="scope">
            <el-tooltip class="item" effect="dark" :open-delay="300" content="新增" placement="top-start">
              <el-button type="text" icon="el-icon-plus" @click="insert(scope.$index, scope.row)"></el-button>
            </el-tooltip>
            <el-tooltip class="item" effect="dark" :open-delay="300" content="编辑" placement="top-start">
              <el-button type="text" v-if="scope.row.pid" icon="el-icon-edit" @click="update(scope.$index, scope.row)"></el-button>
            </el-tooltip>
            <el-tooltip class="item" effect="dark" :open-delay="300" content="删除" placement="top-start">
              <el-button type="text" v-if="scope.row.pid" icon="el-icon-delete" @click="deleteMenu(scope.$index, scope.row)"></el-button>
            </el-tooltip>
          </template>
        </el-table-column>
      </el-table>
    </kindo-box>

    <el-dialog top="0" :visible.sync="visible" :title="(model.id === ''?'新增': '编辑') + '菜单:'" width="800px" :close-on-click-modal="false">
      <el-form :model="model" onsubmit="return false;" :rules="menuRules" ref="menuForm" label-width="110px">
        <el-row>
          <el-col :span="11">
            <el-form-item label="中文菜单名称" prop="name">
              <el-input v-model.trim="model.name" placeholder="请输入中文菜单名称..."></el-input>
            </el-form-item>
          </el-col>
          <el-col :span="11" :offset="1">
            <el-form-item label="英文菜单名称" prop="enName">
              <el-input v-model.trim="model.enName" placeholder="请输入英文菜单名称..."></el-input>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row>
          <el-col :span="11">
            <el-form-item label="路由名称" prop="routerName">
              <el-input v-model.trim="model.routerName" placeholder="请输入路由名称...">
                <el-button slot="append" class="el-icon-edit appendIcon" @click="() => { this.model.routerName = (new Date() - 1).toString()}"></el-button>
              </el-input>
            </el-form-item>
          </el-col>
          <el-col :span="11" :offset="1">
            <el-form-item label="路由路径" prop="routerPath">
              <el-input v-model.trim="model.routerPath" placeholder="请输入路由路径..."></el-input>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row>
          <el-col :span="11">
            <el-form-item label="图标字体" prop="iconUrl">
              <kindo-icon-picker v-model.trim="model.iconUrl" style="width:215px;"></kindo-icon-picker>
            </el-form-item>
          </el-col>
          <el-col :span="11" :offset="1">
            <el-form-item label="排序标识" prop="sort">
              <el-input v-model.trim.number="model.sort" type="number" style="width:80px"></el-input>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row>
          <el-col :span="11">
            <el-form-item label="链接" prop="href">
              <el-input v-model.trim="model.href" placeholder="请输入链接..."></el-input>
            </el-form-item>
          </el-col>
          <el-col :span="11" :offset="1">
            <el-form-item label="是否显示" prop="show">
              <el-switch v-model.trim="model.show" active-color="#13ce66" inactive-color="#ff4949"></el-switch>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row>
          <el-form-item label="备注" prop="remark">
            <el-input type="textarea" :rows="2" v-model.trim="model.remark"></el-input>
          </el-form-item>
        </el-row>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button type="primary" icon="el-icon-check" @click="save">完 成</el-button>
        <el-button @click="visible = false" icon="el-icon-close" type="primary">取 消</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import config from './config'

export default {
  name: 'menuManage',
  data() {
    return {
      // 搜索实体
      form: {
        name: '',
        routerName: ''
      },

      // 编辑实体
      model: {
        id: '',
        name: '',
        enName: '',
        routerName: '',
        routerPath: '',
        iconUrl: '',
        sort: 0,
        pid: '',
        href: '',
        show: 1,
        remark: '',
        depth: ''
      },

      // 修改新增项验证
      menuRules: {
        name: [{ required: true, message: '请设置中文名称', trigger: 'blur' }, { min: 0, max: 32, message: '请输入最多32个字', trigger: 'blur' }],
        enName: [{ required: true, message: '请设置英文名称', trigger: 'blur' }, { min: 0, max: 32, message: '请输入最多32个字', trigger: 'blur' }],
        routerName: [{ required: true, message: '请设置路由名称', trigger: 'blur' }, { min: 0, max: 32, message: '请输入最多32个字', trigger: 'blur' }],
        routerPath: [{ min: 0, max: 120, message: '请输入最多120个字', trigger: 'blur' }],
        iconUrl: [{ min: 0, max: 64, message: '请输入最多32个字', trigger: 'blur' }],
        href: [{ min: 0, max: 32, message: '请输入最多32个字', trigger: 'blur' }],
        remark: [{ min: 0, max: 250, message: '请输入最多250个字', trigger: 'blur' }]
      },
      data: [],

      // 编辑窗口状态
      visible: false
    }
  },

  created() {
    this._model = Object.assign({}, this.model)
  },

  mounted() {
    this.$nextTick(() => {
      this.get()
    })
  },

  methods: {
    // 查询菜单树
    get(id) {
      let dataApi
      if (this.form.name !== '' || this.form.routerName !== '') {
        dataApi = config.api.getData
      } else {
        dataApi = config.api.get
      }
      this.$http.get(dataApi, { params: this.form }).then(res => {
        if (id) {
          this.setExpanded(res.data, id)
        }
        if (res.data.length > 0) {
          res.data.sort((itema, itemb) => {
            return itema.sort - itemb.sort
          })
          let treeMenus = kindo.util.toTree(res.data, 'id', 'pid')
          if (!id) {
            // 树默认展开行
            treeMenus[0].expanded = true
          }
          this.data = treeMenus
        } else {
          return false
        }
      })
    },

    // 递给设置新增、删除编辑后的展开项
    setExpanded(data, id, isPid) {
      for (let k in data) {
        if (data[k].id === id) {
          if (isPid === true) {
            data[k].expanded = true
          }
          this.setExpanded(data, data[k].pid, true)
          break
        }
      }
    },

    // 新增菜单
    insert(index, row) {
      kindo.util
        .promise(() => {
          this.visible = true
        })
        .then(() => {
          this.$refs.menuForm.resetFields()
        })
        .then(() => {
          this.model = Object.assign({}, this._model)
          this.model.pid = row.id
          this.model.depth = row.depth
        })
    },

    // 修改菜单
    update(index, row) {
      kindo.util
        .promise(() => {
          this.visible = true
        })
        .then(() => {
          this.$refs.menuForm.resetFields()
        })
        .then(() => {
          this.$http.get(config.api.getById, { params: { id: row.id } }).then(res => {
            this.model = Object.assign(this.model, this._model, res.data)
            if (res.data.show === '1') {
              this.model.show = true
            } else {
              this.model.show = false
            }
          })
        })
    },

    // 删除菜单
    deleteMenu(index, row) {
      kindo.util.confirm('请确定删除此菜单', undefined, undefined, () => {
        this.$http.post(config.api.delete, { id: row.id }).then(res => {
          kindo.util.alert('删除菜单成功', '提示', 'success')
          this.get(row.pid)
        })
      })
    },

    remoteData(r, c) {
      setTimeout(function () {
        c(r.children)
      }, 1)
    },

    // 保存（新增，修改）
    save() {
      this.$refs.menuForm.validate(valid => {
        if (valid) {
          let params = {}
          params = {
            id: this.model.id,
            name: this.model.name,
            enName: this.model.enName,
            routerName: this.model.routerName,
            routerPath: this.model.routerPath,
            iconUrl: this.model.iconUrl,
            sort: this.model.sort,
            pid: this.model.pid,
            href: this.model.href,
            show: this.model.show ? 1 : 0,
            remark: this.model.remark,
            depth: this.model.depth
          }
          if (this.model.id) {
            this.$http.post(config.api.update, params).then(res => {
              kindo.util.alert('编辑菜单成功', '提示', 'success')
              this.visible = false
              this.get(res.data)
            })
          } else {
            this.$http.post(config.api.insert, params).then(res => {
              kindo.util.alert('新增菜单成功', '提示', 'success')
              this.visible = false
              this.get(res.data)
            })
          }
        }
      })
    }
  },

  /* eslint-disable func-call-spacing */
  components: {
    'kindo-icon-picker': () => import('@src/packages/KindoIconPicker.vue')
  }
}
</script>
<style scoped>
.appendIcon {
  text-align: center;
  min-width: 55px;
}
</style>
