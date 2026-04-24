/* @Author: wuhuihui
 *菜单：知识数据库-诊疗模块
<template>
  <div>
    <kindo-box title="查询条件" icon="xx">
      <el-form :model="parent.search" onsubmit="return false;" label-position="right" inline @keyup.enter.prevent.native="getParent">
        <el-form-item label="诊疗模块编码">
          <el-input v-model.trim="parent.search.code" clearable></el-input>
        </el-form-item>
        <el-form-item label="诊疗模块名称">
          <el-input v-model.trim="parent.search.name" clearable></el-input>
        </el-form-item>
      </el-form>
      <div slot="control">
        <el-button icon="el-icon-search" type="primary" @click="getParent">查询</el-button>
      </div>
    </kindo-box>
    <kindo-box title="诊疗模块信息">
      <kindo-table ref="parent" :url="parent.url" :queryParam="parent.search" :extendOption="extend" @selection-change="(selection) => tableChange('parent', selection)" @current-change="tableClick" :pageSize="5">
        <el-table-column type="selection" fixed="left" width="30"></el-table-column>
        <el-table-column label="诊疗模块编码" fixed="left" prop="code" width="150" header-align="center" sortable='custom' show-overflow-tooltip></el-table-column>
        <el-table-column label="诊疗模块名称" fixed="left" prop="name" min-width="150" header-align="center" sortable='custom' show-overflow-tooltip></el-table-column>
        <el-table-column label="备注" prop="remark" min-width="200" header-align="center" show-overflow-tooltip></el-table-column>
        <el-table-column label="启用状态" prop="status" width="100" align="center" sortable='custom'>
          <template slot-scope="scope">
            <div class="switchBtn" :class="scope.row.status === '1' ? 'onSwitchBtn' : 'offSwitchBtn'">
              <div class="btn" @click="changeStatus(scope.row)"></div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" align="center" fixed="right">
          <template slot-scope="scope">
            <el-tooltip class="item" effect="dark" :open-delay="300" content="编辑" placement="top-start">
              <el-button type="text" icon="el-icon-edit" @click="update('parent', scope.row.id,'', 'parentForm')"></el-button>
            </el-tooltip>
            <el-tooltip class="item" effect="dark" :open-delay="300" content="删除" placement="top-start">
              <el-button type="text" icon="el-icon-delete" @click="remove('parent', scope.row.id)"></el-button>
            </el-tooltip>
          </template>
        </el-table-column>
      </kindo-table>
      <div slot="control">
        <el-button icon="el-icon-download" type="text" @click="templateDownload">模板下载</el-button>
        <input type="file" accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" ref="importFile" v-show="false" @change="importFile" />
        <el-button icon="el-icon-upload2" type="text" @click="clickImport">导入</el-button>
        <el-button icon="el-icon-s-promotion" type="text" @click="exportFile">导出</el-button>
        <el-button icon="el-icon-plus" type="text" @click="add('parent','', 'parentForm')">新增</el-button>
        <el-button icon="el-icon-delete" type="text" @click="remove('parent')">删除</el-button>
      </div>
    </kindo-box>

    <zl-detail-module :groupingTreatId="zlId"></zl-detail-module>

    <el-dialog v-drag top="0" :visible.sync="parent.dialog.visible" :title="(parent.form.id?'编辑':'新增') + '诊疗模块'" :close-on-click-modal="false">
      <el-form :model="parent.form" onsubmit="return false;" class="box" ref="parentForm" label-width="110px" :rules="parent.rules" label-position="right">
        <el-form-item label="诊疗模块编码" prop="code" v-show="parent.form.id">
          <el-input v-model.trim="parent.form.code" disabled clearable></el-input>
        </el-form-item>
        <el-form-item label="诊疗模块名称" prop="name">
          <el-input v-model.trim="parent.form.name"></el-input>
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input type="textarea" autosize placeholder="可输入200字" v-model.trim="parent.form.remark"></el-input>
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button type="primary" icon="fa fa-floppy-o" @click="save('parent')">保 存</el-button>
        <el-button @click="parent.dialog.visible = false" icon="el-icon-close" type="primary">取 消</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import config from './config/index.js'
import tableOpra from '@src/utils/helper/tableOpra.js'
import zlDetailModule from '../treatmentModuleDetail/index.vue'
export default {
  name: 'treatmentModule',
  mixins: [tableOpra],
  components: {
    zlDetailModule
  },
  data() {
    return {
      // 主表默认选第一行数据
      extend: { selectedFirst: true },
      zlId: '',

      parent: {
        url: config.api.parent,
        selection: [],
        dialog: {
          visible: false
        },
        form: {
          id: '',
          code: '',
          name: '',
          remark: ''
        },
        rules: {
          name: [{ required: true, message: '请输入名称', trigger: 'blur' }, { min: 0, max: 30, message: '长度不能超过30' }],
          remark: [{ min: 0, max: 200, message: '长度不能超过200', trigger: 'blur' }]
        },
        search: {
          code: '',
          name: ''
        }
      }
    }
  },
  created() {
  },
  mounted() {
    this.$nextTick(() => {
      this.getParent()
    })
  },
  methods: {
    // 获取父表信息
    getParent() {
      this.$refs.parent.reloadData().then(res => {
        if (res.data.total > 0) {
          this.$refs.parent.setCurrentRowIndex(0)
        } else {
          this.zlId = ''
        }
      })
    },

    tableClick(row) {
      if (row) {
        this.zlId = row.id
      }
    },

    // 启用禁用
    changeStatus(row) {
      let status = row.status === '0' ? '1' : '0'
      this.$http.put(config.api.parent, { id: row.id, status: status }).then(res => {
        if (res.code === 200) {
          row.status = status
        }
      })
    },

    // 导出
    exportFile() {
      window.open(kindo.util.exportUrl(config.api.export, this.parent.search))
    },

    // 点击导入
    clickImport() {
      this.$refs.importFile.click()
    },

    // 导入文件
    importFile(e) {
      let file = e.target.files[0]
      if (file.size > 5242880) {
        kindo.util.alert('文件必须小于5M', '提示', 'warning')
        return
      }
      var formData = new FormData()
      formData.append('file', file)
      this.$http.post(config.api.importExcel, formData).then(res => {
        if (res.code === 200) {
          kindo.util.alert(res.message, '提示', 'success')
          this.getTable('parent')
        }
      })
    },

    // 模板下载
    templateDownload() {
      window.open(kindo.util.exportUrl(config.api.downloadTemplate, this.parent.search))
    }
  }
}
</script>

<style lang="scss" scoped>
.switchBtn {
  width: 45px;
  height: 20px;
  border-radius: 30px;
  overflow: hidden;
  .btn {
    height: 18px;
    width: 18px;
    background: #ffffff;
    border-radius: 50%;
    margin-top: 1px;
    cursor: pointer;
    transition: 0.3s;
  }
}
.onSwitchBtn {
  background: green;
  .btn {
    transform: translateX(25px);
  }
}
.offSwitchBtn {
  background: #c0ccda;
  .btn {
    transform: translateX(1px);
  }
}
</style>