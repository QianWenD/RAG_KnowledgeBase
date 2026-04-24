/* @Author: zhengtian
 * @Desc: 合理用药规则 -> 适应症
 */
<template>
  <div :parentRow="parentRow" :isOpen="isOpen">
    <kindo-box title="查询条件">
      <el-form v-model.trim="indication.search" onsubmit="return false;" label-position="right" inline @keyup.enter.prevent.native="getTable('indication')">
        <el-form-item label="适应症名称">
          <el-input v-model.trim="indication.search.name" placeholder="" clearable></el-input>
        </el-form-item>
      </el-form>
      <div slot="control">
        <el-button icon="el-icon-search" type="primary" @click="getTable('indication')">查询</el-button>
      </div>
    </kindo-box>
    <kindo-box :title="indication.title + '适应症'" icon="xx">
      <kindo-table ref="indication" :url="indication.url" :queryParam="indication.search" @selection-change="(selection) => tableChange('indication', selection)" :pageSize="5">
        <el-table-column type="selection" fixed="left" width="30"></el-table-column>
        <el-table-column label="适应症名称" fixed="left" prop="name" min-width="120" header-align="center" show-overflow-tooltip></el-table-column>
        <el-table-column label="疾病名称" min-width="120" header-align="center" show-overflow-tooltip>
          <template slot-scope="scope">
            <p style="cursor: pointer;" @click="accurateTable(scope.row)">
              <el-tag type="'primary'" close-transition v-for="item in scope.row.kbmsDrugIndicationDetailList" :key="item.id" v-text="item.name"></el-tag>
            </p>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" align="center" fixed="right">
          <template slot-scope="scope">
            <el-tooltip class="item" effect="dark" :open-delay="300" content="删除" placement="top-start">
              <el-button type="text" icon="el-icon-delete" @click="remove('indication', scope.row.id)"></el-button>
            </el-tooltip>
          </template>
        </el-table-column>
      </kindo-table>
      <div slot="control">
        <el-button icon="el-icon-plus" type="text" @click="indicationAllAdd">新增</el-button>
        <el-button icon="el-icon-delete" type="text" @click="remove('indication')">删除</el-button>
      </div>
    </kindo-box>
    <!-- 子表新增适应症-->
    <el-dialog v-drag top="0" :visible.sync="indication.dialog.visible" :title="indication.dialog.title+'适应症'" :modal-append-to-body="false" :close-on-click-modal="false" width="60%">
      <el-form v-model.trim="indicationAll.search" onsubmit="return false;" label-position="right" label-width="110px" inline @keyup.enter.prevent.native="getTable('indicationAll')">
        <el-form-item label="疾病名称/编码">
          <el-input v-model.trim="indicationAll.search.name" placeholder="" clearable></el-input>
        </el-form-item>
        <el-button icon="el-icon-search" type="primary" @click="getTable('indicationAll')">查询</el-button>
      </el-form>
      <kindo-table ref="indicationAll" :url="indicationAll.url" :queryParam="indicationAll.search" @selection-change="(selection) => tableChange('indicationAll', selection)" :pageSize="5">
        <el-table-column type="selection" fixed="left" width="30"></el-table-column>
        <el-table-column label="适应症名称" fixed="left" prop="name" width="140" header-align="center" show-overflow-tooltip></el-table-column>
        <el-table-column label="疾病名称" min-width="160" header-align="center" show-overflow-tooltip>
          <template slot-scope="scope">
            <el-tag type="'primary'" close-transition v-for="item in scope.row.kbmsDrugIndicationDetailList" :key="item.id" v-text="item.name"></el-tag>
          </template>
        </el-table-column>
      </kindo-table>
      <div slot="footer" class="dialog-footer">
        <el-button type="primary" icon="fa fa-floppy-o" @click="saveindicationAll">保 存</el-button>
        <el-button @click="indication.dialog.visible = false" icon="el-icon-close" type="primary">取 消</el-button>
      </div>
    </el-dialog>
    <!-- 子表新增适应症-->
    <!-- 子表疾病信息弹框 -->
    <el-dialog v-drag top="0" :visible.sync="accurate.dialog.visible" :title="accurate.dialog.title" :modal-append-to-body="false" :close-on-click-modal="false" width="60%">
      <kindo-box title="查询条件" icon="xx">
        <el-form v-model.trim="accurate.search" onsubmit="return false;" label-position="right" inline @keyup.enter.prevent.native="getTable('accurate')">
          <el-form-item label="疾病编码">
            <el-input v-model.trim="accurate.search.code" placeholder="" clearable></el-input>
          </el-form-item>
          <el-form-item label="疾病名称">
            <el-input v-model.trim="accurate.search.name" placeholder="" clearable></el-input>
          </el-form-item>
        </el-form>
        <div slot="control">
          <el-button icon="el-icon-search" type="primary" @click="getTable('accurate')">查询</el-button>
        </div>
      </kindo-box>
      <kindo-box title="表格信息">
        <kindo-table ref="accurate" :url="accurate.url" :queryParam="accurate.search" :pageSize="5">
          <el-table-column label="疾病名称" fixed="left" prop="name" min-width="120" header-align="center"></el-table-column>
          <el-table-column label="疾病编码" prop="code" min-width="120" header-align="center"></el-table-column>
        </kindo-table>
      </kindo-box>
      <div slot="footer" class="dialog-footer">
        <el-button @click="accurate.dialog.visible = false" icon="el-icon-close" type="primary">关 闭</el-button>
      </div>
    </el-dialog>
    <!-- 子表疾病信息弹框 -->
  </div>
