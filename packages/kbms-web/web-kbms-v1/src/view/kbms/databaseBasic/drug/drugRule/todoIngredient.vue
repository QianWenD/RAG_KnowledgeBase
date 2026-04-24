/* @Author: zhengtian
 * @Desc: 合理用药规则 -> 成份
 */
<template>
  <div :parentRow="parentRow" :isOpen="isOpen">
    <kindo-box :title="table.title + '成份'" icon="xx">
      <kindo-table ref="table" :url="table.url" :queryParam="table.search" @selection-change="(selection) => tableChange('table', selection)" :pageSize="5">
        <el-table-column type="selection" fixed="left" width="30"></el-table-column>
        <el-table-column label="成份" fixed="left" prop="ingredient" min-width="120" header-align="center"></el-table-column>
        <el-table-column label="操作" width="100" align="center" fixed="right">
          <template slot-scope="scope">
            <el-tooltip class="item" effect="dark" :open-delay="300" content="编辑" placement="top-start">
              <el-button type="text" icon="el-icon-edit" @click="update('table', scope.row.id)"></el-button>
            </el-tooltip>
            <el-tooltip class="item" effect="dark" :open-delay="300" content="删除" placement="top-start">
              <el-button type="text" icon="el-icon-delete" @click="remove('table', scope.row.id)"></el-button>
            </el-tooltip>
          </template>
        </el-table-column>
      </kindo-table>
      <div slot="control">
        <el-button icon="el-icon-search" type="text" @click="getTable('table')">查询</el-button>
        <el-button icon="el-icon-plus" type="text" @click="add('table', 'drugCode','tableForm')">新增</el-button>
        <el-button icon="el-icon-delete" type="text" @click="remove('table')">删除</el-button>
      </div>
    </kindo-box>
    <!-- 弹框 -->
    <el-dialog v-drag top="0" :visible.sync="table.dialog.visible" :title="table.dialog.title+'成份'" :modal-append-to-body="false" :close-on-click-modal="false">
      <el-form :model="table.form" onsubmit="return false;" class="box" ref="tableForm" label-width="70px" :rules="table.rules" label-position="right">
        <el-form-item label="成份" prop="ingredient">
          <el-input v-model.trim="table.form.ingredient"></el-input>
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button type="primary" icon="fa fa-floppy-o" @click="save('table')">保 存</el-button>
        <el-button @click="table.dialog.visible = false" icon="el-icon-close" type="primary">取 消</el-button>
      </div>
    </el-dialog>
    <!-- 弹框-->
  </div>
</template>

<script>
import config from './config/index.js'
import tableOpra from '@src/utils/helper/tableOpra.js'
export default {
  mixins: [tableOpra],
  name: 'todo-table',
  props: {
    parentRow: Object,
    isOpen: Boolean
  },
  data() {
    return {
      table: {
        title: '',
        url: config.api.ingredient,
        selection: [],
        dialog: {
          visible: false,
          title: '新增'
        },
        form: {
          id: '',
          drugCode: '',
          ingredient: ''
        },
        rules: {
          ingredient: [{ required: true, message: '请输入成份', trigger: 'blur' }, { min: 0, max: 30, message: '长度不能超过30' }]
        },
        search: {
          drugCode: ''
        }
      }
    }
  },
  methods: {
    init() {
      if (this.parentRow.drugCode) {
        this.table.form.drugCode = this.parentRow.drugCode
        this.table.search.drugCode = this.parentRow.drugCode
        this.table.title = this.parentRow.genericName
        this.getTable('table')
      } else {
        this.$refs.table.clearTable()
      }
    }
  },
  created() { },
  watch: {
    isOpen(val) {
      if (!kindo.validate.isEmpty(this.$refs.table)) {
        this.$refs.table.doLayout('table')
      }
    },
    parentRow(val) {
      this.init()
    }
  },
  mounted() {
    this.$nextTick(() => {
      this.init()
    })
  }
}
</script>