/*
 * @Author: 吴策 
 * @Date: 2019-09-23 17:31:06 
 * @Last Modified by: 吴策
 * @菜单名: 限险种规则
 * @Last Modified time: 2019-09-27 08:57:15
 */

<template>
  <div>
    <kindo-box title="查询条件">
      <el-form v-model.trim="search" onsubmit="return false;" label-position="right" inline
        @keyup.enter.native="get('table')">
        <el-form-item label="诊疗规则">
          <el-input v-model.trim="search.itemName" placeholder="" clearable></el-input>
        </el-form-item>
      </el-form>
      <div slot="control">
        <el-button icon="el-icon-search" type="primary" @click="get('table')">查询</el-button>
      </div>
    </kindo-box>
    <kindo-box title="配置规则">
      <kindo-table ref="table" @selection-change="val => this.selcetData = val" :url="config.api.operation"
        :queryParam="search">
        <el-table-column type="selection" fixed="left" width="30"></el-table-column>
        <el-table-column label="项目类别" width="150" header-align="center" align="center" show-overflow-tooltip>
          <template slot-scope="scope">
            <span>{{ formatter(scope.row.itemType,dict.ITEM_TYPE) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="项目编码" prop="itemCode" sortable="custom" header-align="center" show-overflow-tooltip>
        </el-table-column>
        <el-table-column label="项目名称" prop="itemName" sortable="custom" header-align="center" show-overflow-tooltip>
        </el-table-column>
        <el-table-column label="险种" header-align="center" show-overflow-tooltip>
          <template slot-scope="scope">
            <span>{{ formatter(scope.row.insurance,dict.INSURANCE) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="医疗类型" prop="admissionType" header-align="center" width="150" align="center"
          show-overflow-tooltip>
        </el-table-column>
        <el-table-column label="剂型" prop="dosageForm" width="150" align="center" header-align="center"
          show-overflow-tooltip>
        </el-table-column>
        <el-table-column label="描述" prop="remark" header-align="center" show-overflow-tooltip>
        </el-table-column>
        <el-table-column label="审核状态" prop="status" width="150" align="center" header-align="center"
          show-overflow-tooltip>
          <template slot-scope="scope">
            <el-tag :type="scope.row.status === '1'?'success':'info'" close-transition>
              {{ formatter(scope.row.status,dict.AUDIT_STATUS) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" align="center">
          <template slot-scope="scope">
            <el-tooltip class="item" effect="dark" :open-delay="300" content="编辑" placement="top-start">
              <el-button type="text" icon="el-icon-edit" @click="edit(scope.row)"></el-button>
            </el-tooltip>
            <el-tooltip class="item" effect="dark" :open-delay="300" content="删除" placement="top-start">
              <el-button type="text" icon="el-icon-delete" @click="del('one',scope.row.id)"></el-button>
            </el-tooltip>
          </template>
        </el-table-column>
      </kindo-table>
      <div slot="control">
        <el-button icon="el-icon-plus" type="text" @click="add">新增</el-button>
        <el-button icon="el-icon-delete" type="text" @click="del('all')">删除</el-button>
        <el-button icon="el-icon-view" type="text" @click="audit">审核</el-button>
      </div>
    </kindo-box>

    <el-dialog v-drag top="0" :visible.sync="dialog.visible" :title="dialog.title + '险种规则'"
      :modal-append-to-body="false" :close-on-click-modal="false">
      <el-form :model="dialog.form" class="box" onsubmit="return false;" ref="form" :rules="dialog.rules"
        label-width="90px" label-position="right">

        <el-form-item label="项目类别" prop="itemType">
          <el-select v-model.trim="dialog.form.itemType" :disabled="this.dialog.title === '编辑'" size="mini"
            placeholder="请选择" clearable filterable>
            <el-option v-for="item in dict.ITEM_TYPE" :key="item.value" :label="item.label" :value="item.value">
            </el-option>
          </el-select>
        </el-form-item>

        <el-form-item label="项目名称" prop="itemCode">
          <el-select v-if="dialog.form.itemType !== '3'" v-model.trim="dialog.form.itemCode" size="mini"
            placeholder="请选择" clearable filterable :disabled="this.dialog.title === '编辑' || dialog.form.itemType === ''"
            @blur="(ev)=>{blurSel(ev,dialog.form,'itemCode','itemCodeList')}" remote
            :remote-method="(query) => dialog.form.itemType === '1' ? getItemCodeList1('getItemCodeList1','itemCodeList', 'hcGenericName', query) : getItemCodeList2('getItemCodeList2','itemCodeList', 'itemName', query)">
            <li class="title">
              <span>{{ leftVal }}</span>
              <span>{{ rightVal }}</span>
            </li>
            <li class="tip">
              <span>
                &lt;请选择&gt;
              </span>
            </li>
            <el-option v-for="item in itemCodeList" :key="item.value" :label="item.label" :value="item.value">
              <div @click="actualFormName = item.actualFormName">
                <span>{{ item.value }}</span>
                <span>{{ dialog.form.itemType === '1' ? item.label+'('+item.actualFormName+')' :  item.label }}</span>
              </div>
            </el-option>
          </el-select>

          <el-input v-if="dialog.form.itemType === '3'" :disabled="this.dialog.title === '编辑'" maxlength="30"
            v-model="dialog.form.itemCode" placeholder="请输入" clearable>
          </el-input>

        </el-form-item>

        <el-form-item label="剂型" v-if="dialog.form.itemType === '1'">
          <el-input :value="actualFormName" disabled></el-input>
        </el-form-item>

        <el-form-item label="险种" prop="insurance">
          <el-select v-model="dialog.form.insurance" placeholder="请选择" clearable filterable>
            <el-option v-for="item in dict.INSURANCE" :key="item.value" :label="item.label" :value="item.value">
            </el-option>
          </el-select>
        </el-form-item>

        <el-form-item label="医疗类型" prop="admissionType">
          <el-select v-model="dialog.form.admissionType" placeholder="请选择" clearable filterable>
            <el-option v-for="item in dict.ADMISSION_TYPE" :key="item.value" :label="item.label" :value="item.value">
            </el-option>
          </el-select>
        </el-form-item>

        <el-form-item label="描述" prop="remark">
          <el-input v-model.trim="dialog.form.remark" maxlength="200" type="textarea" placeholder="可输入200文字">
          </el-input>
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
        itemName: ''
      },
      dialog: {
        title: '新增',
        visible: false,
        form: {
          itemCode: '',
          itemType: '',
          remark: '',
          insurance: '',
          admissionType: ''
        },
        // 表单校验规则
        rules: {
          itemType: [{ required: true, message: '请选择项目类型', trigger: 'blur' }],
          itemCode: [{ required: true, message: '请选择输入项目名称', trigger: 'blur' }],
          remark: [{ min: 0, max: 200, message: '长度不能超过200' }],
          insurance: [{ required: true, message: '请选择险种', trigger: 'blur' }],
          admissionType: [{ required: true, message: '请选择医疗类型', trigger: 'blur' }]
        }
      },
      leftVal: '',
      rightVal: '',
      itemCodeList: [],
      selcetData: [],
      actualFormName: '',

      // 字典
      dict: {
        // 项目类型
        ITEM_TYPE: [],
        // 审核状态
        AUDIT_STATUS: [],
        // 险种
        INSURANCE: [],
        // 医疗类型
        ADMISSION_TYPE: []
      }
    }
  },
  watch: {
    'dialog.form.itemType': {
      handler(val) {
        this.itemCodeList = []
        this.dialog.form.itemCode = ''
        this.actualFormName = ''
        if (val === '1') {
          this.leftVal = '药品编码'
          this.rightVal = '药品名称'
        } else if (val === '2') {
          this.leftVal = '诊疗编码'
          this.rightVal = '诊疗名称'
        }
      },
      immediate: true
    },

    'dialog.form.itemCode': {
      handler(val) {
        if (val === '') {
          this.actualFormName = ''
        }
      },
      immediate: true
    }
  },
  mounted() {
    this.getDictionary(this.dict)
    this.$nextTick(() => {
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

    // 药品远程查询
    getItemCodeList1(api, dict, searchName, searchVal) {
      let data = { rows: 100, [searchName]: searchVal, status: '1' }
      this.$http.get(this.config.api[api], { params: data }).then(res => {
        this[dict] =
          res.data.rows.map(item => {
            return { label: item.hcGenericName, value: item.hcDrugCode, actualFormName: item.actualFormName }
          }) || []
      })
    },

    // 诊疗远程查询
    getItemCodeList2(api, dict, searchName, searchVal) {
      let data = { rows: 100, [searchName]: searchVal }
      this.$http.get(this.config.api[api], { params: data }).then(res => {
        this[dict] =
          res.data.rows.map(item => {
            return { label: item.itemName, value: item.itemCode }
          }) || []
      })
    },

    blurSel(ev, form, filed, gName) {
      setTimeout(() => {
        if (form[filed] === '') {
          this[gName] = []
        }
      }, 500)
    },

    // 新增
    add() {
      this.dialog.title = '新增'
      this.dialog.visible = true
      this.$nextTick(() => {
        this.$refs.form.resetFields()
        this.itemCodeList = []
        this.dialog.form = {
          itemCode: '',
          itemType: '',
          remark: '',
          insurance: '',
          admissionType: ''
        }
      })
    },

    // 编辑
    edit(row) {
      this.dialog.title = '编辑'
      this.dialog.visible = true
      this.$nextTick(() => {
        this.$refs.form.resetFields()
        this.dialog.form = {
          itemType: row.itemType,
          itemCode: row.itemCode,
          remark: row.remark,
          insurance: row.insurance,
          admissionType: row.admissionType,
          id: row.id
        }
        setTimeout(() => {
          if (row.itemType === '3') {
            this.dialog.form.itemCode = row.itemName
          } else {
            this.itemCodeList = [{ value: row.itemCode, label: row.itemName }]
            this.dialog.form.itemCode = row.itemCode
            this.actualFormName = row.dosageForm
          }
        }, 200)
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
    },

    // 格式化数据
    formatter(val, list) {
      for (let i = 0; i < list.length; i++) {
        if (val === list[i].value) {
          return list[i].label
        }
      }
    }
  }
}
</script>