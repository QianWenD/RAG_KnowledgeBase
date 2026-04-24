/* @Author: wuhuihui
 *菜单：知识数据库-诊断模块
<template>
  <div>
    <!-- 父表 start -->
    <kindo-box title="查询条件" icon="xx">
      <el-form :model="parent.search" onsubmit="return false;" label-position="right" inline @keyup.enter.prevent.native="getParent">
        <el-form-item label="诊断模块编码">
          <el-input v-model.trim="parent.search.code" clearable></el-input>
        </el-form-item>
        <el-form-item label="诊断模块名称">
          <el-input v-model.trim="parent.search.name" clearable></el-input>
        </el-form-item>
      </el-form>
      <div slot="control">
        <el-button icon="el-icon-search" type="primary" @click="getParent">查询</el-button>
      </div>
    </kindo-box>
    <kindo-box title="诊断模块信息">
      <kindo-table ref="parent" :url="parent.url" :queryParam="parent.search" :extendOption="extend" @selection-change="(selection) => tableChange('parent', selection)" @current-change="tableClick" :pageSize="5">
        <el-table-column type="selection" :selectable="(r) => r.pushStatus === '0'" fixed="left" width="30"></el-table-column>
        <el-table-column label="诊断模块编码" fixed="left" prop="code" width="150" header-align="center" sortable='custom' show-overflow-tooltip></el-table-column>
        <el-table-column label="诊断模块名称" fixed="left" prop="name" min-width="150" header-align="center" sortable='custom' show-overflow-tooltip></el-table-column>
        <el-table-column label="备注" prop="remark" min-width="200" header-align="center" show-overflow-tooltip></el-table-column>
        <el-table-column label="启用状态" prop="status" width="100" align="center" sortable='custom'>
          <template slot-scope="scope">
            <div class="switchBtn" :class="scope.row.status === '1' ? 'onSwitchBtn' : 'offSwitchBtn'">
              <div class="btn" @click="changeStatus(scope.row)"></div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="推送状态" prop="pushStatus" width="100" align="center" sortable='custom'>
          <template slot-scope="scope">
            <el-tag :type="scope.row.pushStatus === '1'?'success':'info'" close-transition>{{scope.row.pushStatus === '1'?'已推送':'未推送'}}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" align="center" fixed="right">
          <template slot-scope="scope">
            <el-tooltip class="item" effect="dark" :open-delay="300" content="编辑" placement="top-start">
              <el-button type="text" icon="el-icon-edit" @click="update('parent', scope.row.id,'', 'parentForm')"></el-button>
            </el-tooltip>
            <el-tooltip class="item" v-if="scope.row.pushStatus === '0'" effect="dark" :open-delay="300" content="删除" placement="top-start">
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
        <el-button icon="el-icon-d-arrow-right" type="text" @click="push">推送</el-button>
      </div>
    </kindo-box>
    <!-- 父表 end -->

    <!-- 子表 start -->
    <el-tabs v-model="tabsActive" type="card">
      <el-tab-pane label="ICD10" name="first">
        <kindo-box title="查询条件" icon="xx">
          <el-form :model="childIcd10.search" onsubmit="return false;" label-position="right" inline @keyup.enter.prevent.native="getICD10">
            <el-form-item label="ICD10编码">
              <el-input v-model.trim="childIcd10.search.code" clearable></el-input>
            </el-form-item>
            <el-form-item label="ICD10名称">
              <el-input v-model.trim="childIcd10.search.name" clearable></el-input>
            </el-form-item>
          </el-form>
          <div slot="control">
            <el-button icon="el-icon-search" type="primary" :disabled="childIcd10.search.groupingDiagnosisId === ''?true:false" @click="getICD10">查询</el-button>
          </div>
        </kindo-box>
        <kindo-box title="ICD10信息">
          <kindo-table ref="childIcd10" :url="childIcd10.url" :queryParam="childIcd10.search" :extendOption="extend" @selection-change="(selection) => tableChange('childIcd10', selection)" @filter-change="(filters)=>filterChange(filters,'childIcd10', 'search')" :pageSize="5">
            <el-table-column type="selection" fixed="left" width="30"></el-table-column>
            <el-table-column label="ICD10编码" fixed="left" prop="code" width="150" header-align="center" sortable='custom' show-overflow-tooltip></el-table-column>
            <el-table-column label="ICD10名称" fixed="left" prop="name" min-width="150" header-align="center" sortable='custom' show-overflow-tooltip></el-table-column>
            <el-table-column label="备注" prop="remark" min-width="200" header-align="center" show-overflow-tooltip></el-table-column>
            <el-table-column label="审核状态" prop="status" width="100" align="center" columnKey='status' :filters="columnFilters(dict.AUDIT_STATUS)" :filter-method="filterHandler" :filter-multiple="false" filter-placement="bottom-end">
              <template slot-scope="scope">
                <el-tag :type="scope.row.status === '1'?'success':'info'" close-transition>{{kindo.dictionary.getLabel(dict.AUDIT_STATUS,scope.row.status)}}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="100" align="center" fixed="right">
              <template slot-scope="scope">
                <el-tooltip class="item" effect="dark" :open-delay="300" content="编辑" placement="top-start">
                  <el-button type="text" icon="el-icon-edit" @click="editICDD10(scope.row)"></el-button>
                </el-tooltip>
                <el-tooltip class="item" effect="dark" :open-delay="300" content="删除" placement="top-start">
                  <el-button type="text" icon="el-icon-delete" @click="remove('childIcd10', scope.row.id)"></el-button>
                </el-tooltip>
              </template>
            </el-table-column>
          </kindo-table>
          <div slot="control">
            <el-button icon="el-icon-plus" type="text" :disabled="childIcd10.search.groupingDiagnosisId === ''?true:false" @click="add('childIcd10','groupingDiagnosisId', 'childIcd10Form')">批量新增</el-button>
            <el-button icon="el-icon-delete" type="text" :disabled="childIcd10.search.groupingDiagnosisId === ''?true:false" @click="remove('childIcd10')">删除</el-button>
            <el-button icon="el-icon-view" type="text" :disabled="childIcd10.search.groupingDiagnosisId === ''?true:false" @click="audit('childIcd10')">审核</el-button>
          </div>
        </kindo-box>
      </el-tab-pane>
      <el-tab-pane label="CCDT" name="second" v-if="kindo.config.VERSION === 'company'">
        <kindo-box title="查询条件" icon="xx">
          <el-form :model="childCcdt.search" onsubmit="return false;" label-position="right" inline @keyup.enter.prevent.native="getCCDT">
            <el-form-item label="CCDT编码">
              <el-input v-model.trim="childCcdt.search.code" clearable></el-input>
            </el-form-item>
            <el-form-item label="CCDT名称">
              <el-input v-model.trim="childCcdt.search.name" clearable></el-input>
            </el-form-item>
          </el-form>
          <div slot="control">
            <el-button icon="el-icon-search" type="primary" :disabled="childCcdt.search.groupingDiagnosisId === ''?true:false" @click="getCCDT">查询</el-button>
          </div>
        </kindo-box>
        <kindo-box title="CCDT信息">
          <kindo-table ref="childCcdt" :url="childCcdt.url" :queryParam="childCcdt.search" :extendOption="extend" @selection-change="(selection) => tableChange('childCcdt', selection)" @filter-change="(filters)=>filterChange(filters,'childCcdt', 'search')" :pageSize="5">
            <el-table-column type="selection" fixed="left" width="30"></el-table-column>
            <el-table-column label="CCDT编码" fixed="left" prop="code" width="150" header-align="center" sortable='custom' show-overflow-tooltip></el-table-column>
            <el-table-column label="CCDT名称" fixed="left" prop="name" min-width="150" header-align="center" sortable='custom' show-overflow-tooltip></el-table-column>
            <el-table-column label="备注" prop="remark" min-width="200" header-align="center" sortable='custom' show-overflow-tooltip></el-table-column>
            <el-table-column label="审核状态" prop="status" width="100" align="center" columnKey='status' :filters="columnFilters(dict.AUDIT_STATUS)" :filter-method="filterHandler" :filter-multiple="false" filter-placement="bottom-end">
              <template slot-scope="scope">
                <el-tag :type="scope.row.status === '1'?'success':'info'" close-transition>{{kindo.dictionary.getLabel(dict.AUDIT_STATUS,scope.row.status)}}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="100" align="center" fixed="right">
              <template slot-scope="scope">
                <el-tooltip class="item" effect="dark" :open-delay="300" content="编辑" placement="top-start">
                  <el-button type="text" icon="el-icon-edit" @click="editCCDT(scope.row)"></el-button>
                </el-tooltip>
                <el-tooltip class="item" effect="dark" :open-delay="300" content="删除" placement="top-start">
                  <el-button type="text" icon="el-icon-delete" @click="remove('childCcdt', scope.row.id)"></el-button>
                </el-tooltip>
              </template>
            </el-table-column>
          </kindo-table>
          <div slot="control">
            <el-button icon="el-icon-plus" type="text" :disabled="childCcdt.search.groupingDiagnosisId === ''?true:false" @click="add('childCcdt','groupingDiagnosisId', 'childCcdtForm')">新增</el-button>
            <el-button icon="el-icon-delete" type="text" :disabled="childCcdt.search.groupingDiagnosisId === ''?true:false" @click="remove('childCcdt')">删除</el-button>
            <el-button icon="el-icon-view" type="text" :disabled="childCcdt.search.groupingDiagnosisId === ''?true:false" @click="audit('childCcdt')">审核</el-button>
          </div>
        </kindo-box>
      </el-tab-pane>
    </el-tabs>
    <!-- 子表 end -->

    <!-- 主表新增 start -->
    <el-dialog v-drag top="0" :visible.sync="parent.dialog.visible" :title="(parent.form.id?'编辑':'新增') + '诊断模块'" :close-on-click-modal="false">
      <el-form :model="parent.form" onsubmit="return false;" class="box" ref="parentForm" label-width="110px" :rules="parent.rules" label-position="right">
        <el-form-item label="诊断模块编码" prop="code" v-if="parent.form.id">
          <el-input v-model.trim="parent.form.code" disabled clearable></el-input>
        </el-form-item>
        <el-form-item label="诊断模块名称" prop="name">
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
    <!-- 主表新增 end -->
    <!-- 子表新增 start -->
    <el-dialog v-drag top="0" :visible.sync="childIcd10.dialog.visible" :title="(childIcd10.form.id?'编辑':'批量新增') + 'ICD10'">
      <el-form :model="childIcd10.form" onsubmit="return false;" class="box" ref="childIcd10Form" label-width="90px" :rules="childIcd10.rules" label-position="right">
        <el-form-item label="ICD10" prop="codeId">
          <el-select v-if="!childIcd10.form.id" v-model.trim="childIcd10.form.codeId" :disabled="childIcd10.form.id !== ''" size="mini" @blur="(ev)=>{blurSel(ev,childIcd10.form,'codeId','icd10List')}" placeholder="请输入选择" multiple clearable filterable :loading="loading" remote :remote-method="getICD10List">
            <li class="title">
              <span>代码值</span>
              <span>代码标题</span>
            </li>
            <li class="tip">
              <span>
                &lt;请选择&gt;
              </span>
            </li>
            <el-option v-for="item in list.icd10List" :key="item.value" :label="item.label" :value="item.value">
              <span>{{ item.code }}</span>
              <span>{{ item.label }}</span>
            </el-option>
          </el-select>
          <el-input v-else v-model="childIcd10.form.name" disabled></el-input>
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input type="textarea" :rows="3" autosize placeholder="可输入200字" v-model.trim="childIcd10.form.remark"></el-input>
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button type="primary" icon="fa fa-floppy-o" @click="childIcd10.form.id ? save('childIcd10') : allAdd()">保 存</el-button>
        <el-button @click="childIcd10.dialog.visible = false" icon="el-icon-close" type="primary">取 消</el-button>
      </div>
    </el-dialog>

    <el-dialog v-drag top="0" :visible.sync="childCcdt.dialog.visible" :title="(childCcdt.form.id?'编辑':'新增') + 'CCDT'">
      <el-form :model="childCcdt.form" onsubmit="return false;" class="box" ref="childCcdtForm" label-width="80px" :rules="childIcd10.rules" label-position="right">
        <el-form-item label="CCDT" prop="codeId">
          <el-select v-model.trim="childCcdt.form.codeId" :disabled="childCcdt.form.id !== ''" size="mini" @blur="(ev)=>{blurSel(ev,childCcdt.form,'codeId','ccdtList')}" placeholder="请输入选择" clearable filterable :loading="loading" remote :remote-method="getCCDTList">
            <li class="title">
              <span>代码值</span>
              <span>代码标题</span>
            </li>
            <li class="tip">
              <span>
                &lt;请选择&gt;
              </span>
            </li>
            <el-option v-for="item in list.ccdtList" :key="item.value" :label="item.label" :value="item.value">
              <span>{{ item.code }}</span>
              <span>{{ item.label }}</span>
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input type="textarea" :rows="2" placeholder="可输入200字" v-model.trim="childCcdt.form.remark"></el-input>
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button type="primary" icon="fa fa-floppy-o" @click="save('childCcdt')">保 存</el-button>
        <el-button @click="childCcdt.dialog.visible = false" icon="el-icon-close" type="primary">取 消</el-button>
      </div>
    </el-dialog>
    <!-- 子表新增 end -->
  </div>
</template>

<script>
import config from './config/index.js'
import tableOpra from '@src/utils/helper/tableOpra.js'
export default {
  name: 'diagonsticModule',
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
      },
      tabsActive: 'first',

      childIcd10: {
        url: config.api.child,
        selection: [],
        dialog: {
          visible: false
        },
        form: {
          id: '',
          groupingDiagnosisId: '',
          codeId: '',
          remark: '',
          codeType: '1'
        },
        rules: {
          codeId: [{ required: true, message: '请选择', trigger: 'blur' }],
          remark: [{ min: 0, max: 200, message: '长度不能超过200', trigger: 'blur' }]
        },
        search: {
          groupingDiagnosisId: '',
          name: '',
          code: '',
          codeType: '1'
        }
      },
      list: {
        icd10List: [],
        ccdtList: []
      },

      childCcdt: {
        url: config.api.child,
        selection: [],
        dialog: {
          visible: false
        },
        form: {
          id: '',
          groupingDiagnosisId: '',
          codeId: '',
          remark: '',
          codeType: '2'
        },
        search: {
          groupingDiagnosisId: '',
          name: '',
          code: '',
          codeType: '2'
        }
      }
    }
  },
  methods: {
    // 状态筛选
    filterChange(filters, table, search) {
      for (let k in filters) {
        if (filters.hasOwnProperty(k)) {
          this[table].search[k] = filters[k].toString()
        }
      }
      this.getTable(table)
    },
    // 获取父表信息
    getParent() {
      this.$refs.parent.reloadData().then(res => {
        if (res.data.total > 0) {
          this.$refs.parent.setCurrentRowIndex(0)
        } else {
          this.$refs.childIcd10.clearTable()
          this.childIcd10.form.groupingDiagnosisId = ''
          this.childIcd10.search.groupingDiagnosisId = ''
          if (kindo.config.VERSION === 'company') {
            this.$refs.childCcdt.clearTable()
            this.childCcdt.form.groupingDiagnosisId = ''
            this.childCcdt.search.groupingDiagnosisId = ''
          }
        }
      })
    },
    // 获取字表信息
    getICD10() {
      if (this.childIcd10.form.groupingDiagnosisId) {
        this.getTable('childIcd10')
      }
    },

    getCCDT() {
      if (this.childCcdt.form.groupingDiagnosisId) {
        this.getTable('childCcdt')
      }
    },

    tableClick(row) {
      if (row) {
        this.childIcd10.form.groupingDiagnosisId = row.id
        this.childIcd10.search.groupingDiagnosisId = row.id
        this.getICD10()
        if (kindo.config.VERSION === 'company') {
          this.childCcdt.form.groupingDiagnosisId = row.id
          this.childCcdt.search.groupingDiagnosisId = row.id
          this.getCCDT()
        }
      }
    },
    // icd10远程查询
    getICD10List(searchVal) {
      let param = { rows: 200, diseaseName: searchVal }
      this.$http.get(config.api.id10Query, { params: param }).then(res => {
        this.list.icd10List =
          res.data.rows.map(item => {
            return { label: item.diseaseName, value: item.id, code: item.diseaseCode }
          }) || []
      })
    },
    // ccdt远程查询
    getCCDTList(searchVal) {
      let param = { rows: 200, name: searchVal }
      this.$http.get(config.api.ccdtQuery, { params: param }).then(res => {
        this.list.ccdtList =
          res.data.rows.map(item => {
            return { label: item.name, value: item.id, code: item.code }
          }) || []
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

    // 批量新增
    allAdd() {
      let params = []
      for (let i = 0; i < this.childIcd10.form.codeId.length; i++) {
        params.push(Object.assign({}, this.childIcd10.form, { codeId: this.childIcd10.form.codeId[i] }))
      }
      this.$http.post(config.api.batchAdd, params).then(res => {
        if (res.code === 200) {
          this.childIcd10.dialog.visible = false
          kindo.util.alert(res.message, '提示', 'success')
          this.getTable('childIcd10')
        }
      })
    },

    // 模板下载
    templateDownload() {
      window.open(kindo.util.exportUrl(config.api.downloadTemplate, this.parent.search))
    },

    // 推送
    push() {
      if (this.parent.selection.length > 0) {
        kindo.util.confirm('请确定是否推送 ', undefined, undefined, () => {
          let ids = this.parent.selection.map(item => { return { id: item.id } })
          this.$http.put(config.api.push, ids).then(res => {
            kindo.util.alert(res.message, '提示', 'success')
            this.getTable('parent')
          })
        })
      } else {
        kindo.util.alert('请至少勾选一条数据', '提示', 'warning')
      }
    },

    // 编辑ICD10
    editICDD10(row) {
      console.log(row)
      kindo.util.promise(() => {
        this.childIcd10.dialog.visible = true
      }).then(() => {
        this.$refs.childIcd10Form.resetFields()
      }).then(() => {
        this.childIcd10.form.id = row.id
        this.childIcd10.form.codeId = row.codeId
        this.childIcd10.form.remark = row.remark
        this.childIcd10.form.name = row.name
        this.list.icd10List.push({ label: row.name, value: row.codeId, code: row.code })
      })
    },

    // 编辑ICD10
    editCCDT(row) {
      kindo.util.promise(() => {
        this.childCcdt.dialog.visible = true
      }).then(() => {
        this.$refs.childCcdtForm.resetFields()
      }).then(() => {
        this.childCcdt.form.id = row.id
        this.childCcdt.form.codeId = row.codeId
        this.childCcdt.form.remark = row.remark
        this.list.ccdtList.push({ label: row.name, value: row.codeId, code: row.code })
      })
    },

    // 启用禁用
    changeStatus(row) {
      let status = row.status === '0' ? '1' : '0'
      this.$http.put(config.api.parent, { id: row.id, status: status }).then(res => {
        if (res.code === 200) {
          row.status = status
        }
      })
    }
  },
  created() {
    this.getDictionary()
  },
  mounted() {
    this.$nextTick(() => {
      this.getParent()
    })
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