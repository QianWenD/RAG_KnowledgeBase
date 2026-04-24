/*
 * @Author: wuhuihui
 * @Date: 2019-04-24
 * @Desc: CCDT
 */
<template>
  <div>
    <!-- 父表 -->
    <kindo-box title="查询条件" icon="xx">
      <el-form :model="parent.search" onsubmit="return false;" label-position="right" inline @keyup.enter.prevent.native="getTable('parent')">
        <el-form-item label="CCDT编码">
          <el-input v-model.trim="parent.search.code" placeholder="" clearable></el-input>
        </el-form-item>
        <el-form-item label="CCDT名称">
          <el-input v-model.trim="parent.search.name" placeholder="" clearable></el-input>
        </el-form-item>
      </el-form>
      <div slot="control">
        <el-button icon="el-icon-search" type="primary" @click="getTable('parent')">查询</el-button>
      </div>
    </kindo-box>
    <kindo-box title="CCDT">
      <kindo-table ref="parent" :url="parent.url" :queryParam="parent.search" :extendOption="extend" @selection-change="(selection) => tableChange('parent', selection)">
        <el-table-column type="selection" fixed="left" width="30"></el-table-column>
        <el-table-column label="CCDT编码" fixed="left" prop="code" min-width="100" sortable="custom" header-align="center"></el-table-column>
        <el-table-column label="CCDT名称" prop="name" min-width="120" sortable="custom" header-align="center"></el-table-column>
        <el-table-column label="操作" width="100" align="center" fixed="right">
          <template slot-scope="scope">
            <el-tooltip class="item" effect="dark" :open-delay="300" content="编辑" placement="top-start">
              <el-button type="text" icon="el-icon-edit" @click="update('parent', scope.row.id)"></el-button>
            </el-tooltip>
            <el-tooltip class="item" effect="dark" :open-delay="300" content="删除" placement="top-start">
              <el-button type="text" icon="el-icon-delete" @click="remove('parent', scope.row.id)"></el-button>
            </el-tooltip>
          </template>
        </el-table-column>
      </kindo-table>
      <div slot="control">
        <el-button icon="el-icon-plus" type="text" @click="add('parent', '', 'parentForm')">新增</el-button>
        <el-button icon="el-icon-delete" type="text" @click="remove('parent')">删除</el-button>
      </div>
    </kindo-box>
    <!-- 父表弹框-->
    <el-dialog v-drag top="0" :visible.sync="parent.dialog.visible" :title="parent.dialog.title + 'CCDT'" :modal-append-to-body="false" :close-on-click-modal="false">
      <el-form :model="parent.form" class="box" onsubmit="return false;" ref="parentForm" :rules="parent.rules" label-width="110px" label-position="right">
        <el-form-item label="CCDT编码" prop="code">
          <el-input v-model.trim="parent.form.code" placeholder="示例(A02.001)"></el-input>
        </el-form-item>
        <el-form-item label="CCDT名称" prop="name">
          <el-input v-model.trim="parent.form.name"></el-input>
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button type="primary" icon="fa fa-floppy-o" @click="save('parent')">保 存</el-button>
        <el-button @click="parent.dialog.visible = false" icon="el-icon-close" type="primary">取 消</el-button>
      </div>
    </el-dialog>
    <!-- 父表弹框-->
  </div>
</template>

<script>
import config from './config/index.js'
import tableOpra from '@src/utils/helper/tableOpra.js'
export default {
  name: 'ccdt',
  mixins: [tableOpra],
  data() {
    return {
      // 主表默认选第一行数据
      extend: { selectedFirst: true },
      loading: false,
      disabled: true,
      parent: {
        url: config.api.parent,
        selection: [],
        search: {
          name: '',
          code: ''
        },
        dialog: {
          visible: false,
          title: ''
        },
        form: {
          id: '',
          name: '',
          code: ''
        },
        rules: {
          name: [{ required: true, message: '请输入CCDT名称', trigger: 'blur' }, { min: 0, max: 30, message: '长度不能超过30' }],
          code: [
            { required: true, message: '请输入CCDT编码', trigger: 'blur' },
            {
              validator: (rule, value, callback) => {
                // 验证编码格式 示例：A11.22
                let reg = new RegExp(/^[a-z A-Z]([A-Z a-z 0-9]|\.)*([ A-Z a-z 0-9]|\+)$/)
                if (!reg.test(value)) {
                  callback(new Error('请按照格式输入编码'))
                } else {
                  callback()
                }
              },
              trigger: 'blur'
            },
            { min: 0, max: 30, message: '长度不能超过30' }
          ]
        }
      }
    }
  },
  methods: {},

  created() { },

  mounted() {
    this.$nextTick(() => {
      this.getTable('parent')
    })
  }
}
</script>