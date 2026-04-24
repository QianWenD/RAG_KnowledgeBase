/*
 * @Author: 吴策 
 * @Date: 2021-06-09 15:05:29 
 * @Last Modified by: 吴策
 * @菜单名: 人群其他分类
 * @Last Modified time: 2021-06-10 17:20:59
 */

<template>
  <div class="wrap">

    <!-- 主表格 -->
    <kindo-box title="查询条件">
      <el-form :model="parent.search" label-position="right" inline @keyup.enter.prevent.native="get('parent')">
        <el-form-item label="人群分类名称">
          <el-input v-model.trim="parent.search.name" clearable placeholder="请输入人群分类名称"></el-input>
        </el-form-item>
      </el-form>
      <div slot="control">
        <el-button icon="el-icon-search" type="primary" @click="get('parent')">查询</el-button>
      </div>
    </kindo-box>
    <kindo-box title="人群信息维护">
      <div slot="control">
        <el-button icon="el-icon-plus" type="text" @click="add('parent','','parentForm')">新增</el-button>
        <el-button icon="el-icon-delete" type="text" @click="remove('parent')">删除</el-button>
      </div>
      <kindo-table ref="parent" :url="parent.url" :queryParam="parent.search" @selection-change="(selection) => tableChange('parent', selection)" :loadFilter="loadFilter" @current-change="currentChange">
        <el-table-column type="selection" fixed="left" width="30"></el-table-column>
        <el-table-column label="人群分类名称" prop="name" header-align="center" min-width="250" show-overflow-tooltip></el-table-column>
        <el-table-column label="备注" prop="remark" header-align="center" min-width="400" show-overflow-tooltip></el-table-column>
        <el-table-column label="操作" align="center" min-width="150" show-overflow-tooltip>
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
    </kindo-box>

    <!-- 子表格 -->
    <kindo-box title="查询条件">
      <el-form :model="children.search" label-position="right" inline @keyup.enter.prevent.native="get('children')">
        <el-form-item label="项目类型">
          <el-select v-model.trim="children.search.itemType" clearable placeholder="请选择项目类型">
            <el-option v-for="item in dict.POPULATION_CATEGORY_ITEM_TYPE" :key="item.value" :label="item.label" :value="item.value">
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="项目名称">
          <el-input v-model.trim="children.search.name" clearable placeholder="请输入项目名称"></el-input>
        </el-form-item>
      </el-form>
      <div slot="control">
        <el-button icon="el-icon-search" type="primary" @click="get('children')">查询</el-button>
      </div>
    </kindo-box>
    <kindo-box title="人群其他分类项目">
      <div slot="control">
        <el-button icon="el-icon-plus" type="text" @click="add('children','','childrenForm')">新增</el-button>
        <el-button icon="el-icon-delete" type="text" @click="remove('children')">删除</el-button>
        <el-button icon="el-icon-view" type="text" @click="audit('children')">审核</el-button>
      </div>
      <kindo-table ref="children" :url="children.url" :queryParam="children.search" @selection-change="(selection) => tableChange('children', selection)">
        <el-table-column type="selection" fixed="left" width="30"></el-table-column>
        <el-table-column label="项目类型" prop="itemType" min-width="200" header-align="center" show-overflow-tooltip>
          <template slot-scope="scope">
            <span>{{ kindo.dictionary.getLabel(dict.POPULATION_CATEGORY_ITEM_TYPE,scope.row.itemType) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="项目编码" prop="code" min-width="250" header-align="center" show-overflow-tooltip></el-table-column>
        <el-table-column label="项目名称" prop="name" min-width="300" header-align="center" show-overflow-tooltip></el-table-column>
        <el-table-column label="审核状态" prop="status" min-width="200" header-align="center" show-overflow-tooltip>
          <template slot-scope="scope">
            <span>{{ kindo.dictionary.getLabel(dict.AUDIT_STATUS,scope.row.status) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" align="center" min-width="150" show-overflow-tooltip>
          <template slot-scope="scope">
            <el-tooltip class="item" effect="dark" :open-delay="300" content="审核" placement="top-start">
              <el-button type="text" icon="el-icon-view" @click="audit('children', scope.row.id)"></el-button>
            </el-tooltip>
            <el-tooltip class="item" effect="dark" :open-delay="300" content="编辑" placement="top-start">
              <el-button type="text" icon="el-icon-edit" @click="update('children', scope.row.id)"></el-button>
            </el-tooltip>
            <el-tooltip class="item" effect="dark" :open-delay="300" content="删除" placement="top-start">
              <el-button type="text" icon="el-icon-delete" @click="remove('children', scope.row.id)"></el-button>
            </el-tooltip>
          </template>
        </el-table-column>
      </kindo-table>
    </kindo-box>

    <!-- 主表格弹框 -->
    <el-dialog v-drag top="0" :visible.sync="parent.dialog.visible" :title="parent.dialog.title +'人群信息维护'" :modal-append-to-body="false" :close-on-click-modal="false">
      <el-form :model="parent.form" class="box" ref="parentForm" label-width="120px" :rules="parent.rules" label-position="right">
        <el-form-item label="人群分类名称" prop="name">
          <el-input v-model.trim="parent.form.name" placeholder="请输入人群分类名称"></el-input>
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input type="textarea" :rows="3" v-model.trim="parent.form.remark" placeholder="请输入备注">
          </el-input>
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button type="primary" icon="fa fa-floppy-o" @click="save('parent')">保 存</el-button>
        <el-button @click="parent.dialog.visible = false" icon="el-icon-close" type="primary">取 消</el-button>
      </div>
    </el-dialog>

    <!-- 子表格弹框 -->
    <el-dialog v-drag top="0" :visible.sync="children.dialog.visible" :title="children.dialog.title +'人群其他分类项目'" :modal-append-to-body="false" :close-on-click-modal="false">
      <el-form :model="children.form" class="box" ref="childrenForm" label-width="120px" :rules="children.rules" label-position="right">
        <el-form-item label="项目类型" prop="itemType">
          <el-select v-model.trim="children.form.itemType" placeholder="请选择项目类型" @change="clearData">
            <el-option v-for="item in dict.POPULATION_CATEGORY_ITEM_TYPE" :key="item.value" :label="item.label" :value="item.value">
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="项目编码" prop="code">
          <el-select v-model="children.form.code" :disabled="!children.form.itemType" filterable remote reserve-keyword placeholder="请输入项目编码" :remote-method="(val)=> remoteMethod(val,'')" :loading="loading" @change="itemChange">
            <li class="title">
              <span>{{ kindo.dictionary.getLabel(dict.POPULATION_CATEGORY_ITEM_TYPE,children.form.itemType) }}编码</span>
              <span>{{ kindo.dictionary.getLabel(dict.POPULATION_CATEGORY_ITEM_TYPE,children.form.itemType) }}名称</span>
            </li>
            <li class="tip">
              <span>
                &lt;请选择&gt;
              </span>
            </li>
            <el-option v-for="item in dict.ITEM_OPTIONS" :key="item[keyCode]" :label="item[keyCode]" :value="item[keyCode]">
              <span>{{ item[keyCode] }}</span>
              <span>{{ item[keyName] }}</span>
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="项目名称" prop="name">
          <el-select v-model="children.form.name" :disabled="!children.form.itemType" filterable remote reserve-keyword placeholder="请输入项目名称" :remote-method="(val)=>remoteMethod('',val)" :loading="loading" @change="itemChange">
            <li class="title">
              <span>{{ kindo.dictionary.getLabel(dict.POPULATION_CATEGORY_ITEM_TYPE,children.form.itemType) }}编码</span>
              <span>{{ kindo.dictionary.getLabel(dict.POPULATION_CATEGORY_ITEM_TYPE,children.form.itemType) }}名称</span>
            </li>
            <li class="tip">
              <span>
                &lt;请选择&gt;
              </span>
            </li>
            <el-option v-for="item in dict.ITEM_OPTIONS" :key="item[keyCode]" :label="item[keyName]" :value="item[keyCode]">
              <span>{{ item[keyCode] }}</span>
              <span>{{ item[keyName] }}</span>
            </el-option>
          </el-select>
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button type="primary" icon="fa fa-floppy-o" @click="save('children')">保 存</el-button>
        <el-button @click="children.dialog.visible = false" icon="el-icon-close" type="primary">取 消</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import config from './config'
import tableOpra from '@src/utils/helper/tableOpra.js'
export default {
  mixins: [tableOpra],
  data() {
    return {
      config: config,
      loading: false,
      keyName: 'name',
      keyCode: 'code',

      // 主表格
      parent: {
        url: config.api.table1,
        selection: [],
        search: {
          name: ''
        },
        dialog: {
          visible: false,
          title: '新增'
        },
        form: {
          id: '',
          name: '',
          remark: ''
        },
        rules: {
          name: [{ required: true, message: '请输入人群分类名称', trigger: 'blur' }]
        }
      },

      // 子表格
      children: {
        url: config.api.table2,
        selection: [],
        search: {
          populationCategoryId: '',
          itemType: '',
          name: ''
        },
        dialog: {
          visible: false,
          title: '新增'
        },
        form: {
          id: '',
          itemType: '',
          code: '',
          name: ''
        },
        splicingForm: {
          populationCategoryId: ''
        },
        rules: {
          itemType: [{ required: true, message: '请输入项目名称', trigger: 'change' }],
          code: [{ required: true, message: '请输入项目编码', trigger: 'blur' }],
          name: [{ required: true, message: '请输入项目名称', trigger: 'blur' }]
        }
      },
      dict: {
        // 审核状态
        AUDIT_STATUS: [],
        // 项目类型
        POPULATION_CATEGORY_ITEM_TYPE: [],
        // 项目编码/名称
        ITEM_OPTIONS: []
      }
    }
  },
  created() {
    this.getDictionary()
  },
  mounted() {
    this.$nextTick(() => {
      this.get('parent')
    })
  },
  methods: {

    // 查询表格数据
    get(tableName) {
      this.$refs[tableName].reloadData()
    },

    // 表格过滤处理
    loadFilter(res) {
      if (res.code === 200) {
        if (res.data.rows && res.data.rows.length) {
          this.children.search.populationCategoryId = res.data.rows[0].id
          this.children.splicingForm.populationCategoryId = res.data.rows[0].id
          this.$refs.parent.setCurrentRow(res.data.rows[0])
        }
      }
      return res
    },

    // 表格行选中事件
    currentChange(row) {
      if (row) {
        this.children.search.populationCategoryId = row.id
        this.children.splicingForm.populationCategoryId = row.id
        this.get('children')
      } else {
        this.$refs.children.internalData = []
      }
    },

    // 远程查询
    remoteMethod(val, name) {
      this.dict.ITEM_OPTIONS = []
      if (val !== '' || name !== '') {
        this.loading = true
        let params = {}
        switch (this.children.form.itemType) {
          // 药品
          case '1':
            this.keyCode = 'hcDrugCode'
            this.keyName = 'hcGenericName'
            params = { hcDrugCode: val, hcGenericName: name }
            this.$http.get(config.api.getItemCode1, { params: params }).then(res => {
              if (res.code === 200) {
                this.loading = false
                this.dict.ITEM_OPTIONS = res.data.rows
              }
            })
            break
          // 项目
          case '2':
            this.keyCode = 'code'
            this.keyName = 'name'
            params = { code: val, name: name }
            this.$http.get(config.api.getItemCode2, { params: params }).then(res => {
              if (res.code === 200) {
                this.loading = false
                this.dict.ITEM_OPTIONS = res.data.rows
              }
            })
            break
          // 诊断
          case '3':
            this.keyCode = 'code'
            this.keyName = 'name'
            params = { code: val, name: name }
            this.$http.get(config.api.getItemCode3, { params: params }).then(res => {
              if (res.code === 200) {
                this.loading = false
                this.dict.ITEM_OPTIONS = res.data.rows
              }
            })
            break
          // 险种
          case '4':
            this.keyCode = 'limitCode'
            this.keyName = 'limitName'
            params = { limitCode: val, limitName: name }
            this.$http.get(config.api.getItemCode4, { params: params }).then(res => {
              if (res.code === 200) {
                this.loading = false
                this.dict.ITEM_OPTIONS = res.data.rows
              }
            })
            break
        }
      }
    },
    // 获取名称/编码
    itemChange(val) {
      for (let i = 0; i < this.dict.ITEM_OPTIONS.length; i++) {
        if (val === this.dict.ITEM_OPTIONS[i][this.keyCode]) {
          this.children.form.code = this.dict.ITEM_OPTIONS[i][this.keyCode]
          this.children.form.name = this.dict.ITEM_OPTIONS[i][this.keyName]
        }
      }
    },

    // 清空名称/编码
    clearData() {
      this.children.form.code = ''
      this.children.form.name = ''
      this.dict.ITEM_OPTIONS = []
    }
  }
}
</script>