/*@Author: lilizhou
  *菜单：知识库-合理用药-超量规则
 */
<template>
  <div :parentRow="parentRow" :isOpen="isOpen">
    <kindo-box title="查询条件">
      <el-form :model="search" label-position="right" onsubmit="return false;" inline @keyup.enter.prevent.native="get('table')">
        <el-form-item label="适应症">
          <el-input v-model.trim="search.name" clearable></el-input>
        </el-form-item>
        <el-form-item label="给药途径">
          <el-input v-model.trim="search.drugWayName" clearable></el-input>
        </el-form-item>
        <el-form-item label="应用条件">
          <el-input v-model.trim="search.limitNameOne" clearable></el-input>
        </el-form-item>
      </el-form>
      <div slot="control">
        <el-button icon="el-icon-search" type="primary" @click="get('table')">查询</el-button>
      </div>
    </kindo-box>
    <kindo-box :title="drugTitle">
      <kindo-table ref="table" :url="table.url" :pageSize="5" :queryParam="search" @selection-change="(selection) => selectionChange(selection, 'selection')" @filter-change="(filters)=>filterChange(filters,'table', 'search')">
        <el-table-column type="selection" fixed="left" width="30"></el-table-column>
        <el-table-column label="适应症" prop="name" min-width="120" header-align="center" sortable='custom' show-overflow-tooltip></el-table-column>
        <el-table-column label="条件" prop="limit" min-width="140" header-align="center" show-overflow-tooltip>
          <template slot-scope="scope">
            <span v-if="scope.row.limitNameOne">{{'1、'+scope.row.limitNameOne}}</span>
            <span v-if="scope.row.limitNameTwo">{{'2、'+scope.row.limitNameTwo}}</span>
            <span v-if="scope.row.limitNameThree">{{'3、'+scope.row.limitNameThree}}</span>
            <span v-if="scope.row.limitNameFour">{{'4、'+scope.row.limitNameFour}}</span>
            <span v-if="scope.row.limitNameFive">{{'5、'+scope.row.limitNameFive}}</span>
          </template>
        </el-table-column>
        <el-table-column label="给药途径" prop="drugWayName" min-width="140" header-align="center" sortable='custom' show-overflow-tooltip></el-table-column>
        <el-table-column label="用药次数(次/日)" prop="drugNumber" width="160" align="right" header-align="center" sortable='custom' show-overflow-tooltip></el-table-column>
        <el-table-column label="单次给药剂量" prop="dose" align="right" width="140" header-align="center" sortable='custom' show-overflow-tooltip>
          <template slot-scope="scope">
            {{scope.row.dose?scope.row.dose+kindo.dictionary.getLabel(list.otherUnit,scope.row.doseUnit):''}}
          </template>
        </el-table-column>
        <el-table-column label="每日用量" prop="undefined" align="right" width="120" header-align="center" show-overflow-tooltip>
          <template slot-scope="scope">
            {{dayCount(scope)}}
          </template>
        </el-table-column>
        <el-table-column label="疗程数" prop="cotNumber" width="120" align="right" header-align="center" sortable='custom' show-overflow-tooltip></el-table-column>
        <el-table-column label="疗程用药天数" prop="cotDays" width="140" align="right" header-align="center" sortable='custom' show-overflow-tooltip></el-table-column>
        <el-table-column label="疗程用药间隔" prop="cotInterval" width="140" align="right" header-align="center" sortable='custom' show-overflow-tooltip></el-table-column>
        <el-table-column label="审核状态" prop="status" width="100" align="center" header-align="center" columnKey='status' :filters="filtersDict.AUDIT_STATUS" :filter-method="filterHandler" :filter-multiple="false" filter-placement="bottom-end" show-overflow-tooltip>
          <template slot-scope="scope">
            <el-tag v-if="scope.row.status" :type="scope.row.status === '1'?'success':'info'" close-transition>{{kindo.dictionary.getLabel(dict.AUDIT_STATUS,scope.row.status)}}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" align="center" fixed="right">
          <template slot-scope="scope">
            <el-tooltip class="item" effect="dark" :open-delay="300" content="编辑" placement="top-start">
              <el-button type="text" icon="el-icon-edit" @click="edit(scope.row,'form','table','visible','tableEdit')"></el-button>
            </el-tooltip>
            <el-tooltip class="item" effect="dark" :open-delay="300" content="删除" placement="top-start">
              <el-button type="text" icon="el-icon-delete" @click="deleteOne(scope.row.id, 'table')"></el-button>
            </el-tooltip>
          </template>
        </el-table-column>
      </kindo-table>
      <div slot="control">
        <el-button icon="el-icon-plus" type="text" @click="insert('visible', 'form','tableInsert')">新增</el-button>
        <el-button icon="el-icon-delete" type="text" @click="batch('selection', 'table', 'delete')">删除</el-button>
        <el-button icon="el-icon-view" type="text" @click="batch('selection', 'table', 'audit')">审核</el-button>
      </div>
    </kindo-box>

    <el-dialog v-drag top="0" :visible.sync="visible" width="1300px" :title="(form.id?'编辑':'新增') +'超量规则'" :modal-append-to-body="false" :close-on-click-modal="false">
      <el-row>
        <el-col :span="8">
          <el-form :model="form" onsubmit="return false;" label-position="right" ref="form" label-width="130px" :rules="formRules" @keyup.enter.prevent.native="get">
            <el-form-item label="适应症" style="display:block;" prop="kbmsDrugIndicationId">
              <el-select v-model.trim="form.kbmsDrugIndicationId" size="mini" @blur="(ev)=>{blurSel(ev,form,'kbmsDrugIndicationId','adaptList')}" placeholder="请输入选择" clearable filterable :loading="loading" remote :remote-method="(query) => remoteMethod(query, 'loading', 'adaptList')">
                <li class="tip">
                  <span>
                    &lt;请选择&gt;
                  </span>
                </li>
                <el-option v-for="item in list.adaptList" :key="item.value" :label="item.label" :value="item.value">
                  <span>{{ item.label }}</span>
                </el-option>
              </el-select>
            </el-form-item>
            <el-form-item label="条件1" style="display:block;" prop="kbmsRuleLimitCondition1">
              <el-select v-model.trim="form.kbmsRuleLimitCondition1" size="mini" @blur="(ev)=>{blurSel(ev,form,'kbmsRuleLimitCondition1','firstCondtionList')}" placeholder="请输入选择" clearable filterable :loading="loading" remote :remote-method="(query) => remoteMethod(query, 'loading', 'firstCondtionList',conditionParams)">
                <li class="tip">
                  <span>
                    &lt;请选择&gt;
                  </span>
                </li>
                <el-option v-for="item in list.firstCondtionList" :key="item.value" :label="item.label" :value="item.value">
                  <span>{{ item.label }}</span>
                </el-option>
              </el-select>
              <el-button icon="el-icon-plus" type="primary" @click="addCondtion"></el-button>
            </el-form-item>
            <el-form-item label="条件2" style="display:block;" prop="kbmsRuleLimitCondition2" v-if="condition.second">
              <el-select v-model.trim="form.kbmsRuleLimitCondition2" size="mini" @blur="(ev)=>{blurSel(ev,form,'kbmsRuleLimitCondition2','secondCondtionList')}" placeholder="请输入选择" clearable filterable :loading="loading" remote :remote-method="(query) => remoteMethod(query, 'loading', 'secondCondtionList',conditionParams)">
                <li class="tip">
                  <span>
                    &lt;请选择&gt;
                  </span>
                </li>
                <el-option v-for="item in list.secondCondtionList" :key="item.value" :label="item.label" :value="item.value">
                  <span>{{ item.label }}</span>
                </el-option>
              </el-select>
              <el-button icon="el-icon-minus" type="primary" @click="condition.second=false"></el-button>
            </el-form-item>
            <el-form-item label="条件3" style="display:block;" prop="kbmsRuleLimitCondition3" v-if="condition.third">
              <el-select v-model.trim="form.kbmsRuleLimitCondition3" size="mini" @blur="(ev)=>{blurSel(ev,form,'kbmsRuleLimitCondition3','thirdCondtionList')}" placeholder="请输入选择" clearable filterable :loading="loading" remote :remote-method="(query) => remoteMethod(query, 'loading', 'thirdCondtionList',conditionParams)">
                <li class="tip">
                  <span>
                    &lt;请选择&gt;
                  </span>
                </li>
                <el-option v-for="item in list.thirdCondtionList" :key="item.value" :label="item.label" :value="item.value">
                  <span>{{ item.label }}</span>
                </el-option>
              </el-select>
              <el-button icon="el-icon-minus" type="primary" @click="condition.third=false"></el-button>
            </el-form-item>
            <el-form-item label="条件4" style="display:block;" prop="kbmsRuleLimitCondition4" v-if="condition.fourth">
              <el-select v-model.trim="form.kbmsRuleLimitCondition4" size="mini" @blur="(ev)=>{blurSel(ev,form,'kbmsRuleLimitCondition4','fourthCondtionList')}" placeholder="请输入选择" clearable filterable :loading="loading" remote :remote-method="(query) => remoteMethod(query, 'loading', 'fourthCondtionList',conditionParams)">
                <li class="tip">
                  <span>
                    &lt;请选择&gt;
                  </span>
                </li>
                <el-option v-for="item in list.fourthCondtionList" :key="item.value" :label="item.label" :value="item.value">
                  <span>{{ item.label }}</span>
                </el-option>
              </el-select>
              <el-button icon="el-icon-minus" type="primary" @click="condition.fourth=false"></el-button>
            </el-form-item>
            <el-form-item label="条件5" style="display:block;" prop="kbmsRuleLimitCondition5" v-if="condition.fifth">
              <el-select v-model.trim="form.kbmsRuleLimitCondition5" size="mini" @blur="(ev)=>{blurSel(ev,form,'kbmsRuleLimitCondition5','fifthCondtionList')}" placeholder="请输入选择" clearable filterable :loading="loading" remote :remote-method="(query) => remoteMethod(query, 'loading', 'fifthCondtionList',conditionParams)">
                <li class="tip">
                  <span>
                    &lt;请选择&gt;
                  </span>
                </li>
                <el-option v-for="item in list.fifthCondtionList" :key="item.value" :label="item.label" :value="item.value">
                  <span>{{ item.label }}</span>
                </el-option>
              </el-select>
              <el-button icon="el-icon-minus" type="primary" @click="condition.fifth=false"></el-button>
            </el-form-item>
            <el-form-item label="给药途径" style="display:block;" prop="kbmsDrugWayId">
              <el-select v-model.trim="form.kbmsDrugWayId" size="mini" @blur="(ev)=>{blurSel(ev,form,'kbmsDrugWayId','dosingWayList')}" placeholder="请输入选择" clearable filterable :loading="loading" remote :remote-method="(query) => remoteMethod(query, 'loading', 'dosingWayList')">
                <li class="tip">
                  <span>
                    &lt;请选择&gt;
                  </span>
                </li>
                <el-option v-for="item in list.dosingWayList" :key="item.value" :label="item.label" :value="item.value">
                  <span>{{ item.label }}</span>
                </el-option>
              </el-select>
            </el-form-item>
            <el-form-item label="用药次数(次/日)" prop="drugNumber" class="oneLineTextarea">
              <el-input-number v-model.trim="form.drugNumber" :controls="false" :min="0"></el-input-number>
            </el-form-item>
            <el-form-item label="单次给药剂量" prop="dose" class="oneLineTextarea">
              <el-row>
                <el-col :span="12">
                  <el-input-number v-model.trim="form.dose" :controls="false" :min="0"></el-input-number>
                </el-col>
                <el-col :span="12">
                  <el-select v-model.trim="form.doseUnit" clearable filterable>
                    <el-option v-for="(item,index) in list.otherUnit" :key="index" :label="item.label" :value="item.value"></el-option>
                  </el-select>
                </el-col>
              </el-row>
            </el-form-item>
            <el-form-item label="疗程数量" prop="cotNumber" class="oneLineTextarea">
              <el-input-number v-model.trim="form.cotNumber" :controls="false" :min="0"></el-input-number>
            </el-form-item>
            <el-form-item label="疗程用药天数" prop="cotDays" class="oneLineTextarea">
              <el-input-number v-model.trim="form.cotDays" :controls="false" :min="0"></el-input-number>
            </el-form-item>
            <el-form-item label="疗程间隔天数" prop="cotInterval" class="oneLineTextarea">
              <el-input-number v-model.trim="form.cotInterval" :controls="false" :min="0"></el-input-number>
            </el-form-item>
          </el-form>
          <div class="dialog-footer">
            <el-button type="primary" icon="fa fa-floppy-o" @click="save('form','table','visible')">保存</el-button>
            <el-button @click="visible = false" icon="el-icon-close" type="primary">取 消</el-button>
          </div>
        </el-col>
        <el-col :span="16">
          <drug-instruction></drug-instruction>
        </el-col>
      </el-row>
    </el-dialog>
  </div>
