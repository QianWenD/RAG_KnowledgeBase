ss/* @Author: lilizhou
  *菜单：知识库-性别限制用药
 */
<template>
  <div>
    <kindo-box title="查询条件" icon="xx">
      <el-form :model="search" label-position="right" onsubmit="return false;" inline @keyup.enter.prevent.native="get('table')">
        <el-form-item label="药品名称">
          <el-input v-model.trim="search.hcGenericName" clearable placeholder="请输入名称或编码"></el-input>
        </el-form-item>
        <el-form-item label="性别">
          <el-select v-model.trim="search.sex" placeholder="" clearable>
            <el-option v-for="item in dict.SEX" :key="item.value" :value="item.value" :label="item.label"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="剂型">
          <el-input v-model.trim="search.actualFormName" clearable></el-input>
        </el-form-item>
      </el-form>
      <div slot="control">
        <el-button icon="el-icon-search" type="primary" @click="get('table')">查询</el-button>
      </div>
    </kindo-box>
    <kindo-box title="性别限制用药">
      <kindo-table ref="table" :url="url" :queryParam="search" @selection-change="selectionChange" @filter-change="(filters)=>filterChange(filters,'table', 'search')">
        <el-table-column type="selection" fixed="left" width="30"></el-table-column>
        <el-table-column label="药品编码" prop="hcDrugCode" min-width="120" header-align="center" sortable='custom' show-overflow-tooltip></el-table-column>
        <el-table-column label="药品名称" prop="hcGenericName" min-width="140" header-align="center" sortable='custom' show-overflow-tooltip></el-table-column>
        <el-table-column label="性别" prop="sex" width="80" align="center">
          <template slot-scope="scope">
            <span>{{kindo.dictionary.getLabel(dict.SEX,scope.row.sex)}}</span>
          </template>
        </el-table-column>
        <el-table-column label="剂型" prop="actualFormName" width="160" header-align="center" align="center" sortable='custom' show-overlow-tooltip></el-table-column>
        <el-table-column label="描述" prop="remark" width="300" header-align="center" show-overlow-tooltip></el-table-column>
        <el-table-column label="审核状态" prop="status" width="100" align="center" columnKey='status' :filters="filtersDict.AUDIT_STATUS" :filter-method="filterHandler" :filter-multiple="false" filter-placement="bottom-end">
          <template slot-scope="scope">
            <el-tag :type="scope.row.status === '1'?'success':'primary'" close-transition>{{kindo.dictionary.getLabel(dict.AUDIT_STATUS,scope.row.status)}}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" align="center" fixed="right">
          <template slot-scope="scope">
            <el-tooltip class="item" effect="dark" :open-delay="300" content="编辑" placement="top-start">
              <el-button type="text" icon="el-icon-edit" @click="edit(scope.$index, scope.row)"></el-button>
            </el-tooltip>
            <el-tooltip class="item" effect="dark" :open-delay="300" content="删除" placement="top-start">
              <el-button type="text" icon="el-icon-delete" @click="deleteOne(scope.row.id,'table')"></el-button>
            </el-tooltip>
          </template>
        </el-table-column>
      </kindo-table>
      <div slot="control">
        <el-button icon="el-icon-plus" type="text" @click="insert">新增</el-button>
        <el-button icon="el-icon-delete" type="text" @click="batch('selection', 'table', 'delete')">删除</el-button>
        <el-button icon="el-icon-view" type="text" @click="batch('selection', 'table', 'audit')">审核</el-button>
        <!-- <el-button icon="el-icon-k-sys-export" type="text" @click="exportData">导出</el-button> -->
        <!-- <el-button icon="el-icon-k-sys-import" type="text" @click="importData">导入</el-button> -->
      </div>
    </kindo-box>
    <el-dialog v-drag top="0" :visible.sync="visibleSex" :title="(dialog1.id?'编辑':'新增') +'限制性别用药'" :modal-append-to-body="false" :close-on-click-modal="false">
      <el-form :model="dialog1" label-position="right" ref="dialog1Form" class="box" label-width="90px" :rules="dialog1Rules">
        <el-form-item label="药品名称" prop="hcDrugCode">
          <el-select v-model.trim="dialog1.hcDrugCode" placeholder="请输入药品名称" :disabled="!kindo.validate.isEmpty(dialog1.id)" clearable filterable :loading="loading" @blur="(ev)=>{blurSel(ev,dialog1,'hcDrugCode','healthDrugList')}" remote :remote-method="(query)=>{remoteMethod(query,'loading','healthDrugList')}">
            <li class="title">
              <span>代码值</span>
              <span>代码标题</span>
            </li>
            <li class="tip">
              <span>
                &lt;请选择&gt;
              </span>
            </li>
            <el-option v-for="item in list.healthDrugList" :key="item.value" :label="item.label" :value="item.value">
              <span>{{ item.value }}</span>
              <span>{{ item.label+'('+item.actualFormName+')' }}</span>
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="剂型" prop="actualFormName">
          <el-input v-model.trim="dialog1.actualFormName" clearable disabled></el-input>
        </el-form-item>
        <el-form-item label="性别" prop="sex">
          <el-radio-group v-model.trim="dialog1.sex">
            <el-radio v-for="item in dict.SEX" :key="item.value" :label="item.value">{{item.label}}</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="描述" prop="remark" class="oneLineTextarea">
          <el-input type="textarea" resize="none" :rows="2" placeholder="请输入内容" v-model.trim="dialog1.remark"></el-input>
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button type="primary" icon="fa fa-floppy-o" @click="save">保存</el-button>
        <el-button @click="visibleSex = false" icon="el-icon-close" type="primary">取 消</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import config from './config/index.js'