</template>

<script>
import config from './config/index.js'
import tableOpra from '@src/utils/helper/tableOpra.js'
export default {
  mixins: [tableOpra],
  name: 'todo-indication',
  props: {
    parentRow: Object,
    isOpen: Boolean
  },
  data() {
    return {
      indication: {
        title: '',
        url: config.api.childList,
        selection: [],
        dialog: {
          visible: false,
          title: '新增'
        },
        form: {
          id: '',
          drugCode: '',
          actualFormName: ''
        },
        rules: {
          actualFormName: [{ required: true, message: '请输入名称', trigger: 'blur' }]
        },
        search: {
          drugCode: '',
          name: '',
          dosageName: ''
        }
      },
      indicationAll: {
        url: config.api.listForDrugPage,
        selection: [],
        search: {
          name: '',
          drugCode: ''
        }
      },
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
  methods: {
    init() {
      if (this.parentRow.drugCode) {
        this.indication.form.drugCode = this.parentRow.drugCode
        this.indication.search.drugCode = this.parentRow.drugCode
        this.indicationAll.search.drugCode = this.parentRow.drugCode
        this.indication.title = this.parentRow.genericName
        this.getTable('indication')
      } else {
        this.$refs.indication.clearTable()
      }
    },
    // 打开适应症新增窗口
    indicationAllAdd() {
      kindo.util
        .promise(() => {
          this.indication.dialog.visible = true
        })
        .then(() => {
          this.$refs['indicationAll'].reloadData()
        })
    },
    // 保存适应症
    saveindicationAll() {
      let params = []
      let data = this['indicationAll'].selection
      let url = config.api.child + '/batchAdd'
      if (data.length < 1) {
        kindo.util.alert('请选择一项进行操作。', '提示', 'waring')
      } else {
        for (let item of data) {
          params.push({
            drugCode: this.indication.form.drugCode,
            kbmsDrugIndicationId: item.id
          })
        }
        this.$http.post(url, params).then(res => {
          kindo.util.alert(res.message, '提示', 'success')
          this['indication'].dialog.visible = false
          this.getTable('indication')
        })
      }
    },
    remove(table, id) {
      let url = config.api.child
      let drugCode = this[table].form.drugCode
      // 单条
      if (id) {
        // let ids = JSON.stringify([id])
        let ids = [id]
        kindo.util.confirm('请确定是否删除', undefined, undefined, () => {
          this.$http.delete(url, { data: { ids: ids, drugCode: drugCode } }).then(res => {
            kindo.util.alert(res.message, '提示', 'success')
            this.getTable(table)
          })
        })
      } else {
        // 多条
        let ids = []
        let data = this[table].selection
        if (data.length < 1) {
          kindo.util.alert('请选择一项进行操作。', '提示', 'warning')
        } else {
          for (let item of data) {
            ids.push(item.id)
          }
          kindo.util.confirm('请确定是否删除', undefined, undefined, () => {
            this.$http.delete(url, { data: { ids: ids, drugCode: drugCode } }).then(res => {
              kindo.util.alert(res.message, '提示', 'success')
              this.getTable(table)
            })
          })
        }
      }
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
          this.$refs['accurate'].reloadData()
        })
    }
  },
  created() { },
  watch: {
    isOpen(val) {
      if (!kindo.validate.isEmpty(this.$refs.indication)) {
        this.$refs.indication.doLayout('indication')
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