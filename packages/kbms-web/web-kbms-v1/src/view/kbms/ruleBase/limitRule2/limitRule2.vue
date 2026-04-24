/*
 * @Author: 吴慧慧 
 * @Date: 2020-01-09 14:57:29 
 * @Last Modified by: 吴慧慧
 * 菜单：限定规则-2
 * @Last Modified time: 2020-01-09 15:34:21
 */

<template>
  <div>
    <kindo-box title="查询条件" icon="xx">
      <el-form :model="parent.search" label-position="right" onsubmit="return false;" inline
        @keyup.enter.prevent.native="getParent">
        <el-form-item label="诊疗项目">
          <el-input v-model.trim="parent.search.itemName" placeholder="请输入关键字" clearable></el-input>
        </el-form-item>
      </el-form>
      <div slot="control">
        <el-button icon="el-icon-search" type="primary" @click="getParent">查询</el-button>
      </div>
    </kindo-box>
    <kindo-box title="限价规则-2">
      <kindo-table ref="parent" :url="parent.url" :queryParam="parent.search" :pageSize="5" :extendOption="extend"
        @selection-change="(selection) => tableChange('parent', selection)" @current-change="tableClick"
        @filter-change="(filters) => filterChange(filters, 'parent', 'search')">
        <el-table-column type="selection" fixed="left" width="30"></el-table-column>
        <el-table-column label="诊疗项目编码" fixed="left" prop="itemCode" width="150" header-align="center" sortable='custom'
          show-overflow-tooltip></el-table-column>
        <el-table-column label="诊疗项目名称" fixed="left" prop="itemName" min-width="150" header-align="center"
          sortable='custom' show-overflow-tooltip></el-table-column>
        <el-table-column label="单位" prop="itemUnit"
          :formatter="(r,c,v) => kindo.dictionary.getLabel(dict.LIMIT_PRICE_UNIT,v)" width="100" header-align="center"
          show-overflow-tooltip></el-table-column>
        <el-table-column label="市级一级" prop="cityLevel1" :formatter="(r,c,v) => v!==null?(v+'%'):''" width="100"
          header-align="center" align="right" sortable='custom' show-overflow-tooltip></el-table-column>
        <el-table-column label="市级二级" prop="cityLevel2" :formatter="(r,c,v) => v!==null?(v+'%'):''" width="100"
          header-align="center" align="right" sortable='custom' show-overflow-tooltip></el-table-column>
        <el-table-column label="市级三级" prop="cityLevel3" :formatter="(r,c,v) => v!==null?(v+'%'):''" width="100"
          header-align="center" align="right" sortable='custom' show-overflow-tooltip></el-table-column>
        <el-table-column label="县级一级" prop="countyLevle1" :formatter="(r,c,v) => v!==null?(v+'%'):''" width="100"
          header-align="center" align="right" sortable='custom' show-overflow-tooltip></el-table-column>
        <el-table-column label="县级二级" prop="countyLevle2" :formatter="(r,c,v) => v!==null?(v+'%'):''" width="100"
          header-align="center" align="right" sortable='custom' show-overflow-tooltip></el-table-column>
        <el-table-column label="县级三级" prop="countyLevle3" :formatter="(r,c,v) => v!==null?(v+'%'):''" width="100"
          header-align="center" align="right" sortable='custom' show-overflow-tooltip></el-table-column>
        <el-table-column label="非公立一级" prop="nonPublicLevel1" :formatter="(r,c,v) => v!==null?(v+'%'):''" width="120"
          header-align="center" align="right" sortable='custom' show-overflow-tooltip></el-table-column>
        <el-table-column label="非公立二级" prop="nonPublicLevel2" :formatter="(r,c,v) => v!==null?(v+'%'):''" width="120"
          header-align="center" align="right" sortable='custom' show-overflow-tooltip></el-table-column>
        <el-table-column label="非公立三级" prop="nonPublicLevel3" :formatter="(r,c,v) => v!==null?(v+'%'):''" width="120"
          header-align="center" align="right" sortable='custom' show-overflow-tooltip></el-table-column>
        <el-table-column label="限价条件" prop="limitCondition"
          :formatter="(r,c,v) => kindo.dictionary.getLabel(dict.LIMIT_PRICE_CONDITION,v)" width="100"
          header-align="center" show-overflow-tooltip></el-table-column>
        <el-table-column label="审核状态" prop="status" width="100" align="center" columnKey='status'
          :filters="columnFilters(dict.AUDIT_STATUS)" :filter-method="filterHandler" :filter-multiple="false"
          filter-placement="bottom-end">
          <template slot-scope="scope">
            <el-tag :type="scope.row.status === '1'?'success':'info'" close-transition>
              {{kindo.dictionary.getLabel(dict.AUDIT_STATUS,scope.row.status)}}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" align="center" fixed="right">
          <template slot-scope="scope">
            <el-tooltip class="item" effect="dark" :open-delay="300" content="编辑" placement="top-start">
              <el-button type="text" icon="el-icon-edit" @click="update(parent,scope.row)">
              </el-button>
            </el-tooltip>
            <el-tooltip class="item" effect="dark" :open-delay="300" content="删除" placement="top-start">
              <el-button type="text" icon="el-icon-delete" @click="remove('parent',scope.row.id)"></el-button>
            </el-tooltip>
          </template>
        </el-table-column>
      </kindo-table>
      <div slot="control">
        <el-button icon="el-icon-plus" type="text" @click="insert(parent)">新增</el-button>
        <el-button icon="el-icon-delete" type="text" @click="remove('parent')">删除</el-button>
        <el-button icon="el-icon-view" type="text" @click="audit('parent')">审核</el-button>
      </div>
    </kindo-box>

    <!-- 子表 start -->
    <kindo-box title="查询条件" icon="xx">
      <el-form :model="child.search" onsubmit="return false;" label-position="right" inline
        @keyup.enter.prevent.native="getChild">
        <el-form-item label="诊疗项目">
          <el-input v-model.trim="child.search.itemName" placeholder="请输入关键字" clearable></el-input>
        </el-form-item>
      </el-form>
      <div slot="control">
        <el-button icon="el-icon-search" type="primary" :disabled="child.search.itemLimitPriceId === ''?true:false"
          @click="getChild">查询</el-button>
      </div>
    </kindo-box>
    <kindo-box title="限价规则-2 子表">
      <kindo-table ref="child" :url="child.url" :queryParam="child.search" :extendOption="extend"
        @selection-change="(selection) => tableChange('child', selection)"
        @filter-change="(filters)=>filterChange(filters,'child', 'search')" :pageSize="5">
        <el-table-column type="selection" fixed="left" width="30"></el-table-column>
        <el-table-column label="诊疗项目编码" fixed="left" prop="itemCode" width="140" header-align="center" sortable='custom'
          show-overflow-tooltip></el-table-column>
        <el-table-column label="诊疗项目名称" fixed="left" prop="itemName" min-width="150" header-align="center"
          sortable='custom' show-overflow-tooltip></el-table-column>
        <el-table-column label="描述" prop="remark" min-width="200" header-align="center" show-overflow-tooltip>
        </el-table-column>
        <el-table-column label="审核状态" prop="status" width="100" align="center" columnKey='status'
          :filters="columnFilters(dict.AUDIT_STATUS)" :filter-method="filterHandler" :filter-multiple="false"
          filter-placement="bottom-end">
          <template slot-scope="scope">
            <el-tag :type="scope.row.status === '1'?'success':'info'" close-transition>
              {{kindo.dictionary.getLabel(dict.AUDIT_STATUS,scope.row.status)}}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" align="center" fixed="right">
          <template slot-scope="scope">
            <el-tooltip class="item" effect="dark" :open-delay="300" content="编辑" placement="top-start">
              <el-button type="text" icon="el-icon-edit" @click="update(child, scope.row)"></el-button>
            </el-tooltip>
            <el-tooltip class="item" effect="dark" :open-delay="300" content="删除" placement="top-start">
              <el-button type="text" icon="el-icon-delete" @click="remove('child', scope.row.id)"></el-button>
            </el-tooltip>
          </template>
        </el-table-column>
      </kindo-table>
      <div slot="control">
        <el-button icon="el-icon-plus" type="text" :disabled="child.search.itemLimitPriceId === ''?true:false"
          @click="insert(child)">新增</el-button>
        <el-button icon="el-icon-delete" type="text" :disabled="child.search.itemLimitPriceId === ''?true:false"
          @click="remove('child')">删除</el-button>
        <el-button icon="el-icon-view" type="text" :disabled="child.search.itemLimitPriceId === ''?true:false"
          @click="audit('child')">审核</el-button>
      </div>
    </kindo-box>
    <!-- 子表 end -->

    <!-- 主表新增 start -->
    <el-dialog v-drag top="0" :visible.sync="parent.dialog.visible" :title="`${parent.form.id?'编辑':'新增'}限价规则`"
      width="380px" :close-on-click-modal="false">
      <el-form :model="parent.form" :rules="parent.rules" class="parent_form" onsubmit="return false;"
        label-width="100px" :ref="parent.ref">
        <el-form-item label="诊疗项目" prop="itemCode">
          <el-select v-model.trim="parent.form.itemCode" :disabled="parent.form.id !== ''" size="mini"
            @blur="(ev)=>{blurSel(ev,parent.form,'itemCode','commonDrugList')}" placeholder="请输入选择" clearable filterable
            :loading="loading" remote :remote-method="(query) => getDictRemote('commonDrugList', 'itemName', query)">
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
        <el-form-item label="单位" prop="itemUnit">
          <el-select v-model.trim="parent.form.itemUnit" clearable filterable>
            <el-option v-for="(item,index) in dict.LIMIT_PRICE_UNIT" :key="index" :label="item.label"
              :value="item.value"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="市级一级" prop="cityLevel1">
          <el-input-number v-model="parent.form.cityLevel1" :precision="2" :min="0" :max="100" :controls="false">
          </el-input-number>%
        </el-form-item>
        <el-form-item label="市级二级" prop="cityLevel2">
          <el-input-number v-model="parent.form.cityLevel2" :precision="2" :min="0" :max="100" :controls="false">
          </el-input-number>%
        </el-form-item>
        <el-form-item label="市级三级" prop="cityLevel3">
          <el-input-number v-model="parent.form.cityLevel3" :precision="2" :min="0" :max="100" :controls="false">
          </el-input-number>%
        </el-form-item>
        <el-form-item label="县级一级" prop="countyLevle1">
          <el-input-number v-model="parent.form.countyLevle1" :precision="2" :min="0" :max="100" :controls="false">
          </el-input-number>%
        </el-form-item>
        <el-form-item label="县级二级" prop="countyLevle2">
          <el-input-number v-model="parent.form.countyLevle2" :precision="2" :min="0" :max="100" :controls="false">
          </el-input-number>%
        </el-form-item>
        <el-form-item label="县级三级" prop="countyLevle3">
          <el-input-number v-model="parent.form.countyLevle3" :precision="2" :min="0" :max="100" :controls="false">
          </el-input-number>%
        </el-form-item>
        <el-form-item label="非公立一级" prop="nonPublicLevel1">
          <el-input-number v-model="parent.form.nonPublicLevel1" :precision="2" :min="0" :max="100" :controls="false">
          </el-input-number>%
        </el-form-item>
        <el-form-item label="非公立二级" prop="nonPublicLevel2">
          <el-input-number v-model="parent.form.nonPublicLevel2" :precision="2" :min="0" :max="100" :controls="false">
          </el-input-number>%
        </el-form-item>
        <el-form-item label="非公立三级" prop="nonPublicLevel3">
          <el-input-number v-model="parent.form.nonPublicLevel3" :precision="2" :min="0" :max="100" :controls="false">
          </el-input-number>%
        </el-form-item>
        <el-form-item label="限价条件" prop="limitCondition">
          <el-select v-model.trim="parent.form.limitCondition" clearable filterable>
            <el-option v-for="(item,index) in dict.LIMIT_PRICE_CONDITION" :key="index" :label="item.label"
              :value="item.value"></el-option>
          </el-select>
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button icon="el-icon-check" type="primary" @click="save('parent')">完 成</el-button>
        <el-button icon="el-icon-close" type="primary" @click="parent.dialog.visible = false">取 消</el-button>
      </div>
    </el-dialog>
    <!-- 主表新增 end -->

    <!-- 子表新增 start -->
    <el-dialog v-drag top="0" :visible.sync="child.dialog.visible" :title="(child.form.id?'编辑':'新增') + '诊疗项目'">
      <el-form :model="child.form" onsubmit="return false;" class="box" :ref="child.ref" label-width="90px"
        :rules="child.rules" label-position="right">
        <el-form-item label="诊疗项目" style="display:block;" prop="itemCode">
          <el-select v-model.trim="child.form.itemCode" size="mini" :disabled="!kindo.validate.isEmpty(child.form.id)"
            @blur="(ev)=>{blurSel(ev,child.form,'itemCode','commonDrugList')}" placeholder="输入名称或编码" clearable
            filterable :loading="loading" remote
            :remote-method="(query) => getDictRemote('commonDrugList', 'itemCode', query)">
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
        <el-form-item label="描述" prop="remark">
          <el-input type="textarea" :rows="2" placeholder="可输入200字" v-model.trim="child.form.remark"></el-input>
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
import config from './config'
import tableOpra from '@src/utils/helper/tableOpra.js'