import mixin from '@src/utils/helper/tableMixIn.js'
export default {
  name: 'limitSexDrugRule',
  mixins: [mixin],
  data() {
    return {
      dict: { SEX: [], AUDIT_STATUS: [] },
      filtersDict: {
        // 表内筛选审核状态数组
        AUDIT_STATUS: [],
        SEX: []
      },
      url: config.api.table,
      loading: false,
      search: {
        actualFormName: '',
        sex: '',
        hcGenericName: '',
        status: ''
      },
      timeout: null,
      // 下拉列表项目
      list: {
        healthDrugList: [],
        dosageList: []
      },
      dialog1: {
        id: '',
        hcDrugCode: '',
        actualFormName: '',
        sex: '',
        remark: ''
      },
      dialog1Rules: {
        hcDrugCode: [{ required: true, message: '请输入', trigger: 'blur' }],
        sex: [{ required: true, message: '请选择', trigger: 'blur' }],
        remark: [{ min: 0, max: 30, message: '长度不能超过30', trigger: 'blur' }]
      },
      visibleSex: false
    }
  },

  created() {
    this._dialog1 = Object.assign({}, this.dialog1)
    // 数据字典获取
    for (let k in this.dict) {
      if (this.dict.hasOwnProperty(k)) {
        kindo.dictionary.getDictionary(k).then(res => {
          this.dict[k] = res || []
          this.filtersDict[k] = res.map(item => {
            return { text: item.label, value: item.value }
          })
        })
      }
    }
  },

  mounted() {
    this.$nextTick(() => {
      this.get('table')
    })
  },

  methods: {
    // 新增
    insert() {
      kindo.util
        .promise(() => {
          this.visibleSex = true
        })
        .then(() => {
          this.$refs.dialog1Form.resetFields()
        })
        .then(() => {
          Object.assign(this.dialog1, this._dialog1)
        })
    },
    /*
目的： 当表格中选择项发生变化时，
1、selection 表的选择的项目，类型-数组
*/
    selectionChange(selection) {
      this.selection = selection
    },
    /*
目的： 表内点击编辑的时候，
1、index 表的索引，类型-数字
2、row 表的当前数据，类型-对象
*/
    edit(index, row) {
      kindo.util
        .promise(() => {
          this.visibleSex = true
        })
        .then(() => {
          // this.$refs.dialog1Form.resetFields()
        })
        .then(() => {
          for (let key in this.dialog1) {
            this.dialog1[key] = row[key]
          }
          this.list.healthDrugList = [{ value: row.hcDrugCode, label: row.hcGenericName, actualFormName: row.actualFormName }]
        })
    },

    // 保存
    save() {
      this.$refs.dialog1Form.validate(valid => {
        if (valid) {
          if (this.dialog1.id) {
            // 编辑保存
            this.$http.put(config.api.table, this.dialog1).then(res => {
              kindo.util.alert(res.message, '提示', 'success')
              this.visibleSex = false
              this.get('table')
            })
          } else {
            // 新增保存
            this.$http.post(config.api.table, this.dialog1).then(res => {
              kindo.util.alert(res.message, '提示', 'success')
              this.visibleSex = false
              this.get('table')
            })
          }
        }
      })
    },
    // 推送审核
    pushReview() {
      if (this.selection.length > 0) {
        kindo.util.confirm('请确定是否推送审核 ', undefined, undefined, () => {
          this.$http.put(config.api.table + this.selection.map(item => item.id).toString() + '/submit').then(res => {
            kindo.util.alert(res.message, '提示', 'success')
            this.get('table')
          })
        })
      } else {
        kindo.util.alert('请至少勾选一条数据', '提示', 'warning')
      }
    },
    // 审核的时候，通过审核的按钮
    auditPass() {
      if (this.selection.length > 0) {
        kindo.util.confirm('请确定通过审核 ', undefined, undefined, () => {
          // v1/mi/data/point/t107/{ids}/audit ,ids用逗号分隔
          this.$http.put(config.api.table + this.selection.map(item => item.id).toString() + '/audit').then(res => {
            kindo.util.alert(res.message, '提示', 'success')
            this.get('table')
          })
        })
      } else {
        kindo.util.alert('请至少勾选一条数据', '提示', 'warning')
      }
    },
    // 驳回
    turnDown() {
      if (this.selection.length > 0) {
        kindo.util.confirm('请确定是否驳回 ', undefined, undefined, () => {
          this.$http.put(config.api.table + this.selection.map(item => item.id).toString() + '/reject').then(res => {
            kindo.util.alert(res.message, '提示', 'success')
            this.get('table')
          })
        })
      } else {
        kindo.util.alert('请至少勾选一条数据', '提示', 'warning')
      }
    },
    // 导入
    importData() { },
    // 导出
    exportData() {
      window.open(kindo.util.exportUrl(config.api.export, this.search))
    }
  },
  watch: {
    'dialog1.hcDrugCode': function (val, oldVal) {
      if (val === '') {
        this.list.healthDrugList = []
        this.dialog1.actualFormName = ''
      } else {
        this.list.healthDrugList.map(item => {
          if (item.value === val) {
            this.dialog1.actualFormName = item.actualFormName
          }
        })
      }
    }
  }
}
</script>