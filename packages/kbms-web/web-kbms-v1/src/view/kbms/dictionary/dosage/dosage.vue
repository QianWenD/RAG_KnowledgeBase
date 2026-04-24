/* @Author: zhengtian
 * @Date: 2018-04-08
 * @菜单：药品剂型库
 */
<template>
  <div>
    <!-- 父表 -->
    <kindo-box title="剂型字典" icon="xx">
      <el-form v-model.trim="parent.search" onsubmit="return false;" label-position="right" inline @keyup.enter.prevent.native="getTable('parent')">
        <el-form-item label="名称">
          <el-input v-model.trim="parent.search.labelFormName" placeholder="" clearable></el-input>
        </el-form-item>
      </el-form>
      <div slot="control">
        <el-button icon="el-icon-search" type="primary" @click="getTable('parent')">查询</el-button>
      </div>
    </kindo-box>
    <kindo-box title="大剂型">
      <kindo-table ref="parent" :url="parent.url" :queryParam="parent.search" :extendOption="extend" @selection-change="(selection) => tableChange('parent', selection)" @current-change="tableClick" @filter-change="(filters) => filterChange(filters, 'parent', parent.search)" :pageSize="5">
        <el-table-column type="selection" fixed="left" width="30"></el-table-column>
        <el-table-column label="大剂型编码" prop="labelFormCode" min-width="120" header-align="center" show-overflow-tooltip></el-table-column>
        <el-table-column label="大剂型名称" prop="labelFormName" min-width="120" header-align="center" show-overflow-tooltip></el-table-column>
        <el-table-column label="审核状态" prop="status" width="100" align="center" columnKey='status' :filters="columnFilters(dict.AUDIT_STATUS)" :filter-method="filterHandler" :filter-multiple="false" filter-placement="bottom-end">
          <template slot-scope="scope">
            <el-tag :type="scope.row.status === '1'?'success':'info'" close-transition>{{kindo.dictionary.getLabel(dict.AUDIT_STATUS,scope.row.status)}}</el-tag>
          </template>
        </el-table-column>
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
        <el-button icon="el-icon-plus" type="text" @click="add('parent')">新增</el-button>
        <el-button icon="el-icon-delete" type="text" @click="remove('parent')">删除</el-button>
        <el-button icon="el-icon-view" type="text" @click="audit('parent')">审核</el-button>
      </div>
    </kindo-box>
    <kindo-box title="查询条件" icon="xx">
      <el-form v-model.trim="child.search" onsubmit="return false;" label-position="right" inline @keyup.enter.prevent.native="getTable('child')">
        <el-form-item label="小剂型名称">
          <el-input v-model.trim="child.search.actualFormName" placeholder="" clearable></el-input>
        </el-form-item>
      </el-form>
      <div slot="control">
        <el-button icon="el-icon-search" type="primary" @click="getTable('child')">查询</el-button>
      </div>
    </kindo-box>
    <kindo-box :title="child.title + '-小剂型'">
      <kindo-table ref="child" :url="child.url" :queryParam="child.search" :extendOption="extend" @selection-change="(selection) => tableChange('child', selection)">
        <el-table-column type="selection" fixed="left" width="30"></el-table-column>
        <el-table-column label="小剂型编码" fixed="left" prop="actualFormCode" min-width="120" header-align="center" show-overflow-tooltip></el-table-column>
        <el-table-column label="小剂型名称" prop="actualFormName" min-width="120" header-align="center" show-overflow-tooltip></el-table-column>
        <el-table-column label="审核状态" prop="status" width="100" align="center" columnKey='status' :filters="columnFilters(dict.AUDIT_STATUS)" :filter-method="filterHandler" :filter-multiple="false" filter-placement="bottom-end">
          <template slot-scope="scope">
            <el-tag :type="scope.row.status === '1'?'success':'info'" close-transition>{{kindo.dictionary.getLabel(dict.AUDIT_STATUS,scope.row.status)}}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" align="center" fixed="right">
          <template slot-scope="scope">
            <el-tooltip class="item" effect="dark" :open-delay="300" content="编辑" placement="top-start">
              <el-button type="text" icon="el-icon-edit" @click="update('child', scope.row.id)"></el-button>
            </el-tooltip>
            <el-tooltip class="item" effect="dark" :open-delay="300" content="删除" placement="top-start">
              <el-button type="text" icon="el-icon-delete" @click="remove('child', scope.row.id)"></el-button>
            </el-tooltip>
          </template>
        </el-table-column>
      </kindo-table>
      <div slot="control">
        <el-button icon="el-icon-plus" type="text" @click="add('child', 'labelFormId','childForm')">新增</el-button>
        <el-button icon="el-icon-delete" type="text" @click="remove('child')">删除</el-button>
        <el-button icon="el-icon-view" type="text" @click="audit('child')">审核</el-button>
      </div>
    </kindo-box>

    <!-- 主表新增-->
    <el-dialog v-drag top="0" :visible.sync="parent.dialog.visible" :title="parent.dialog.title + '大剂型'" :modal-append-to-body="false" :close-on-click-modal="false">
      <el-form :model="parent.form" onsubmit="return false;" class="box" ref="parentForm" :rules="parent.rules" label-width="90px" label-position="right">
        <el-form-item label="名称" prop="labelFormName">
          <el-input v-model.trim="parent.form.labelFormName"></el-input>
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button type="primary" icon="fa fa-floppy-o" @click="save('parent')">保 存</el-button>
        <el-button @click="parent.dialog.visible = false" icon="el-icon-close" type="primary">取 消</el-button>
      </div>
    </el-dialog>
    <!-- 主表新增-->
    <!-- 子表新增-->
    <el-dialog v-drag top="0" :visible.sync="child.dialog.visible" :title="child.dialog.title +'小剂型'" :modal-append-to-body="false" :close-on-click-modal="false">
      <el-form :model="child.form" onsubmit="return false;" class="box" ref="childForm" :rules="child.rules" label-width="90px" label-position="right">
        <el-form-item label="大剂型">
          <el-input v-model.trim="child.title" disabled></el-input>
        </el-form-item>
        <el-form-item label="名称" prop="actualFormName">
          <el-input v-model.trim="child.form.actualFormName"></el-input>
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button type="primary" icon="fa fa-floppy-o" @click="save('child')">保 存</el-button>
        <el-button @click="child.dialog.visible = false" icon="el-icon-close" type="primary">取 消</el-button>
      </div>
    </el-dialog>
    <!-- 子表新增-->
  </div>
