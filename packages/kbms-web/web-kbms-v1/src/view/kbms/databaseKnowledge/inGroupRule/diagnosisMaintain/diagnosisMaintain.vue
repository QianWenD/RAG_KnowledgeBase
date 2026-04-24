/*
 * @Author: 吴策 
 * @Date: 2021-06-11 11:18:57 
 * @Last Modified by: 吴策
 * @菜单名: 诊疗诊断维护
 * @Last Modified time: 2021-06-11 11:19:26
 */
<template>
  <div>
    <el-tabs v-model="activeName" type="card">
      <!-- 诊断维护 -->
      <el-tab-pane label="诊断维护" name="诊断维护">
        <kindo-box title="查询条件">
          <el-form :model="ZDWH.search" label-position="right" inline @keyup.enter.prevent.native="get('ZDWH')">
            <el-form-item label="诊断模块编码">
              <el-input v-model.trim="ZDWH.search.code" clearable placeholder="请输入诊断模块编码"></el-input>
            </el-form-item>
            <el-form-item label="诊断模块名称">
              <el-input v-model.trim="ZDWH.search.name" clearable placeholder="请输入诊断模块名称"></el-input>
            </el-form-item>
          </el-form>
          <div slot="control">
            <el-button icon="el-icon-search" type="primary" @click="get('ZDWH')">查询</el-button>
          </div>
        </kindo-box>

        <kindo-box title="诊断模块信息">
          <div slot="control">
            <el-button icon="el-icon-plus" type="text" @click="add('ZDWH','','ZDWHForm')">新增</el-button>
            <el-button icon="el-icon-delete" type="text" @click="remove('ZDWH')">删除</el-button>
          </div>
          <kindo-table ref="ZDWH" :url="ZDWH.url" :queryParam="ZDWH.search" @selection-change="(selection) => tableChange('ZDWH', selection)">
            <el-table-column type="selection" fixed="left" width="30"></el-table-column>
            <el-table-column label="诊断模块编码" prop="code" min-width="200" header-align="center" show-overflow-tooltip></el-table-column>
            <el-table-column label="诊断模块名称" prop="name" min-width="250" header-align="center" show-overflow-tooltip></el-table-column>
            <el-table-column label="操作" align="center" min-width="150" show-overflow-tooltip>
              <template slot-scope="scope">
                <el-tooltip class="item" effect="dark" :open-delay="300" content="编辑" placement="top-start">
                  <el-button type="text" icon="el-icon-edit" @click="update('ZDWH', scope.row.id)"></el-button>
                </el-tooltip>
                <el-tooltip class="item" effect="dark" :open-delay="300" content="删除" placement="top-start">
                  <el-button type="text" icon="el-icon-delete" @click="remove('ZDWH', scope.row.id)"></el-button>
                </el-tooltip>
              </template>
            </el-table-column>
          </kindo-table>
        </kindo-box>
      </el-tab-pane>

      <!-- 诊疗维护 -->
      <el-tab-pane label="诊疗维护" name="诊疗维护">
        <kindo-box title="查询条件">
          <el-form :model="ZLWH.search" label-position="right" inline @keyup.enter.prevent.native="get('ZLWH')">
            <el-form-item label="诊疗模块编码">
              <el-input v-model.trim="ZLWH.search.code" clearable placeholder="请输入诊疗模块编码"></el-input>
            </el-form-item>
            <el-form-item label="诊疗模块名称">
              <el-input v-model.trim="ZLWH.search.name" clearable placeholder="请输入诊疗模块名称"></el-input>
            </el-form-item>
          </el-form>
          <div slot="control">
            <el-button icon="el-icon-search" type="primary" @click="get('ZLWH')">查询</el-button>
          </div>
        </kindo-box>

        <kindo-box title="诊疗模块信息">
          <div slot="control">
            <el-button icon="el-icon-plus" type="text" @click="add('ZLWH','','ZLWHForm')">新增</el-button>
            <el-button icon="el-icon-delete" type="text" @click="remove('ZLWH')">删除</el-button>
          </div>
          <kindo-table ref="ZLWH" :url="ZLWH.url" :queryParam="ZLWH.search" @selection-change="(selection) => tableChange('ZLWH', selection)">
            <el-table-column type="selection" fixed="left" width="30"></el-table-column>
            <el-table-column label="诊疗模块编码" prop="code" min-width="200" header-align="center" show-overflow-tooltip></el-table-column>
            <el-table-column label="诊疗模块名称" prop="name" min-width="250" header-align="center" show-overflow-tooltip></el-table-column>
            <el-table-column label="操作" align="center" min-width="150" show-overflow-tooltip>
              <template slot-scope="scope">
                <el-tooltip class="item" effect="dark" :open-delay="300" content="编辑" placement="top-start">
                  <el-button type="text" icon="el-icon-edit" @click="update('ZLWH', scope.row.id)"></el-button>
                </el-tooltip>
                <el-tooltip class="item" effect="dark" :open-delay="300" content="删除" placement="top-start">
                  <el-button type="text" icon="el-icon-delete" @click="remove('ZLWH', scope.row.id)"></el-button>
                </el-tooltip>
              </template>
            </el-table-column>
          </kindo-table>
        </kindo-box>
      </el-tab-pane>
    </el-tabs>

    <!-- 诊断维护弹框 -->
    <el-dialog v-drag top="0" :visible.sync="ZDWH.dialog.visible" :title="ZDWH.dialog.title +'诊断模块'" :modal-append-to-body="false" :close-on-click-modal="false">
      <el-form :model="ZDWH.form" class="box" ref="ZDWHForm" label-width="120px" :rules="ZDWH.rules" label-position="right">
        <el-form-item label="诊断模块编码" prop="code">
          <el-input v-model.trim="ZDWH.form.code" :disabled="ZDWH.form.id ? true : false" placeholder="请输入诊断模块编码"></el-input>
        </el-form-item>
        <el-form-item label="诊断模块名称" prop="name">
          <el-input v-model.trim="ZDWH.form.name" placeholder="请输入诊断模块名称"></el-input>
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button type="primary" icon="fa fa-floppy-o" @click="save('ZDWH')">保 存</el-button>
        <el-button @click="ZDWH.dialog.visible = false" icon="el-icon-close" type="primary">取 消</el-button>
      </div>
    </el-dialog>

    <!-- 诊疗维护弹框 -->
    <el-dialog v-drag top="0" :visible.sync="ZLWH.dialog.visible" :title="ZLWH.dialog.title +'诊疗模块'" :modal-append-to-body="false" :close-on-click-modal="false">
      <el-form :model="ZLWH.form" class="box" ref="ZLWHForm" label-width="120px" :rules="ZLWH.rules" label-position="right">
        <el-form-item label="诊疗模块编码" prop="code">
          <el-input v-model.trim="ZLWH.form.code" :disabled="ZLWH.form.id ? true : false" placeholder="请输入诊疗模块编码"></el-input>
        </el-form-item>
        <el-form-item label="诊疗模块名称" prop="name">
          <el-input v-model.trim="ZLWH.form.name" placeholder="请输入诊疗模块名称"></el-input>
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button type="primary" icon="fa fa-floppy-o" @click="save('ZLWH')">保 存</el-button>
        <el-button @click="ZLWH.dialog.visible = false" icon="el-icon-close" type="primary">取 消</el-button>
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
      activeName: '诊断维护',
      ZDWH: {
        url: config.api.table1,
        selection: [],
        search: {
          code: '',
          name: ''
        },
        dialog: {
          visible: false,
          title: '新增'
        },
        form: {
          id: '',
          code: '',
          name: ''
        },
        rules: {
          code: [{ required: true, message: '请输入诊断模块编码', trigger: 'blur' }],
          name: [{ required: true, message: '请输入诊断模块名称', trigger: 'blur' }]
        }
      },

      ZLWH: {
        url: config.api.table2,
        selection: [],
        search: {
          code: '',
          name: ''
        },
        dialog: {
          visible: false,
          title: '新增'
        },
        form: {
          id: '',
          code: '',
          name: ''
        },
        rules: {
          code: [{ required: true, message: '请输入诊疗模块编码', trigger: 'blur' }],
          name: [{ required: true, message: '请输入诊疗模块名称', trigger: 'blur' }]
        }
      }
    }
  },
  mounted() {
    this.$nextTick(() => {
      this.get('ZDWH')
      this.get('ZLWH')
    })
  },
  methods: {
    // 查询表格数据
    get(tableName) {
      this.$refs[tableName].reloadData()
    }
  }
}
</script>

<style>
</style>