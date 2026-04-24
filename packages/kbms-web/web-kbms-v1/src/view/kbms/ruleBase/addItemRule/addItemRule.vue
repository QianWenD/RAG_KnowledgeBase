/* @Author: wuhuihui
 *菜单：知识数据库-规则库-项目匹配规则
<template>
  <div>
    <!-- 父表 start -->
    <kindo-box title="查询条件" icon="xx">
      <el-form :model="parent.search" onsubmit="return false;" label-position="right" inline @keyup.enter.prevent.native="getParent">
        <el-form-item label="诊疗项目">
          <el-input v-model.trim="parent.search.itemName" placeholder="请输入关键字" clearable></el-input>
        </el-form-item>
        <el-form-item label="项目等级">
          <el-select v-model.trim="parent.search.chargeLevel" clearable>
            <el-option v-for="(item, index) in dict.CHARGE_LEVEL" :key="index" :value="item.value" :label="item.label"></el-option>
          </el-select>
        </el-form-item>
      </el-form>
      <div slot="control">
        <el-button icon="el-icon-search" type="primary" @click="getParent">查询</el-button>
      </div>
    </kindo-box>
    <kindo-box title="项目匹配规则">
      <kindo-table ref="parent" :url="parent.url" :queryParam="parent.search" :extendOption="extend" @selection-change="(selection) => tableChange('parent', selection)" @current-change="tableClick" :pageSize="5">
        <el-table-column type="selection" fixed="left" width="30"></el-table-column>
        <el-table-column label="诊疗项目编码" fixed="left" prop="itemCode" min-width="150" header-align="center" sortable='custom' show-overflow-tooltip></el-table-column>
        <el-table-column label="诊疗项目名称" fixed="left" prop="itemName" min-width="150" header-align="center" sortable='custom' show-overflow-tooltip></el-table-column>
        <el-table-column label="项目等级" prop="chargeLevel" width="140" :formatter="(row) => kindo.dictionary.getLabel(dict.CHARGE_LEVEL, row.chargeLevel)" align="center" sortable='custom' show-overflow-tooltip></el-table-column>
        <el-table-column label="周期" prop="period" min-width="70" header-align="center" show-overflow-tooltip>
          <template slot-scope="scope">
            <span>{{scope.row.period+kindo.dictionary.getLabel(dict.PERIOD_UNIT_TYPE,scope.row.unit)}} </span>
          </template>
        </el-table-column>
        <el-table-column label="备注" prop="remark" min-width="240" header-align="center" sortable='custom' show-overflow-tooltip></el-table-column>
        <el-table-column label="操作" width="100" align="center" fixed="right">
          <template slot-scope="scope">
            <el-tooltip class="item" effect="dark" :open-delay="300" content="编辑" placement="top-start">
              <el-button type="text" icon="el-icon-edit" @click="update('parent', scope.row, 'parentForm')"></el-button>
            </el-tooltip>
            <el-tooltip class="item" effect="dark" :open-delay="300" content="删除" placement="top-start">
              <el-button type="text" icon="el-icon-delete" @click="remove('parent', scope.row.id)"></el-button>
            </el-tooltip>
          </template>
        </el-table-column>
      </kindo-table>
      <div slot="control">
        <el-button icon="el-icon-plus" type="text" @click="add('parent','', 'parentForm')">新增</el-button>
        <el-button icon="el-icon-delete" type="text" @click="remove('parent')">删除</el-button>
      </div>
    </kindo-box>
    <!-- 父表 end -->

    <!-- 子表 start -->
    <kindo-box title="查询条件" icon="xx">
      <el-form :model="child.search" onsubmit="return false;" label-position="right" inline @keyup.enter.prevent.native="getChild">
        <el-form-item label="诊疗项目">
          <el-input v-model.trim="child.search.itemName" placeholder="请输入关键字" clearable></el-input>
        </el-form-item>
        <el-form-item label="项目等级">
          <el-select v-model.trim="child.search.chargeLevel" clearable>
            <el-option v-for="(item, index) in dict.CHARGE_LEVEL" :key="index" :value="item.value" :label="item.label"></el-option>
          </el-select>
        </el-form-item>
      </el-form>
      <div slot="control">
        <el-button icon="el-icon-search" type="primary" :disabled="child.search.itemAdditionalId === ''" @click="getChild">查询</el-button>
      </div>
    </kindo-box>
    <kindo-box title="项目匹配规则子表">
      <kindo-table ref="child" :url="child.url" :queryParam="child.search" :extendOption="extend" @selection-change="(selection) => tableChange('child', selection)" @filter-change="(filters)=>filterChange(filters,'child', 'search')" :pageSize="5">
        <el-table-column type="selection" fixed="left" width="30"></el-table-column>
        <el-table-column label="诊疗项目编码" fixed="left" prop="itemCode" min-width="150" header-align="center" sortable='custom' show-overflow-tooltip></el-table-column>
        <el-table-column label="诊疗项目名称" fixed="left" prop="itemName" min-width="150" header-align="center" sortable='custom' show-overflow-tooltip></el-table-column>
        <el-table-column label="项目等级" prop="chargeLevel" width="140" :formatter="(row) => kindo.dictionary.getLabel(dict.CHARGE_LEVEL, row.chargeLevel)" align="center" sortable='custom' show-overflow-tooltip></el-table-column>
        <el-table-column label="备注" prop="remark" min-width="240" header-align="center" sortable='custom' show-overflow-tooltip></el-table-column>
        <el-table-column label="审核状态" prop="status" width="100" align="center" columnKey='status' :filters="columnFilters(dict.AUDIT_STATUS)" :filter-method="filterHandler" :filter-multiple="false" filter-placement="bottom-end">
          <template slot-scope="scope">
            <el-tag :type="scope.row.status === '1'?'success':'info'" close-transition>{{kindo.dictionary.getLabel(dict.AUDIT_STATUS,scope.row.status)}}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" align="center" fixed="right">
          <template slot-scope="scope">
            <el-tooltip class="item" effect="dark" :open-delay="300" content="编辑" placement="top-start">
              <el-button type="text" icon="el-icon-edit" @click="update('child', scope.row, 'childForm')"></el-button>
            </el-tooltip>
            <el-tooltip class="item" effect="dark" :open-delay="300" content="删除" placement="top-start">
              <el-button type="text" icon="el-icon-delete" @click="remove('child', scope.row.id)"></el-button>
            </el-tooltip>
          </template>
        </el-table-column>
      </kindo-table>
      <div slot="control">
        <el-button icon="el-icon-plus" type="text" :disabled="child.search.itemAdditionalId === ''" @click="add('child','itemAdditionalId', 'childForm')">新增</el-button>
        <el-button icon="el-icon-delete" type="text" :disabled="child.search.itemAdditionalId === ''" @click="remove('child')">删除</el-button>
        <el-button icon="el-icon-view" type="text" :disabled="child.search.itemAdditionalId === ''" @click="audit('child')">审核</el-button>
      </div>
    </kindo-box>
    <!-- 子表 end -->

    <!-- 主表新增 start -->
    <el-dialog v-drag top="0" :visible.sync="parent.dialog.visible" :title="(parent.form.id?'编辑':'新增') + '诊疗项目'" :close-on-click-modal="false">
      <el-form :model="parent.form" onsubmit="return false;" class="box" ref="parentForm" label-width="90px" :rules="parent.rules" label-position="right">
        <el-form-item label="诊疗项目" prop="itemCode">
          <el-select v-model.trim="parent.form.itemCode" :disabled="!kindo.validate.isEmpty(parent.form.id)" size="mini" @blur="(ev)=>{blurSel(ev,parent.form,'itemCode','commonDrugList')}" placeholder="请输入选择" clearable filterable :loading="loading" remote :remote-method="(query) => getDictRemote('commonDrugList', 'itemName', query)">
            <li class="title">
              <span>代码值</span>
              <span>代码标题</span>
            </li>
            <li class="tip">
              <span>
                &lt;请选择&gt;
              </span>
            </li>
            <el-option v-for="item in list.commonDrugList" :key="item.value" :label="item.label" :value="item.value">
              <span>{{ item.value }}</span>
              <span>{{ item.label }}</span>
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="周期: " prop="period">
          <el-input style="width:125px" type='number' v-model="parent.form.period"></el-input>
          <el-select style="width:180px" v-model="parent.form.unit">
            <el-option v-for='(item,index) in dict.PERIOD_UNIT_TYPE' :key='index' :label='item.label' :value='item.value'></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input type="textarea" :rows="2" placeholder="可输入200字" v-model.trim="parent.form.remark">
          </el-input>
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button type="primary" icon="fa fa-floppy-o" @click="save('parent')">保 存</el-button>
        <el-button @click="parent.dialog.visible = false" icon="el-icon-close" type="primary">取 消</el-button>
      </div>
    </el-dialog>
    <!-- 主表新增 end -->
    <!-- 子表新增 start -->
    <el-dialog v-drag top="0" :visible.sync="child.dialog.visible" :title="(child.form.id?'编辑':'新增') + '诊疗项目'">
      <el-form :model="child.form" onsubmit="return false;" class="box" ref="childForm" label-width="90px" :rules="child.rules" label-position="right">
        <el-form-item label="诊疗项目" prop="itemCode">
          <el-select v-model.trim="child.form.itemCode" :disabled="!kindo.validate.isEmpty(child.form.id)" size="mini" @blur="(ev)=>{blurSel(ev,child.form,'itemCode','commonDrugList')}" placeholder="请输入选择" clearable filterable :loading="loading" remote :remote-method="(query) => getDictRemote('commonDrugList', 'itemName', query)">
            <li class="title">
              <span>代码值</span>
              <span>代码标题</span>
            </li>
            <li class="tip">
              <span>
                &lt;请选择&gt;
              </span>
            </li>
            <el-option v-for="item in list.commonDrugList" :key="item.value" :label="item.label" :value="item.value">
              <span>{{ item.value }}</span>
              <span>{{ item.label }}</span>
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input type="textarea" :rows="2" placeholder="可输入200字" v-model.trim="child.form.remark">
          </el-input>
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button type="primary" icon="fa fa-floppy-o" @click="save('child')">保 存</el-button>
        <el-button @click="child.dialog.visible = false" icon="el-icon-close" type="primary">取 消</el-button>
      </div>
    </el-dialog>
    <!-- 子表新增 end -->
  </div>
</template>

<script>
import config from './config/index.js'
import tableOpra from '@src/utils/helper/tableOpra.js'
export default {
  name: 'addItemRule',
  mixins: [tableOpra],
  data() {
    return {
      // 主表默认选第一行数据
      extend: { selectedFirst: true },
      loading: false,
      disabled: true,
      dict: {
        AUDIT_STATUS: [],
        // 收费等级
        CHARGE_LEVEL: [],
        PERIOD_UNIT_TYPE: []
      },

      parent: {
        url: config.api.parent,
        selection: [],
        dialog: {
          visible: false
        },
        form: {
          id: '',
          remark: '',
          itemCode: '',
          period: '',
          unit: ''
        },
        rules: {
          itemCode: [{ required: true, message: '请输入名称', trigger: 'blur' }],
          remark: [{ min: 0, max: 200, message: '长度不能超过200' }],
          period: [{ required: true, message: '请输入周期值', trigger: 'blur' }, { pattern: /^[1-9]d*$/, message: '请输入正整数' }]
        },
        search: {
          itemName: '',
          chargeLevel: ''
        }
      },
      list: {
        commonDrugList: []
      },
      child: {
        url: config.api.child,
        selection: [],
        dialog: {
          visible: false
        },
        form: {
          id: '',
          itemAdditionalId: '',
          remark: '',
          itemCode: ''
        },
        rules: {
          itemCode: [{ required: true, message: '请输入名称', trigger: 'blur' }],
          remark: [{ min: 0, max: 200, message: '长度不能超过200' }]
        },
        search: {
          itemAdditionalId: '',
          itemName: '',
          chargeLevel: ''
        }
      }
    }
  },
  methods: {
    // 诊疗项目远程查询
    getDictRemote(dict, searchName, searchVal) {
      let param = { rows: 200, [searchName]: searchVal }
      this.$http.get(this.api.medicalTreatment, { params: param }).then(res => {
        this.list[dict] =
          res.data.rows.map(item => {
            return { label: item.itemName, value: item.itemCode }
          }) || []
      })
    },
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
          this.$refs.child.clearTable()
          this.child.form.itemAdditionalId = ''
          this.child.search.itemAdditionalId = ''
        }
      })
    },
    // 获取字表信息
    getChild() {
      if (this.child.form.itemAdditionalId) {
        this.getTable('child')
      }
    },

    tableClick(row) {
      if (row) {
        this.child.form.itemAdditionalId = row.id
        this.child.search.itemAdditionalId = row.id
        this.getChild()
      } else {
        this.$refs.child.clearTable()
      }
    },

    update(table, row, refForm) {
      kindo.util
        .promise(() => {
          this[table].dialog.visible = true
        })
        .then(() => {
          this.$refs[refForm].resetFields()
          this.list.commonDrugList = []
        })
        .then(() => {
          for (var key in row) {
            if (this[table].form.hasOwnProperty(key) === true) {
              this[table].form[key] = row[key]
            }
          }
          this.list.commonDrugList.push({ label: row.itemName, value: row.itemCode })
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