</template>

<script>
import config from './config/index.js'
import tableOpra from '@src/utils/helper/tableOpra.js'
export default {
  name: 'dosage',
  mixins: [tableOpra],
  data() {
    return {
      // 主表默认选第一行数据
      extend: { selectedFirst: true },
      loading: false,
      disabled: true,
      dict: {
        AUDIT_STATUS: []
      },

      parent: {
        url: config.api.parent,
        selection: [],
        current: [],
        dialog: {
          visible: false,
          title: '新增'
        },
        form: {
          id: '',
          labelFormName: ''
        },
        rules: {
          labelFormName: [{ required: true, message: '请输入名称', trigger: 'blur' }, { min: 0, max: 30, message: '长度不能超过30' }]
        },
        search: {
          labelFormName: '',
          status: ''
        }
      },
      child: {
        title: '',
        url: config.api.child,
        selection: [],
        dialog: {
          visible: false,
          title: '新增'
        },
        labelFormName: '',
        form: {
          id: '',
          labelFormId: '',
          actualFormName: ''
        },
        rules: {
          actualFormName: [{ required: true, message: '请输入名称', trigger: 'blur' }, { min: 0, max: 30, message: '长度不能超过30' }]
        },
        search: {
          labelFormId: '',
          actualFormName: ''
        }
      }
    }
  },
  methods: {
    tableClick(row) {
      if (row) {
        this.child.form.labelFormId = row.id
        this.child.search.labelFormId = row.id
        this.child.title = row.labelFormName
        this.getTable('child')
      } else {
        this.child.title = ''
        this.$refs.child.clearTable()
      }
    }
  },
  created() {
    this.getDictionary()
  },
  mounted() {
    this.$nextTick(() => {
      this.getTable('parent')
    })
  },
  watch: {
    'child.dialog.visible': function (v) {
      if (v) {
        if (this.child.form.id !== '') {
          this.child.form.actualFormName = ''
        }
      }
    }
  }
}
</script>