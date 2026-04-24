/*
 * @Author: 吴策 
 * @Date: 2019-09-20 14:59:16 
 * @Last Modified by: 吴策
 * @菜单名: 医院行政等级
 * @Last Modified time: 2020-06-18 11:13:33
 */

<template>
  <div>
    <kindo-box title="查询条件">
      <el-form v-model.trim="search" onsubmit="return false;" label-position="right" inline @keyup.enter.native="get">
        <el-form-item label="医院名称">
          <el-input v-model.trim="search.hospitalName" placeholder="" clearable></el-input>
        </el-form-item>
        <el-form-item label="医院编码">
          <el-input v-model.trim="search.hospitalCode" placeholder="" clearable></el-input>
        </el-form-item>
        <el-form-item label="版本">
          <el-select v-model.trim="search.edition" size="mini" placeholder="请选择" clearable filterable>
            <el-option v-for="item in dict.EDITION" :key="item.value" :label="item.label" :value="item.value">
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="物价等级">
          <el-select v-model.trim="search.priceGrade" size="mini" placeholder="请选择" clearable filterable>
            <el-option v-for="item in dict.PRICE_GRADE" :key="item.value" :label="item.label" :value="item.value">
            </el-option>
          </el-select>
        </el-form-item>
      </el-form>
      <div slot="control">
        <el-button icon="el-icon-search" type="primary" @click="get">查询</el-button>
      </div>
    </kindo-box>
    <kindo-box title="配置规则">
      <kindo-table ref="table" @selection-change="val => this.selcetData = val" :url="config.api.operation"
        :queryParam="search">
        <el-table-column type="selection" fixed="left" width="30"></el-table-column>
        <el-table-column label="医院名称" prop="hospitalName" sortable="custom" header-align="center" show-overflow-tooltip>
        </el-table-column>
        <el-table-column label="医院编码" prop="hospitalCode" sortable="custom" header-align="center" show-overflow-tooltip>
        </el-table-column>
        <el-table-column label="版本" prop="edition" header-align="center" show-overflow-tooltip>
          <template slot-scope="scope">
            <span>{{ kindo.dictionary.getLabel(dict.EDITION,scope.row.edition) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="物价等级" prop="priceGrade" header-align="center" show-overflow-tooltip>
          <template slot-scope="scope">
            <span>{{ kindo.dictionary.getLabel(dict.PRICE_GRADE,scope.row.priceGrade) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="审核状态" prop="status" width="150" align="center" header-align="center"
          show-overflow-tooltip>
          <template slot-scope="scope">
            <el-tag :type="scope.row.status === '1'?'success':'info'" close-transition>
              {{ kindo.dictionary.getLabel(dict.AUDIT_STATUS,scope.row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" align="center">
          <template slot-scope="scope">
            <el-tooltip class="item" effect="dark" :open-delay="300" content="编辑" placement="top-start">
              <el-button type="text" icon="el-icon-edit" @click="openDialog('edit',scope.row)"></el-button>
            </el-tooltip>
            <el-tooltip class="item" effect="dark" :open-delay="300" content="删除" placement="top-start">
              <el-button type="text" icon="el-icon-delete" @click="del('one',scope.row.id)"></el-button>
            </el-tooltip>
          </template>
        </el-table-column>
      </kindo-table>
      <div slot="control">
        <el-button icon="el-icon-plus" type="text" @click="openDialog('add')">新增</el-button>
        <el-button icon="el-icon-delete" type="text" @click="del('all')">删除</el-button>
        <el-button icon="el-icon-view" type="text" @click="audit">审核</el-button>
      </div>
    </kindo-box>

    <el-dialog v-drag top="0" :visible.sync="dialog.visible" :title="dialog.title" :modal-append-to-body="false"
      :close-on-click-modal="false">
      <el-form :model="dialog.form" class="box" onsubmit="return false;" ref="form" :rules="dialog.rules"
        label-width="90px" label-position="right">
        <el-form-item label="医院名称" prop="hospitalName">
          <el-input v-model.trim="dialog.form.hospitalName" maxlength="100" clearable :disabled="dialog.title === '编辑'">
          </el-input>
        </el-form-item>
        <el-form-item label="医院编码" prop="hospitalCode">
          <el-input v-model.trim="dialog.form.hospitalCode" maxlength="100" clearable :disabled="dialog.title === '编辑'">
          </el-input>
        </el-form-item>
        <el-form-item label="版本" prop="edition">
          <el-select v-model.trim="dialog.form.edition" size="mini" placeholder="请选择" clearable filterable>
            <el-option v-for="item in dict.EDITION" :key="item.value" :label="item.label" :value="item.value">
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="物价等级" prop="priceGrade">
          <el-select v-model.trim="dialog.form.priceGrade" size="mini" placeholder="请选择" clearable filterable>
            <el-option v-for="item in dict.PRICE_GRADE" :key="item.value" :label="item.label" :value="item.value">
            </el-option>
          </el-select>
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button type="primary" icon="fa fa-floppy-o" @click="save">保 存</el-button>
        <el-button @click="dialog.visible = false" icon="el-icon-close" type="primary">取 消</el-button>
      </div>
    </el-dialog>
  </div>

</template>

<script>
import config from './config'
export default {

  data() {
    return {
      config: config,
      search: {
        hospitalName: '',
        hospitalCode: '',
        edition: '',
        priceGrade: ''
      },
      dialog: {
        title: '新增',
        visible: false,
        form: {
          hospitalName: '',
          hospitalCode: '',
          edition: '',
          priceGrade: ''
        },
        // 表单校验规则
        rules: {
          hospitalName: [{ required: true, message: '请输入医院名称', trigger: 'blur' }],
          hospitalCode: [{ required: true, message: '请输入医院编码', trigger: 'blur' }],
          edition: [{ required: true, message: '请选择输入版本', trigger: 'blur' }],
          priceGrade: [{ required: true, message: '请选择输入物价等级', trigger: 'blur' }]
        }
      },
      selcetData: [],

      // 字典
      dict: {
        AUDIT_STATUS: [], // 审核状态
        EDITION: [], // 版本
        PRICE_GRADE: [] // 物价等级
      }
    }
  },

  mounted() {
    this.$nextTick(() => {
      this.getDictionary(this.dict)
      this.get()
    })
  },
  methods: {

    // 获取字典
    getDictionary(list) {
      for (let item in list) {
        kindo.dictionary.getDictionary(item).then(res => {
          list[item] = res
        })
      }
    },

    // 获取
    get() {
      this.$refs.table.reloadData()
    },

    // 新增/编辑
    openDialog(name, row) {
      this.dialog.visible = true
      this.$nextTick(() => {
        this.$refs.form.resetFields()
        if (name === 'add') {
          this.dialog.title = '新增'
          this.dialog.form = this.$options.data.call(this).dialog.form
        } else if (name === 'edit') {
          this.dialog.title = '编辑'
          this.dialog.form = Object.assign({}, row)
        }
      })
    },

    // 删除
    del(type, id) {
      let data = {
        ids: []
      }
      if (type === 'all') {
        if (this.selcetData.length) {
          for (let i = 0; i < this.selcetData.length; i++) {
            data.ids.push(this.selcetData[i].id)
          }
        } else {
          kindo.util.alert('请选择一项进行操作', '提示', 'warning')
          return
        }
      } else if (type === 'one') {
        data.ids.push(id)
      }
      kindo.util.confirm('请确定删除', undefined, undefined, () => {
        this.$http.delete(this.config.api.operation, { data }).then(res => {
          if (res.code === 200) {
            kindo.util.alert('删除成功', '提示', 'success')
            this.get()
          }
        })
      })
    },

    // 保存
    save() {
      this.$refs.form.validate(valid => {
        if (valid) {
          let type = ''
          if (this.dialog.title === '新增') {
            type = 'post'
          } else if (this.dialog.title === '编辑') {
            type = 'put'
          }
          this.$http[type](this.config.api.operation, this.dialog.form).then(res => {
            if (res.code === 200) {
              kindo.util.alert('保存成功', '提示', 'success')
              this.get()
              this.dialog.visible = false
            }
          })
        }
      })
    },

    // 审核
    audit() {
      let data = []
      if (this.selcetData.length) {
        for (let i = 0; i < this.selcetData.length; i++) {
          data.push({ id: this.selcetData[i].id })
        }
      } else {
        kindo.util.alert('请选择一项进行操作', '提示', 'warning')
        return
      }
      kindo.util.confirm('请确定是否审核', undefined, undefined, () => {
        this.$http.put(this.config.api.batchAudit, data).then(res => {
          if (res.code === 200) {
            kindo.util.alert('审核成功', '提示', 'success')
            this.get()
          }
        })
      })
    }
  }
}
</script>