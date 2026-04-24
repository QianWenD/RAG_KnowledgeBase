/*
 * @Author: 吴策 
 * @Date: 2021-06-16 11:14:34 
 * @Last Modified by: 吴策
 * @菜单名: 重复用药
 * @Last Modified time: 2021-06-16 11:31:19
 */

<template>
  <div class="wrap">

    <!-- 主表格 -->
    <kindo-box title="查询条件">
      <el-form :model="parent.search" label-position="right" inline @keyup.enter.prevent.native="get('parent')">
        <el-form-item label="组别编码">
          <el-input v-model.trim="parent.search.groupCode" clearable placeholder="请输入组别编码"></el-input>
        </el-form-item>
        <el-form-item label="组别名称">
          <el-input v-model.trim="parent.search.groupName" clearable placeholder="请输入组别名称"></el-input>
        </el-form-item>
      </el-form>
      <div slot="control">
        <el-button icon="el-icon-search" type="primary" @click="get('parent')">查询</el-button>
      </div>
    </kindo-box>
    <kindo-box title="药理组别信息">
      <div slot="control">
        <el-button icon="el-icon-plus" type="text" @click="add('parent','','parentForm')">新增</el-button>
        <el-button icon="el-icon-delete" type="text" @click="remove('parent')">删除</el-button>
      </div>
      <kindo-table ref="parent" :url="parent.url" :queryParam="parent.search" @selection-change="(selection) => tableChange('parent', selection)" :loadFilter="loadFilter" @current-change="currentChange">
        <el-table-column type="selection" fixed="left" width="30"></el-table-column>
        <el-table-column label="组别编码" prop="groupCode" header-align="center" min-width="200" show-overflow-tooltip></el-table-column>
        <el-table-column label="组别名称" prop="groupName" header-align="center" min-width="200" show-overflow-tooltip></el-table-column>
        <el-table-column label="周期" prop="period" header-align="center" min-width="150" show-overflow-tooltip></el-table-column>
        <el-table-column label="备注" prop="remark" header-align="center" min-width="250" show-overflow-tooltip></el-table-column>
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
    <kindo-box title="药理组别药品信息">
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
    <el-dialog v-drag top="0" :visible.sync="parent.dialog.visible" :title="parent.dialog.title +'药理组别信息'" :modal-append-to-body="false" :close-on-click-modal="false">
      <el-form :model="parent.form" class="box" ref="parentForm" label-width="120px" :rules="parent.rules" label-position="right">
        <el-form-item label="组别编码" prop="groupCode">
          <el-input v-model.trim="parent.form.groupCode" placeholder="请输入组别编码"></el-input>
        </el-form-item>
        <el-form-item label="组别名称" prop="groupName">
          <el-input v-model.trim="parent.form.groupName" placeholder="请输入组别名称"></el-input>
        </el-form-item>
        <el-form-item label="周期" prop="period">
          <el-input v-model.trim="parent.form.period" placeholder="请输入周期"></el-input>
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
    <el-dialog v-drag top="0" :visible.sync="children.dialog.visible" :title="children.dialog.title +'药理组别药品信息'" :modal-append-to-body="false" :close-on-click-modal="false">
      <el-form :model="children.form" class="box" ref="childrenForm" label-width="120px" :rules="children.rules" label-position="right">
        <el-form-item label="项目类型" prop="itemType">
          <el-select v-model.trim="children.form.itemType" placeholder="请选择项目类型">
            <el-option v-for="item in dict.POPULATION_CATEGORY_ITEM_TYPE" :key="item.value" :label="item.label" :value="item.value">
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

      // 主表格
      parent: {
        url: config.api.table1,
        selection: [],
        search: {
          groupCode: '',
          groupName: ''
        },
        dialog: {
          visible: false,
          title: '新增'
        },
        form: {
          id: '',
          groupCode: '',
          groupName: '',
          period: '',
          remark: ''
        },
        rules: {
          groupCode: [{ required: true, message: '请输入组别编码', trigger: 'blur' }],
          groupName: [{ required: true, message: '请输入组别名称', trigger: 'blur' }]
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
    }
  }
}
</script>