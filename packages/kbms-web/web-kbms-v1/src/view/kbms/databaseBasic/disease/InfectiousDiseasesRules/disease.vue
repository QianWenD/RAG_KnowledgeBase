/*  @Author: litianye
 * @Date: 2018-05-11
 * @Desc: 传染病筛查规则-疾病
 */
<template>
  <div :parentRow="parentRow" :isOpen="isOpen">
    <kindo-box title="查询条件" icon="xx">
      <el-form :model="search" label-position="right" onsubmit="return false;" inline @keyup.enter.prevent.native="get('table')">
        <el-form-item label="疾病分类名称">
          <el-input v-model.trim="search.name" clearable></el-input>
        </el-form-item>
      </el-form>
      <div slot="control">
        <el-button icon="el-icon-search" type="primary" @click="get('table')">查询</el-button>
      </div>
    </kindo-box>
    <kindo-box title="疾病信息">
      <kindo-table ref="table" :url="url" :queryParam="search" :pageSize="10" @selection-change="(selection) => selectionChange(selection, 'selection')" @filter-change="(filters)=>filterChange(filters,'table', 'search')">
        <el-table-column type="selection" fixed="left" width="30"></el-table-column>
        <el-table-column label="疾病分类名称" prop="name" width="140" header-align="center" sortable='custom' show-overflow-tooltip></el-table-column>
        <el-table-column label="疾病名称" min-width="140" header-align="center" show-overflow-tooltip>
          <template slot-scope="scope">
            <p style="cursor: pointer;" @click="accurateTable(scope.row)">
              <el-tag type="'primary'" close-transition v-for="item in scope.row.kbmsDrugIndicationDetailList" :key="item.id" v-text="item.name"></el-tag>
            </p>
          </template>
        </el-table-column>
        <el-table-column label="审核状态" prop="status" width="100" align="center" header-align="center" columnKey='status' :filters="filtersDict.AUDIT_STATUS" :filter-method="filterHandler" :filter-multiple="false" filter-placement="bottom-end" show-overflow-tooltip>
          <template slot-scope="scope">
            <el-tag v-if="scope.row.status" :type="scope.row.status === '1'?'success':'info'" close-transition>{{kindo.dictionary.getLabel(dict.AUDIT_STATUS,scope.row.status)}}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" align="center" fixed="right">
          <template slot-scope="scope">
            <el-tooltip class="item" effect="dark" :open-delay="300" content="删除" placement="top-start">
              <el-button type="text" icon="el-icon-delete" @click="deleteOne(scope.row.id, 'table')"></el-button>
            </el-tooltip>
          </template>
        </el-table-column>
      </kindo-table>
      <div slot="control">
        <el-button icon="el-icon-plus" type="text" @click="insert">新增</el-button>
        <el-button icon="el-icon-delete" type="text" @click="batch('selection', 'table', 'delete')">删除</el-button>
        <el-button icon="el-icon-view" type="text" @click="batch('selection', 'table', 'audit')">审核</el-button>
      </div>
    </kindo-box>
    <!-- 新增弹窗 -->
    <el-dialog v-drag top="0" :visible.sync="diseasevisible" title="新增疾病分类" :modal-append-to-body="false" :close-on-click-modal="false" width="60%">
      <el-form v-model.trim="indicationAll.search" onsubmit="return false;" label-position="right" label-width="110px" inline @keyup.enter.prevent.native="get('indicationAll')">
        <el-form-item label="疾病分类名称">
          <el-input v-model.trim="indicationAll.search.name" placeholder="" clearable></el-input>
        </el-form-item>
        <el-button icon="el-icon-search" type="primary" @click="get('indicationAll')">查询</el-button>
      </el-form>
      <kindo-box title="疾病信息">
        <kindo-table ref="indicationAll" :url="indicationAll.url" :queryParam="indicationAll.search" @selection-change="(selection) => selectionChange(selection,'DiseaseindicationAll')" :pageSize="5">
          <el-table-column type="selection" fixed="left" width="30"></el-table-column>
          <el-table-column label="适应症名称" prop="name" width="140" header-align="center" show-overflow-tooltip></el-table-column>
          <el-table-column label="疾病名称" min-width="160" header-align="center" show-overflow-tooltip>
            <template slot-scope="scope">
              <el-tag type="'primary'" close-transition v-for="item in scope.row.kbmsDrugIndicationDetailList" :key="item.id" v-text="item.name"></el-tag>
            </template>
          </el-table-column>
        </kindo-table>
      </kindo-box>
      <div slot="footer" class="dialog-footer">
        <el-button type="primary" icon="fa fa-floppy-o" @click="saveindicationAll">保 存</el-button>
        <el-button @click="diseasevisible = false" icon="el-icon-close" type="primary">取 消</el-button>
      </div>
    </el-dialog>
    <!-- 点击疾病名称弹窗 -->
    <el-dialog v-drag top="0" :visible.sync="accurate.dialog.visible" :title="accurate.dialog.title" :modal-append-to-body="false" :close-on-click-modal="false" width="60%">
      <kindo-box title="查询条件" icon="xx">
        <el-form v-model.trim="accurate.search" onsubmit="return false;" label-position="right" inline @keyup.enter.prevent.native="get('accurate')">
          <el-form-item label="疾病编码">
            <el-input v-model.trim="accurate.search.code" placeholder="" clearable></el-input>
          </el-form-item>
          <el-form-item label="疾病名称">
            <el-input v-model.trim="accurate.search.name" placeholder="" clearable></el-input>
          </el-form-item>
        </el-form>
        <div slot="control">
          <el-button icon="el-icon-search" type="primary" @click="get('accurate')">查询</el-button>
        </div>
      </kindo-box>
      <kindo-box title="疾病名称信息">
        <kindo-table ref="accurate" :url="accurate.url" :queryParam="accurate.search">
          <el-table-column label="疾病名称" fixed="left" prop="name" min-width="120" header-align="center"></el-table-column>
          <el-table-column label="疾病编码" prop="code" min-width="120" header-align="center"></el-table-column>
        </kindo-table>
      </kindo-box>
      <div slot="footer" class="dialog-footer">
        <el-button @click="accurate.dialog.visible = false" icon="el-icon-close" type="primary">关 闭</el-button>
      </div>
    </el-dialog>
    <!-- END点击疾病名称弹窗 -->
  </div>