</template>

<script>
import config from './config/index.js'
import mixin from '@src/utils/helper/tableMixIn.js'
import drugInstrution from './drugIntruction'
export default {
  components: {
    'drug-instruction': drugInstrution
  },
  mixins: [mixin],
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
      timeout: null,
      table: {
        url: config.api.childExcess
      },
      selection: [],
      list: {
        adaptList: [],
        firstCondtionList: [],
        secondCondtionList: [],
        thirdCondtionList: [],
        fourthCondtionList: [],
        fifthCondtionList: [],
        dosingWayList: [],
        otherUnit: []
      },
      conditionParams: {
        limitDefine: '1'
      },
      condition: {
        second: false,
        third: false,
        fourth: false,
        fifth: false
      },
      loading: false,
      drugTitle: this.parentRow.genericName ? this.parentRow.genericName : '超量规则信息',
      search: {
        name: '',
        drugCode: '',
        drugWayName: '',
        limitNameOne: '',
        status: ''
      },

      form: {
        id: '',
        drugCode: '',
        kbmsDrugIndicationId: '',
        kbmsDrugWayId: '',
        kbmsRuleLimitCondition1: '',
        kbmsRuleLimitCondition2: '',
        kbmsRuleLimitCondition3: '',
        kbmsRuleLimitCondition4: '',
        kbmsRuleLimitCondition5: '',
        drugNumber: undefined,
        dose: undefined,
        doseUnit: '',
        cotNumber: undefined,
        cotDays: undefined,
        cotInterval: undefined
      },
      formRules: {
        // t107c01: [{ required: true, message: '请输入编码', trigger: 'blur' }],
        // tcmHppdCode: [{ required: true, message: '请选择', trigger: 'blur' }]
      },
      visible: false
    }
  },

  created() {
    this._form = Object.assign({}, this.form)
    // 审核状态数据字典获取
    this.getDict(this.dict, this.filtersDict)
    // 获取除了重量以外的其他单位
    this.$http.get(config.api.listForCombo, { params: { type: '0,1' } }).then(res => {
      this.list.otherUnit = res.data
    })
  },

  mounted() {
    this.$nextTick(() => {
      // this.get('table')
    })
  },

  methods: {
    init() {
      if (this.parentRow.drugCode) {
        this.search.drugCode = this.parentRow.drugCode
        this.form.drugCode = this.parentRow.drugCode
        this.drugTitle = this.parentRow.genericName
        this.get('table')
      } else {
        this.$refs.table.clearTable()
      }
    },
    get(table) {
      this.$refs[table].reloadData()
    },
    // 新增条件的按钮
    addCondtion() {
      if (!this.condition.second) {
        this.condition.second = true
      } else {
        if (!this.condition.third) {
          this.condition.third = true
        } else {
          if (!this.condition.fourth) {
            this.condition.fourth = true
          } else {
            if (!this.condition.fifth) {
              this.condition.fifth = true
            } else {
              kindo.util.alert('最多选择5个限定条件', undefined, 'warning')
            }
          }
        }
      }
    },
    // 获取每日的剂量
    dayCount(scope) {
      if (!kindo.validate.isEmpty(scope.row.drugNumber) && !kindo.validate.isEmpty(scope.row.dose)) {
        let val = kindo.util.formatNum(parseFloat(scope.row.drugNumber) * parseFloat(scope.row.dose), 4)
        return val + kindo.dictionary.getLabel(this.list.otherUnit, scope.row.doseUnit)
      } else {
        return ''
      }
    },
    // 新增
    tableInsert() {
      this.list.adaptList = []
      this.list.firstCondtionList = []
      this.list.secondCondtionList = []
      this.list.thirdCondtionList = []
      this.list.fourthCondtionList = []
      this.list.fifthCondtionList = []
      this.list.dosingWayList = []
      this.form.drugCode = this.parentRow.drugCode
    },
    // 新增保存
    save(form, table, visible, url) {
      this.$refs[form].validate(valid => {
        if (valid) {
          let mainUrl = this.$refs[table].url
          let requestType = 'post'
          // 若有id则为编辑保存
          if (this[form].id) {
            requestType = 'put'
          }
          if (!kindo.validate.isEmpty(url)) {
            mainUrl = url
          }
          if (!this.form.kbmsDrugIndicationId && !this.form.kbmsRuleLimitCondition1) {
            kindo.util.confirm('适应症或者条件必填一项', '提示', 'warning', undefined, undefined)
          } else {
            this.$http[requestType](mainUrl, this[form]).then(res => {
              kindo.util.alert(res.message, '提示', 'success')
              this[visible] = false
              this.get(table)
            })
          }
        }
      })
    },
    /*
目的： 表内点击编辑的时候，
2、row 表的当前数据，类型-对象
*/
    tableEdit(row) {
      // kbmsRuleLimitCondition5 limitNameFive
      // kbmsRuleLimitCondition4
      this.list.adaptList = [{ value: row.kbmsDrugIndicationId, label: row.name }]
      this.list.firstCondtionList = [{ label: row.limitNameOne, value: row.kbmsRuleLimitCondition1 }]
      this.list.secondCondtionList = [{ label: row.limitNameTwo, value: row.kbmsRuleLimitCondition2 }]
      this.list.thirdCondtionList = [{ label: row.limitNameThree, value: row.kbmsRuleLimitCondition3 }]
      this.list.fourthCondtionList = [{ label: row.limitNameFour, value: row.kbmsRuleLimitCondition4 }]
      this.list.fifthCondtionList = [{ label: row.limitNameFive, value: row.kbmsRuleLimitCondition5 }]
      this.list.dosingWayList = [{ value: row.kbmsDrugWayId, label: row.drugWayName }]
    },
    // 导入
    importData() { },
    // 导出
    exportData() {
      window.open(kindo.util.exportUrl(config.api.export, this.search))
    }
  },
  watch: {
    isOpen(val) {
      if (!kindo.validate.isEmpty(this.$refs.table)) {
        this.$refs.table.doLayout('table')
      }
    },
    parentRow: function (val, oldVal) {
      this.init()
    },
    form: {
      handler: function (val) {
        if (val.kbmsDrugIndicationId === '') {
          this.list.adaptList = []
        } else if (val.kbmsDrugWayId === '') {
          this.list.dosingWayList = []
        } else if (val.kbmsRuleLimitCondition1 === '') {
          this.list.firstCondtionList = []
        } else if (val.kbmsRuleLimitCondition2 === '') {
          this.list.secondCondtionList = []
        } else if (val.kbmsRuleLimitCondition3 === '') {
          this.list.thirdCondtionList = []
        } else if (val.kbmsRuleLimitCondition4 === '') {
          this.list.fourthCondtionList = []
        } else if (val.kbmsRuleLimitCondition5 === '') {
          this.list.fifthCondtionList = []
        }
      },
      deep: true
    }
  }
}
</script>
