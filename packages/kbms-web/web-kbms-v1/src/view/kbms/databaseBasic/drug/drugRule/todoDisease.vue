/* @Author: zhengtian
 * @Date: 2018-04-12
 * @Desc: 合理用药规则 -> 疾病禁忌
 */
<template>
  <div :parentRow="parentRow" :isOpen="isOpen">
    <kindo-box :title="table.title + '疾病禁忌'">
      <kindo-table ref="table" :url="table.url" :queryParam="table.search" @filter-change="(filters)=>filterChange(filters)" @selection-change="(selection) => tableChange('table', selection)" :pageSize="5">
        <el-table-column type="selection" fixed="left" width="30"></el-table-column>
        <el-table-column label="疾病禁忌" fixed="left" prop="diseaseName" min-width="120" header-align="center"></el-table-column>
        <el-table-column label="审核状态" prop="status" width="100" align="center" columnKey='status' :filters="columnFilters(dict.AUDIT_STATUS)" :filter-method="filterHandler" :filter-multiple="false" filter-placement="bottom-end">
          <template slot-scope="scope">
            <el-tag :type="scope.row.status === '1'?'success':'info'" close-transition>{{kindo.dictionary.getLabel(dict.AUDIT_STATUS,scope.row.status)}}</el-tag>
          </template>
        </el-table-column>
      </kindo-table>
      <div slot="control">
        <el-button icon="el-icon-search" type="text" @click="getTable('table')">查询</el-button>
        <el-button icon="el-icon-plus" type="text" @click="addIcd10">新增</el-button>
        <el-button icon="el-icon-delete" type="text" @click="remove('table')">删除</el-button>
        <el-button icon="el-icon-view" type="text" @click="audit('table')">审核</el-button>
      </div>
    </kindo-box>
    <!-- 弹框 -->
    <el-dialog v-drag top="0" :visible.sync="table.dialog.visible" :title="table.dialog.title+'疾病禁忌'" :modal-append-to-body="false" :close-on-click-modal="false" width="60%">
      <el-form v-model.trim="icd10.search" onsubmit="return false;" label-position="right" label-width="80px" inline @keyup.enter.prevent.native="getTable('icd10')">
        <el-form-item label="疾病编码">
          <el-input v-model.trim="icd10.search.diseaseCode" placeholder="" clearable></el-input>
        </el-form-item>
        <el-form-item label="疾病名称">
          <el-input v-model.trim="icd10.search.diseaseName" placeholder="" clearable></el-input>
        </el-form-item>
        <el-button icon="el-icon-search" type="primary" @click="getTable('icd10')">查询</el-button>
      </el-form>
      <kindo-table ref="icd10" :url="icd10.url" :default-sort="{prop:'diseaseCode'}" :queryParam="icd10.search" @selection-change="(selection) => tableChange('icd10', selection)" :pageSize="5">
        <el-table-column type="selection" fixed="left" width="30"></el-table-column>
        <el-table-column label="疾病编码" fixed="left" prop="diseaseCode" min-width="120" header-align="center" show-overflow-tooltip></el-table-column>
        <el-table-column label="疾病名称" prop="diseaseName" min-width="120" header-align="center" show-overflow-tooltip></el-table-column>
      </kindo-table>
      <div slot="footer" class="dialog-footer">
        <el-button type="primary" icon="fa fa-floppy-o" @click="saveIcd10">保 存</el-button>
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
      dict: {
        // 审核状态
        AUDIT_STATUS: []
      },
      table: {
        title: '',
        url: config.api.disease,
        selection: [],
        dialog: {
          visible: false,
          title: '新增'
        },
        search: {
          drugCode: ''
        }
      },
      icd10: {
        url: config.api.icd10,
        selection: [],
        search: {
          diseaseName: '',
          diseaseCode: '',
          drugCode: ''
        }
      }
    }
  },
  methods: {
    init() {
      if (this.parentRow.drugCode) {
        this.table.search.drugCode = this.parentRow.drugCode
        this.table.title = this.parentRow.genericName
        this.icd10.search.drugCode = this.parentRow.drugCode
        this.getTable('table')
      } else {
        this.$refs.table.clearTable()
      }
    },
    addIcd10() {
      kindo.util
        .promise(() => {
          this.table.dialog.visible = true
          this.icd10.search.diseaseName = ''
          this.icd10.search.diseaseCode = ''
        })
        .then(() => {
          this.$refs['icd10'].reloadData()
        })
    },
    filterChange(filters) {
      for (let k in filters) {
        if (filters.hasOwnProperty(k)) {
          this.table.search[k] = filters[k].toString()
        }
      }
      this.getTable('table')
    },
    saveIcd10() {
      let params = []
      let data = this['icd10'].selection
      if (data.length < 1) {
        kindo.util.alert('请选择一项进行操作。', '提示', 'waring')
      } else {
        for (let item of data) {
          params.push({
            drugCode: this.parentRow.drugCode,
            diseaseCode: item.diseaseCode
          })
        }
        this.$http.post(this['table'].url + '/batchAdd', params).then(res => {
          kindo.util.alert(res.message, '提示', 'success')
          this['table'].dialog.visible = false
          this.getTable('table')
        })
      }
    }
  },
  created() {
    this.getDictionary()
  },
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