</template>

<script>
import config from './config/index.js'
import mixin from '@src/utils/helper/tableMixIn.js'
export default {
  mixins: [mixin],
  name: 'todo-disease',
  props: {
    parentRow: Object,
    isOpen: Boolean
  },
  data() {
    return {
      dict: { AUDIT_STATUS: [] },
      filtersDict: {
        // 表内筛选审核状态数组
        AUDIT_STATUS: []
      },
      url: config.api.disease,
      selection: [],
      search: {
        name: '',
        status: '',
        itemCode: ''
      },

      form: {
        id: '',
        itemCode: '',
        diseaseScreeningId: ''
      },
      diseasevisible: false,

      indicationAll: {
        url: config.api.listForDrugPage,
        search: {
          name: '',
          itemCode: ''
        }
      },
      DiseaseindicationAll: [],

      // 点击疾病名称弹窗
      accurate: {
        url: config.api.childAccurate,
        selection: [],
        dialog: {
          visible: false,
          title: '新增'
        },
        search: {
          kbmsDrugIndicationId: '',
          matchingMode: '',
          name: '',
          code: ''
        }
      }
    }
  },

  created() {
    this._form = Object.assign({}, this.form)
    // 审核状态数据字典获取
    this.getDict(this.dict, this.filtersDict)
  },

  mounted() {
    this.$nextTick(() => {
      this.get('table')
    })
  },

  methods: {
    init() {
      if (this.parentRow.id) {
        this.form.diseaseScreeningId = this.parentRow.id
        this.form.itemCode = this.parentRow.itemCode
        this.search.itemCode = this.parentRow.itemCode
        this.indicationAll.search.itemCode = this.parentRow.itemCode
        this.get('table')
      } else {
        this.$refs.table.clearTable()
      }
    },
    insert() {
      kindo.util
        .promise(() => {
          this.diseasevisible = true
        })
        .then(() => {
          this.get('indicationAll')
        })
    },
    deleteOne(id, table, url) {
      let mainUrl = config.api.child
      kindo.util.confirm('请确定删除', undefined, undefined, () => {
        if (!kindo.validate.isEmpty(url)) {
          mainUrl = url
        }
        this.$http
          .delete(mainUrl, {
            data: {
              ids: [id],
              itemCode: this.form.itemCode
            }
          })
          .then(res => {
            kindo.util.alert(res.message, '提示', 'success')
            this.get(table)
          })
      })
    },
    // 批量删除/审核
    batch(selection, table, proType, url) {
      let prompt = ''
      let requestType = 'put'
      let urlType = ''
      let ids = this[selection].map(item => {
        return item.id
      })
      let mainUrl = config.api.child
      let params = {
        ids: ids
      }
      switch (proType) {
        case 'delete':
          prompt = '请确定是否批量删除 '
          requestType = 'delete'
          params = {
            data: Object.assign({}, { ids: ids }, { itemCode: this.form.itemCode })
          }
          break
        case 'audit':
          prompt = '请确定是否通过审核 '
          urlType = 'batchAuditByCode'
          params = ids.map(item => {
            return item
          })
          params = Object.assign({}, { ids: params }, { itemCode: this.form.itemCode })
          break
        default:
          return
      }
      if (this[selection].length > 0) {
        kindo.util.confirm(prompt, undefined, undefined, () => {
          if (!kindo.validate.isEmpty(url)) {
            mainUrl = url
          }
          this.$http[requestType](mainUrl + urlType, params).then(res => {
            kindo.util.alert(res.message, '提示', 'success')
            this.get(table)
          })
        })
      } else {
        kindo.util.alert('请至少勾选一条数据', '提示', 'warning')
      }
    },
    get(table) {
      this.$refs[table].reloadData()
    },
    accurateTable(row) {
      this.accurate.search.kbmsDrugIndicationId = row.id
      this.accurate.search.matchingMode = row.matchingMode
      this.accurate.dialog.title = row.name
      kindo.util
        .promise(() => {
          this.accurate.dialog.visible = true
        })
        .then(() => {
          this.get('accurate')
        })
    },
    // 疾病新增保存
    saveindicationAll() {
      let params = []
      let data = this.DiseaseindicationAll
      let url = config.api.child
      if (data.length < 1) {
        kindo.util.alert('请选择一项进行操作。', '提示', 'warning')
      } else if (data.length > 1) {
        kindo.util.alert('只能选择一项进行操作。', '提示', 'warning')
      } else {
        for (let item of data) {
          params = {
            itemCode: this.form.itemCode,
            kbmsDrugIndicationId: item.id
          }
        }
        this.$http.post(url, params).then(res => {
          kindo.util.alert(res.message, '提示', 'success')
          this.diseasevisible = false
          this.get('table')
        })
      }
    },
    // 导入
    importData() { },
    // 导出
    exportData() { }
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
  }
}
</script>