export default {
  name: 'limitRule',
  mixins: [tableOpra],
  data() {
    return {
      // 主表默认选第一行数据
      extend: { selectedFirst: true },
      loading: false,

      // 数据字典
      dict: {
        // 审核状态
        AUDIT_STATUS: [],
        // 单位
        LIMIT_PRICE_UNIT: [],
        // 限价条件
        LIMIT_PRICE_CONDITION: []
      },
      list: {
        commonDrugList: []
      },

      parent: {
        url: config.api.table,
        // 查询实体
        search: {
          itemName: ''
        },
        // 已选中表格数据
        selection: [],
        // 编辑、新增弹窗显示
        dialog: {
          visible: false
        },
        ref: 'parentForm',
        // 新增、编辑表单
        form: {
          id: '',
          itemCode: '',
          itemUnit: '',
          cityLevel1: undefined,
          cityLevel2: undefined,
          cityLevel3: undefined,
          countyLevle1: undefined,
          countyLevle2: undefined,
          countyLevle3: undefined,
          nonPublicLevel1: undefined,
          nonPublicLevel2: undefined,
          nonPublicLevel3: undefined,
          limitCondition: ''
        },
        // 表单校验规则
        rules: {
          itemCode: [{ required: true, message: '请输入名称', trigger: 'blur' }],
          limitCondition: [{ required: true, message: '请选择', trigger: 'blur' }]
        }
      },
      child: {
        url: config.api.child,
        search: {
          itemLimitPriceId: '',
          itemName: '',
          status: ''
        },
        selection: [],
        dialog: {
          visible: false
        },
        ref: 'childForm',
        form: {
          itemLimitPriceId: '',
          id: '',
          itemCode: '',
          remark: ''
        },
        rules: {
          itemCode: [{ required: true, message: '请输入名称', trigger: 'blur' }, { min: 0, max: 30, message: '长度不能超过30' }],
          remark: [{ min: 0, max: 200, message: '长度不能超过200', trigger: 'blur' }]
        }
      }
    }
  },

  created() {
    this.getDictionary()
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
          this.$refs.child.clearTable()
          this.child.form.itemLimitPriceId = ''
          this.child.search.itemLimitPriceId = ''
        }
      })
    },

    // 获取字表信息
    getChild() {
      if (this.child.form.itemLimitPriceId) {
        this.getTable('child')
      }
    },

    tableClick(row) {
      if (row) {
        this.child.form.itemLimitPriceId = row.id
        this.child.search.itemLimitPriceId = row.id
        this.getChild()
      } else {
        this.$refs.child.clearTable()
      }
    },

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

    insert(self) {
      kindo.util.promise(() => {
        self.dialog.visible = true
      }).then(() => {
        this.$refs[self.ref].resetFields()
        self.form.id = ''
      }).then(() => {
        this.list.commonDrugList = []
      })
    },

    update(self, row) {
      kindo.util.promise(() => {
        self.dialog.visible = true
      }).then(() => {
        this.$refs[self.ref].resetFields()
        this.list.commonDrugList = []
      }).then(() => {
        for (var key in row) {
          if (self.form.hasOwnProperty(key) === true) {
            self.form[key] = row[key]
          }
        }
        this.list.commonDrugList.push({ label: row.itemName, value: row.itemCode })
      })
    }
  }
}
</script>
<style lang="scss" scoped>
.parent_form /deep/.el-input-number {
  width: 100px !important;
}
</style>