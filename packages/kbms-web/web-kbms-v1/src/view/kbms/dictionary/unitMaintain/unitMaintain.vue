/*
 * @Author: lilizhou
 * @Date: 2018-02-24 11:16:35
 * @Last Modified by: wuhuihui
 * @Last Modified time: 2018-06-28 16:01:54
 * 菜单：剂量/重量单位
 */

<template>
  <div>
    <kindo-box title="单位维护" icon="xx">
      <el-form :model="search" label-position="right" onsubmit="return false;" inline @keyup.enter.prevent.native="get('table')">
        <el-form-item label="单位名称">
          <el-input v-model.trim="search.name" clearable></el-input>
        </el-form-item>
        <el-form-item label="类型">
          <el-select v-model.trim="search.type" clearable filterable placeholder="请选择(可输入搜索)">
            <el-option v-for="(item,index) in dict.UNIT_TYPE" :key="index" :label="item.label" :value="item.value"></el-option>
          </el-select>
        </el-form-item>
      </el-form>
      <div slot="control">
        <el-button icon="el-icon-search" type="primary" @click="get('table')">查询</el-button>
      </div>
    </kindo-box>
    <kindo-box title="表格信息">
      <kindo-table ref="table" :url="url" :queryParam="search" @selection-change="(selection) => selectionChange(selection, 'selection')" @filter-change="(filters) => filterChange(filters, 'table', 'search')">
        <el-table-column type="selection" fixed="left" width="30"></el-table-column>
        <el-table-column label="单位名称" fixed="left" prop="name" min-width="120" header-align="center" sortable='custom' show-overflow-tooltip></el-table-column>
        <el-table-column label="类型" prop="type" min-width="120" header-align="center" show-overflow-tooltip>
          <template slot-scope="scope">
            {{kindo.dictionary.getLabel(dict.UNIT_TYPE,scope.row.type)}}
          </template>
        </el-table-column>
        <el-table-column label="备注" prop="remark" min-width="120" header-align="center" show-overflow-tooltip>
        </el-table-column>
        <el-table-column label="审核状态" prop="status" width="100" align="center" columnKey='status' :filters="filtersDict.AUDIT_STATUS" :filter-method="filterHandler" :filter-multiple="false" filter-placement="bottom-end">
          <template slot-scope="scope">
            <el-tag :type="scope.row.status === '1'?'success':'info'" close-transition>{{kindo.dictionary.getLabel(dict.AUDIT_STATUS,scope.row.status)}}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" align="center">
          <template slot-scope="scope">
            <el-tooltip class="item" effect="dark" :open-delay="300" content="编辑" placement="top-start">
              <el-button type="text" icon="el-icon-edit" @click="edit(scope.row, 'form', editUrl, 'visible')"></el-button>
            </el-tooltip>
            <el-tooltip class="item" effect="dark" :open-delay="300" content="删除" placement="top-start">
              <el-button type="text" icon="el-icon-delete" @click="deleteOne(scope.row.id, 'table')"></el-button>
            </el-tooltip>
          </template>
        </el-table-column>
      </kindo-table>
      <div slot="control">
        <el-button icon="el-icon-plus" type="text" @click="insert('visible', 'form')">新增</el-button>
        <el-button icon="el-icon-delete" type="text" @click="batch('selection', 'table', 'delete')">删除</el-button>
        <el-button icon="el-icon-view" type="text" @click="batch('selection', 'table', 'audit')">审核</el-button>
      </div>
    </kindo-box>
    <el-dialog v-drag top="0" :visible.sync="visible" :title="(form.id?'编辑':'新增') +'单位'" :modal-append-to-body="false" :close-on-click-modal="false">
      <el-form :model="form" :rules="formRules" onsubmit="return false;" label-width="90px" ref="form">
        <el-form-item label="单位名称" prop="name" class="box">
          <el-input v-model.trim="form.name" clearable></el-input>
        </el-form-item>
        <el-form-item label="类型" prop="type" class="box">
          <el-select v-model.trim="form.type" clearable filterable placeholder="请选择(可输入搜索)">
            <el-option v-for="(item,index) in dict.UNIT_TYPE" :key="index" :label="item.label" :value="item.value"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="备注" prop="remark" class="oneLineTextarea">
          <el-input type="textarea" :rows="2" placeholder="请输入内容" v-model.trim="form.remark">
          </el-input>
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button icon="el-icon-check" type="primary" @click="save('form','table','visible')">完 成</el-button>
        <el-button icon="el-icon-close" type="primary" @click="visible = false">取 消</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import config from './config'
// 依赖于 table - 表格处理
import tableMixIn from '@src/utils/helper/tableMixIn.js'

export default {
  name: 'unitMaintain',
  mixins: [tableMixIn],
  data() {
    return {
      url: config.api.table,
      editUrl: config.api.editQuery,
      loading: true,
      // 查询实体
      search: {
        name: '',
        type: '',
        status: ''
      },
      // 数据字典
      dict: {
        AUDIT_STATUS: [],
        UNIT_TYPE: []
      },
      filtersDict: {
        AUDIT_STATUS: []
      },

      // 已选中表格数据
      selection: [],

      // 编辑、新增弹窗显示
      visible: false,
      // 新增、编辑表单
      form: {
        id: '',
        name: '',
        remark: '',
        type: ''
      },

      // 表单校验规则
      formRules: {
        name: [{ required: true, message: '请输入', trigger: 'blur' }, { min: 0, max: 30, message: '长度不能超过30', trigger: 'blur' }],
        weightValue: [{ required: true, message: '请输入', trigger: 'blur' }, { min: 0, max: 30, message: '长度不能超过30', trigger: 'blur' }],
        type: [{ required: true, message: '请输入', trigger: 'blur' }],
        remark: [{ min: 0, max: 30, message: '长度不能超过30', trigger: 'blur' }]
      }
    }
  },

  created() {
    this._form = Object.assign({}, this.form)
    // 获取数据字典
    this.getDict(this.dict, this.filtersDict)
  },

  mounted() {
    this.$nextTick(() => {
      this.get('table')
    })
  },

  methods: {}
}
</script>
