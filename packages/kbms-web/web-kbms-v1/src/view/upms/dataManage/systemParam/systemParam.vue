<template>
  <div>
    <kindo-box title="条件筛选" icon="el-icon-search">
      <el-form :model="form" onsubmit="return false;" label-position="right" inline @keyup.enter.prevent.native="get">
        <el-form-item label="参数名称">
          <el-input v-model.trim="form.paramCode" placeholder="请输入系统参数名称"></el-input>
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model.trim="form.paramDesc" placeholder="请输入描述"></el-input>
        </el-form-item>
      </el-form>

      <div slot="control">
        <el-button type="primary" icon="el-icon-search" @click="get">查询</el-button>
      </div>
    </kindo-box>

    <kindo-box title="参数信息" icon="fa-bar-chart">
      <kindo-table ref="table" :url="url" :queryParam="form">
        <el-table-column label="系统参数" prop="paramCode" min-width="140" header-align="center" sortable='custom' show-overflow-tooltip></el-table-column>
        <el-table-column label="描述" prop="paramDesc" min-width="140" header-align="center" show-overflow-tooltip></el-table-column>
        <el-table-column label="参数值" prop="value" min-width="150" align="center" show-overflow-tooltip></el-table-column>
        <el-table-column label="操作" width="100" align="center">
          <template slot-scope="scope">
            <el-tooltip class="item" effect="dark" :open-delay="300" content="修改" placement="top-start">
              <el-button type="text" icon="el-icon-edit" @click="update(scope.$index, scope.row)"></el-button>
            </el-tooltip>
            <el-tooltip class="item" effect="dark" :open-delay="300" content="重置" placement="top-start">
              <el-button type="text" icon="el-icon-minus" @click="revert(scope.$index, scope.row)"></el-button>
            </el-tooltip>
          </template>
        </el-table-column>
      </kindo-table>
      <div slot="control">
        <el-button icon="el-icon-refresh" type="text" @click="refresh">刷新缓存</el-button>
      </div>
    </kindo-box>

    <el-dialog top="0" :visible.sync="visible1" width="30%" title="修改系统参数" :close-on-click-modal="false">
      <el-form :model="model1" onsubmit="return false;" :rules="rules" ref="model1" label-width="90px">
        <el-form-item label="系统参数" prop="paramCode">
          <el-input v-model.trim="model1.paramCode" disabled></el-input>
        </el-form-item>
        <el-form-item label="描述" prop="paramDesc">
          <el-input v-model.trim="model1.paramDesc" disabled></el-input>
        </el-form-item>
        <el-form-item label="参数值" prop="value">
          <el-input v-model.trim="model1.value"></el-input>
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button @click="visible1 = false">取 消</el-button>
        <el-button icon="el-icon-check" type="primary" @click="save">完 成</el-button>
      </div>
    </el-dialog>

  </div>
</template>

<script>
import config from './config'
export default {
  name: 'systemParam',
  data() {
    return {
      // 用户表查询
      url: config.api.get,

      // 是否修改密码状态
      visible1: false,

      // 查询实体
      form: {
        paramCode: '',
        paramDesc: ''
      },

      rules: {
        value: [{ required: true, message: '请输入参数值', trigger: 'blur' }, { min: 0, max: 16, message: '请输入最多16个字', trigger: 'blur' }]
      },

      // 编辑实体
      model1: {
        id: '',
        value: ''
      }
    }
  },

  mounted() {
    this.$nextTick(() => {
      this.get()
    })
  },

  methods: {
    // 刷新缓存
    refresh() {
      this.$http.get(config.api.refresh).then(res => {
        kindo.util.alert(res.data.message)
      })
    },

    // 查询系统参数
    get() {
      this.$refs.table.reloadData()
    },

    // 修改系统参数
    update(index, row) {
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

    // 重置系统参数
    revert(index, row) {
      kindo.util.confirm('确定重置系统参数吗?', undefined, undefined, () => {
        this.$http.post(config.api.revert, { id: row.id }).then(res => {
          kindo.util.alert('重置系统参数成功', '提示', 'success')
          this.get()
        })
      })
    },

    // 修改系统参数保存
    save() {
      this.$refs.model1.validate(valid => {
        if (valid) {
          let params = {}
          params = {
            id: this.model1.id,
            value: this.model1.value
          }
          this.$http.post(config.api.update, params).then(res => {
            kindo.util.alert('修改系统参数成功', '提示', 'success')
            this.visible1 = false
            this.get()
          })
        }
      })
    }
  }
}
</script>